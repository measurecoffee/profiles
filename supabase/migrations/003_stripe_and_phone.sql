-- ============================================================
-- measure.coffee profiles — Phase 2b: Stripe + Phone
-- ============================================================

-- Stripe customer ID for subscription management
ALTER TABLE public.profiles
  ADD COLUMN stripe_customer_id text UNIQUE;

-- Phone verification tracking
ALTER TABLE public.profiles
  ADD COLUMN phone_verified boolean DEFAULT false;

-- Unique constraint on phone for trial gating
-- (already have UNIQUE on phone column from 002, just add partial index for non-null)
CREATE INDEX idx_profiles_phone_verified ON public.profiles(phone)
  WHERE phone IS NOT NULL AND phone_verified = true;

-- ============================================================
-- TRIAL MANAGEMENT
-- Track trial start and auto-expire after 7 days
-- ============================================================

-- Function to check and expire trials
CREATE OR REPLACE FUNCTION public.check_trial_expiry(p_user_id uuid)
RETURNS TABLE (
  tier text,
  is_expired boolean,
  trial_ends_at timestamptz
) AS $$
DECLARE
  v_tier text;
  v_trial_started timestamptz;
  v_expired boolean;
  v_ends_at timestamptz;
BEGIN
  SELECT subscription_tier, trial_started_at INTO v_tier, v_trial_started
  FROM public.profiles WHERE user_id = p_user_id;

  v_tier := COALESCE(v_tier, 'trial');
  v_ends_at := v_trial_started + interval '7 days';
  v_expired := v_tier = 'trial' AND now() > v_ends_at;

  -- Auto-upgrade expired trials to require payment
  -- (they keep their account but lose chat access)
  IF v_expired THEN
    UPDATE public.profiles
    SET subscription_tier = 'expired_trial'
    WHERE user_id = p_user_id AND subscription_tier = 'trial';
  END IF;

  RETURN QUERY SELECT v_tier, v_expired, v_ends_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle stripe_customer_id from checkout
-- When a checkout completes, the webhook will also set stripe_customer_id
-- via the service role. This is idempotent.