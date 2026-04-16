-- ============================================================
-- measure.coffee profiles — Phase 1: Data layer
-- ============================================================
-- Three-layer agent-native profile architecture:
--   L1 identity:       always loaded (~150 tokens)
--   L2 active_context: per-session (~300 tokens), auto-generated
--   L3 deep_context:   on-demand, dot-path queries, unlimited
-- ============================================================

-- -----------------------------------------------------------
-- PROFILES TABLE
-- -----------------------------------------------------------
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- L1: Identity (always loaded, ~150 tokens)
  identity    jsonb NOT NULL DEFAULT '{
    "name": null,
    "handle": null,
    "timezone": null,
    "roles": [],
    "communication_style": null,
    "active_projects": [],
    "profile_version": 1
  }'::jsonb,

  -- L2: Active context (per-session, ~300 tokens, auto-generated)
  active_context jsonb NOT NULL DEFAULT '{
    "current_focus": null,
    "recent_activity": [],
    "active_issues": [],
    "session_hint": null
  }'::jsonb,

  -- L3: Deep context (on-demand, dot-path queries)
  deep_context jsonb NOT NULL DEFAULT '{
    "equipment": {},
    "preferences": {},
    "projects": {},
    "businesses": {},
    "maintenance": {},
    "relationships": {},
    "custom": {}
  }'::jsonb,

  -- Privacy: allowlist for agent access
  sharing_allowlist jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Feature flags
  advanced_config boolean NOT NULL DEFAULT false,

  -- Metadata
  profile_version integer NOT NULL DEFAULT 1,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text NOT NULL DEFAULT 'user',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, identity)
  VALUES (
    NEW.id,
    jsonb_build_object(
      'name', COALESCE(NEW.raw_user_meta_data->>'name', null),
      'handle', COALESCE(NEW.raw_user_meta_data->>'handle', null),
      'timezone', null,
      'roles', '[]'::jsonb,
      'communication_style', null,
      'active_projects', '[]'::jsonb,
      'profile_version', 1
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------
-- PENDING UPDATES TABLE
-- -----------------------------------------------------------
-- Agent-proposed L3 diffs, pending user approval
CREATE TABLE public.pending_updates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dot-path into deep_context being modified
  context_path text NOT NULL,
  
  -- The proposed change
  operation   text NOT NULL CHECK (operation IN ('set', 'merge', 'remove')),
  proposed_value jsonb,
  
  -- Provenance
  proposed_by text NOT NULL,  -- "agent:<id>" or "system"
  proposed_at timestamptz NOT NULL DEFAULT now(),
  
  -- User review
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  review_note text
);

CREATE INDEX idx_pending_updates_profile ON public.pending_updates(profile_id);
CREATE INDEX idx_pending_updates_status ON public.pending_updates(status) WHERE status = 'pending';

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_updates ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can read profiles (agents use service role with allowlist check in SQL function)
CREATE POLICY "Service role can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'service_role');

-- Pending updates: users see their own, agents insert via service role
CREATE POLICY "Users can view own pending updates"
  ON public.pending_updates FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own pending updates"
  ON public.pending_updates FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can insert pending updates"
  ON public.pending_updates FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read pending updates"
  ON public.pending_updates FOR SELECT
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------
-- SQL FUNCTION: query_profile_context
-- Returns a JSON fragment from deep_context at the given dot-path.
-- Enforces sharing_allowlist: returns null if requester not allowed.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.query_profile_context(
  p_user_id  uuid,
  p_path     text,          -- dot-path e.g. 'equipment.espresso_machines'
  p_requester text DEFAULT ''  -- agent ID or 'user'
)
RETURNS jsonb AS $$
DECLARE
  v_profile RECORD;
  v_allowed_paths text[];
  v_result jsonb;
BEGIN
  -- Fetch the profile
  SELECT deep_context, sharing_allowlist INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN null;
  END IF;

  -- If requester is the user themselves, allow everything
  IF p_requester = 'user' OR p_requester = '' THEN
    -- Direct user access, no allowlist check
    RETURN jsonb_path_query_first(
      v_profile.deep_context,
      '$.' || replace(p_path, '.', '.')
    );
  END IF;

  -- Check allowlist for this requester
  v_allowed_paths := 
    COALESCE(
      (SELECT array_agg(value::text)
       FROM jsonb_array_elements_text(
         v_profile.sharing_allowlist->p_requester
       ) AS value),
      ARRAY[]::text[]
    );

  -- Default deny: if no allowlist entry or empty, deny
  IF array_length(v_allowed_paths, 1) IS NULL THEN
    RETURN null;
  END IF;

  -- Check if requested path or any parent path is in allowlist
  IF NOT EXISTS (
    SELECT 1 FROM unnest(v_allowed_paths) AS allowed(path)
    WHERE p_path = allowed.path
       OR p_path LIKE allowed.path || '.%'
  ) THEN
    RETURN null;
  END IF;

  -- Path is allowed, return the fragment
  RETURN jsonb_path_query_first(
    v_profile.deep_context,
    '$.' || replace(p_path, '.', '.')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- SQL FUNCTION: apply_approved_update
-- Merges an approved pending_update into deep_context
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_approved_update(
  p_update_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_update RECORD;
  v_current jsonb;
  v_new jsonb;
BEGIN
  -- Get the pending update
  SELECT * INTO v_update FROM public.pending_updates WHERE id = p_update_id;
  
  IF NOT FOUND OR v_update.status != 'pending' THEN
    RETURN false;
  END IF;

  -- Get current deep_context
  SELECT deep_context INTO v_current
  FROM public.profiles WHERE id = v_update.profile_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Apply the operation
  CASE v_update.operation
    WHEN 'set' THEN
      -- Set value at dot-path (creates intermediate objects)
      v_new := jsonb_set(
        v_current,
        string_to_array(v_update.context_path, '.'),
        v_update.proposed_value,
        true
      );
    WHEN 'merge' THEN
      -- Deep merge at dot-path
      DECLARE
        v_existing jsonb;
        v_path text[] := string_to_array(v_update.context_path, '.');
      BEGIN
        v_existing := COALESCE(
          jsonb_path_query_first(v_current, '$.' || replace(v_update.context_path, '.', '.')),
          '{}'::jsonb
        );
        v_new := jsonb_set(
          v_current,
          v_path,
          v_existing || v_update.proposed_value,
          true
        );
      END;
    WHEN 'remove' THEN
      -- Remove key at dot-path
      v_new := v_current #- string_to_array(v_update.context_path, '.');
    ELSE
      RETURN false;
  END CASE;

  -- Update the profile
  UPDATE public.profiles
  SET deep_context = v_new,
      updated_at = now(),
      updated_by = 'agent:' || v_update.proposed_by,
      profile_version = profile_version + 1
  WHERE id = v_update.profile_id;

  -- Mark update as approved
  UPDATE public.pending_updates
  SET status = 'approved', reviewed_at = now()
  WHERE id = p_update_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;