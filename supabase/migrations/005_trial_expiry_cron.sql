-- ============================================================
-- measure.coffee profiles — Phase 4: Trial Expiry Cron Job
-- ============================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron job to expire trials every hour
SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',
  $$
  UPDATE public.profiles
  SET subscription_tier = 'expired_trial'
  WHERE subscription_tier = 'trial'
    AND trial_started_at IS NOT NULL
    AND now() > trial_started_at + interval '7 days';
  $$
);