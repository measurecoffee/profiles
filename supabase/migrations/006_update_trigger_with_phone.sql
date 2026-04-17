-- Update handle_new_user trigger to also set phone and subscription_tier
-- from the user metadata provided during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, identity, phone, subscription_tier, trial_started_at)
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
    COALESCE(NEW.raw_user_meta_data->>'phone', null),
    'trial',
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;