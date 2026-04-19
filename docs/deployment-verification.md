# Deployment Verification

This repository now treats deployment confirmation as a first-class release step instead of an honor system.

## What Gets Verified

1. Pull requests must include a live-preview test plan.
2. Pull requests must typecheck and pass `npm run build`.
3. Vercel preview and production URLs can be smoke-tested with `scripts/smoke-check.mjs`.
4. `/api/health` exposes:
   - shallow health for public uptime and public-auth configuration
   - deep health for Supabase reachability plus integration-env presence
5. Authenticated smoke checks validate:
   - seeded QA account password login
   - authenticated `/chat` route access
   - authenticated chat thread list and detail load
   - support/report intake path (current implementation: authenticated chat-thread creation)
   - billing checkout entrypoint behavior
   - one representative profile/settings mutation with automatic restore

## Required Setup

Set the same `DEPLOYMENT_SMOKE_TEST_KEY` value in:

- Vercel project environment variables
- GitHub Actions repository secrets

The deep health endpoint requires that key through the `x-healthcheck-key` header. Without it, preview and production smoke checks can only run in shallow mode.

If Vercel Deployment Protection is enabled for preview deployments, also copy the Vercel-generated `VERCEL_AUTOMATION_BYPASS_SECRET` into GitHub Actions repository secrets. The smoke script sends it through the documented `x-vercel-protection-bypass` header so CI can reach protected preview URLs.

Set these authenticated smoke secrets in GitHub Actions repository secrets:

- `RELEASE_SMOKE_USER_EMAIL`
- `RELEASE_SMOKE_USER_PASSWORD`
- `RELEASE_SMOKE_SUPABASE_URL`
- `RELEASE_SMOKE_SUPABASE_ANON_KEY`

## QA Account And Test Data Strategy

- Use a dedicated QA-only account for smoke automation. Never use an employee personal account.
- Restrict this account to non-sensitive workspace data and default trial/lowest privilege access.
- Keep credentials only in GitHub Actions secrets and rotate on schedule or immediately after any exposure.
- Smoke-created support/report artifacts must be clearly prefixed (for example, `Support report smoke ...`) so they can be filtered or purged.
- The profile mutation probe intentionally restores the original `updated_by` value in the same run to avoid persistent drift.

## Suggested Release Flow

1. Open a PR with the preview URL in the required PR template.
2. Verify `PR CI` is green.
3. Run (or let deployment status trigger) `Deployment Smoke` for preview and confirm both anonymous and authenticated checks pass.
4. Execute the manual preview checklist only for UX/details not covered by smoke.
5. Merge to `main`.
6. Confirm the production deployment smoke passes against the production URL.

## Current Limits

- Smoke coverage is API and route-level; it does not validate full visual UX regressions.
- Support/report coverage currently targets the shipped intake path (authenticated chat-thread creation). If support moves to a dedicated endpoint, update `scripts/smoke-check.mjs` accordingly.
