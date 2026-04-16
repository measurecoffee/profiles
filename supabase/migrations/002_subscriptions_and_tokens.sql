-- ============================================================
-- measure.coffee profiles — Phase 2: Subscriptions + Token tracking
-- ============================================================

-- Add subscription tier to profiles
ALTER TABLE public.profiles
  ADD COLUMN subscription_tier text NOT NULL DEFAULT 'trial'
    CHECK (subscription_tier IN ('trial', 'expired_trial', 'tier1', 'tier2'));

-- Trial expiry
ALTER TABLE public.profiles
  ADD COLUMN trial_started_at timestamptz;

-- Phone number for trial gating
ALTER TABLE public.profiles
  ADD COLUMN phone text UNIQUE;

-- -----------------------------------------------------------
-- TOKEN USAGE TABLE
-- Track per-user, per-week token consumption
-- -----------------------------------------------------------
CREATE TABLE public.token_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  date NOT NULL,  -- Monday of the week

  -- Cumulative counters for this week
  input_tokens  bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens  bigint NOT NULL DEFAULT 0,
  request_count bigint NOT NULL DEFAULT 0,

  -- Budget limit active for this week
  weekly_budget  bigint NOT NULL DEFAULT 15000,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_token_usage_user_week ON public.token_usage(user_id, week_start DESC);

-- -----------------------------------------------------------
-- RLS for token_usage
-- -----------------------------------------------------------
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token usage"
  ON public.token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage token usage"
  ON public.token_usage FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- WEEKLY BUDGET BY TIER
-- Returns the weekly token budget for a given tier
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_budget(tier text)
RETURNS bigint AS $$
BEGIN
  RETURN CASE tier
    WHEN 'trial' THEN 15000
    WHEN 'tier1' THEN 150000
    WHEN 'tier2' THEN 500000
    ELSE 15000
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------
-- CHECK TOKEN BUDGET
-- Returns remaining budget for the user this week
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_token_budget(
  p_user_id uuid
)
RETURNS TABLE (
  tier text,
  weekly_budget bigint,
  used_tokens bigint,
  remaining_tokens bigint,
  week_start_date date
) AS $$
DECLARE
  v_tier text;
  v_budget bigint;
  v_used bigint;
  v_week_start date;
BEGIN
  -- Get user's tier
  SELECT subscription_tier INTO v_tier
  FROM public.profiles WHERE user_id = p_user_id;

  v_tier := COALESCE(v_tier, 'trial');
  v_budget := public.get_weekly_budget(v_tier);

  -- Get current week start (Monday)
  v_week_start := date_trunc('week', CURRENT_DATE)::date;

  -- Get usage this week
  SELECT COALESCE(SUM(total_tokens), 0) INTO v_used
  FROM public.token_usage
  WHERE user_id = p_user_id AND week_start = v_week_start;

  v_used := COALESCE(v_used, 0);

  RETURN QUERY SELECT v_tier, v_budget, v_used, GREATEST(v_budget - v_used, 0), v_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- RECORD TOKEN USAGE
-- Upserts token_usage for the current week
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_token_usage(
  p_user_id    uuid,
  p_input      bigint,
  p_output     bigint
)
RETURNS bigint AS $$
DECLARE
  v_tier text;
  v_budget bigint;
  v_week_start date;
  v_remaining bigint;
BEGIN
  v_week_start := date_trunc('week', CURRENT_DATE)::date;

  -- Get tier and budget
  SELECT subscription_tier INTO v_tier
  FROM public.profiles WHERE user_id = p_user_id;
  v_tier := COALESCE(v_tier, 'trial');
  v_budget := public.get_weekly_budget(v_tier);

  -- Upsert usage
  INSERT INTO public.token_usage (user_id, week_start, input_tokens, output_tokens, total_tokens, request_count, weekly_budget)
  VALUES (p_user_id, v_week_start, p_input, p_output, p_input + p_output, 1, v_budget)
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    input_tokens = token_usage.input_tokens + p_input,
    output_tokens = token_usage.output_tokens + p_output,
    total_tokens = token_usage.total_tokens + p_input + p_output,
    request_count = token_usage.request_count + 1,
    updated_at = now();

  -- Return remaining tokens
  SELECT GREATEST(v_budget - total_tokens, 0) INTO v_remaining
  FROM public.token_usage
  WHERE user_id = p_user_id AND week_start = v_week_start;

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;