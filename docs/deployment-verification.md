# Deployment Verification

This repository now treats deployment confirmation as a first-class release step instead of an honor system.

## What Gets Verified

1. Pull requests must include a live-preview test plan.
2. Pull requests must typecheck and pass `npm run build`.
3. Vercel preview and production URLs can be smoke-tested with `scripts/smoke-check.mjs`.
4. `/api/health` exposes:
   - shallow health for public uptime and public-auth configuration
   - deep health for Supabase reachability plus integration-env presence

## Required Setup

Set the same `DEPLOYMENT_SMOKE_TEST_KEY` value in:

- Vercel project environment variables
- GitHub Actions repository secrets

The deep health endpoint requires that key through the `x-healthcheck-key` header. Without it, preview and production smoke checks can only run in shallow mode.

## Suggested Release Flow

1. Open a PR with the preview URL in the required PR template.
2. Verify `PR CI` is green.
3. Run the deployment smoke workflow against the preview URL if Vercel has not posted a GitHub deployment status automatically yet.
4. Execute the manual preview checklist for the changed feature area.
5. Merge to `main`.
6. Confirm the production deployment smoke passes against the production URL.

## Current Limits

- The smoke script is intentionally anonymous. It validates public routes, auth redirects, and health endpoints.
- Authenticated flows still need a dedicated test account plus browser automation if we want full end-to-end coverage for chat, billing, and support workflows.
