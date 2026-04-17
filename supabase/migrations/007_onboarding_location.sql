-- Add 'location' key to deep_context defaults for onboarding
-- Existing rows get location: {} added if missing

-- Update the default value for new profiles
-- (Can't ALTER COLUMN default for jsonb easily, so we update existing rows)
UPDATE public.profiles
SET deep_context = jsonb_set(
  COALESCE(deep_context, '{}'::jsonb),
  '{location}',
  COALESCE(deep_context->'location', '{}'::jsonb),
  true
)
WHERE deep_context->'location' IS NULL OR NOT (deep_context ? 'location');

-- Also ensure token_usage allows insert via service role for the RPC
-- (Already covered by existing "Service role can manage token usage" policy)