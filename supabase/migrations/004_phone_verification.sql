-- ============================================================
-- measure.coffee profiles — Phase 2: Phone verification
-- ============================================================
-- Adds phone column and phone_verified flag to profiles.
-- Trial gating: trial tier is only valid when phone_verified = true.
-- One phone number per account to prevent infinite trial abuse.
-- ============================================================

-- Add phone and phone_verified to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Index for phone lookups (duplicate prevention)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;

-- Update handle_new_user to store phone from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, identity, phone)
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
    ),
    COALESCE(NEW.raw_user_meta_data->>'phone', null)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;