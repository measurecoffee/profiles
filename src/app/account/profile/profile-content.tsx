'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TIERS } from '@/lib/agent/tiers'
import { summarizeActiveContext } from '@/lib/profile/active-context'
import { Suspense, useState } from 'react'
import { COFFEE_AGENT_NAME } from '@/lib/agent/brand'

interface Identity {
  name: string | null
  handle: string | null
  timezone: string | null
  roles: string[]
  communication_style: string | null
  active_projects: string[]
  profile_version: number
}

interface Profile {
  id: string
  user_id: string
  identity: Identity
  active_context: Record<string, unknown>
  deep_context: Record<string, Record<string, unknown>>
  sharing_allowlist: Record<string, string[]>
  advanced_config: boolean
  subscription_tier: string
  trial_started_at: string | null
  phone: string | null
  phone_verified: boolean
  profile_version: number
  updated_at: string
  updated_by: string
}

interface ProfileContentProps {
  profile: Profile | null
  email: string
}

/* ── Tier badge styles ──────────────────────────────────────────── */
const TIER_BADGE_STYLES: Record<string, string> = {
  trial: 'bg-latte text-mocha border border-mocha/20',
  expired_trial: 'bg-red-50 text-destructive border border-destructive/20',
  tier1: 'bg-cream text-copper border border-copper/30',
  tier2:
    'bg-espresso text-[color:var(--color-gold)] border border-[color:rgba(212,154,79,0.3)] animate-subtle-glow',
}

/* ── Completeness heuristic ──────────────────────────────────────── */
function calcCompleteness(p: Profile | null): number {
  if (!p) return 0
  const fields: (string | unknown[] | null | undefined)[] = [
    p.identity?.name,
    p.identity?.handle,
    p.identity?.timezone,
    p.identity?.roles?.length ? p.identity.roles : null,
    p.identity?.communication_style,
    p.identity?.active_projects?.length ? p.identity.active_projects : null,
    p.phone,
    String((p.active_context as Record<string, unknown>)?.current_focus ?? ''),
    p.deep_context && Object.keys(p.deep_context).length > 0 ? 'filled' : null,
  ]
  const filled = fields.filter((f) => f != null && f !== '').length
  return Math.round((filled / fields.length) * 100)
}

/* ── SVG progress ring ───────────────────────────────────────────── */
function ProgressRing({ percent }: { percent: number }) {
  const radius = 36
  const stroke = 5
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88">
        {/* track */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="var(--color-latte)"
          strokeWidth={stroke}
        />
        {/* progress */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="var(--color-copper)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-text-primary">
        {percent}%
      </span>
    </div>
  )
}

/* ── Inner content (needs Suspense for useSearchParams) ──────────── */
function ProfileInner({ profile, email }: ProfileContentProps) {
  const searchParams = useSearchParams()
  const showDev = searchParams.get('dev') !== null

  const tier = profile?.subscription_tier || 'trial'
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.trial
  const isExpired = tier === 'expired_trial'

  const trialStarted = profile?.trial_started_at ? new Date(profile.trial_started_at) : null
  const trialEndsAt = trialStarted ? new Date(trialStarted.getTime() + 7 * 24 * 60 * 60 * 1000) : null
  const [renderedAt] = useState(() => Date.now())
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - renderedAt) / (1000 * 60 * 60 * 24)))
    : null

  const completeness = calcCompleteness(profile)
  const activeContextSummary = summarizeActiveContext(profile?.active_context)
  const deepContextKeys = profile?.deep_context ? Object.keys(profile.deep_context) : []
  const activeIssuesCount = activeContextSummary.activeIssues.length

  const handleCheckout = (planId: string) => {
    fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
      .then(r => r.json())
      .then(data => { if (data.url) window.location.href = data.url })
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] text-espresso">
              {profile?.identity?.name || email}
            </h1>
            <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
              @{profile?.identity?.handle || 'no-handle'}
            </p>
          </div>
        </div>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="px-4 py-2 text-sm border border-border rounded-full text-text-muted hover:text-text-primary transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* ── Profile Completeness ─────────────────────────────── */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ProgressRing percent={completeness} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-[family-name:var(--font-display)] text-text-primary">
              Profile Completeness
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {completeness >= 100
                ? `Your profile is complete. ${COFFEE_AGENT_NAME} has everything needed to personalize advice.`
                : `Fill in more details so ${COFFEE_AGENT_NAME} can personalize every conversation.`}
            </p>
            {completeness < 100 && (
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted mt-2">
                {completeness}% complete
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Subscription & Tier ──────────────────────────────── */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-[family-name:var(--font-display)] text-text-primary">
            Your Plan
          </h2>
          <span className={`font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full ${TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.trial}`}>
            {tierConfig.name}
          </span>
        </div>

        {tier === 'trial' && trialEndsAt && (
          <p className="text-sm text-text-secondary mb-3">
            Trial ends {trialEndsAt.toLocaleDateString()} ({daysLeft} days left)
          </p>
        )}

        {isExpired && (
          <div className="bg-red-50 text-destructive text-sm p-3 rounded-lg mb-3">
            Your free trial has ended. Upgrade to keep chatting with {COFFEE_AGENT_NAME}.
          </div>
        )}

        {/* Usage hint */}
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {tierConfig.weeklyTokenBudget.toLocaleString()} tokens/week
          </span>
          <span className="text-text-muted">·</span>
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {tierConfig.maxContextTokens.toLocaleString()} max context
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 mb-4">
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Best for</p>
            <p className="mt-1 text-sm text-text-primary">{tierConfig.bestFor}</p>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Upgrade trigger</p>
            <p className="mt-1 text-sm text-text-primary">{tierConfig.upgradeTrigger}</p>
          </div>
        </div>

        {/* Plan features */}
        <div className="text-sm text-text-secondary mb-4">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
            Included features
          </p>
          <ul className="space-y-1">
            {tierConfig.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-copper mt-0.5">☕</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade CTAs */}
        {tier !== 'tier2' && (
          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            {(tier === 'trial' || tier === 'expired_trial') && (
              <button
                onClick={() => handleCheckout('tier1')}
                className="flex-1 py-3 px-6 bg-cream text-copper rounded-full font-medium border border-copper/30 hover:bg-latte transition-colors text-center"
              >
                Upgrade to Basic ($5/mo)
              </button>
            )}
            <button
              onClick={() => handleCheckout('tier2')}
              className="flex-1 py-3 px-6 bg-espresso text-[color:var(--color-gold)] rounded-full font-medium border border-[color:rgba(212,154,79,0.3)] hover:bg-primary-hover transition-colors text-center"
            >
              Upgrade to Pro ($19/mo)
            </button>
          </div>
        )}
      </section>

      {/* ── CTA: Chat with Agent ─────────────────────────────── */}
      {tierConfig.canChat && (
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 mb-8 py-3.5 px-6 bg-accent text-white rounded-full font-medium hover:bg-accent-hover transition-colors shadow-md hover:shadow-lg"
        >
          <span>☕</span>
          <span>Chat with {COFFEE_AGENT_NAME}</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      {/* ── Memory summary + advanced config entry point ─────── */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-[family-name:var(--font-display)] text-text-primary">
              Memory Profile
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Advanced profile configuration now lives in a dedicated settings surface.
            </p>
          </div>
          <Link
            href="/settings/advanced-profile"
            className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
          >
            Open Advanced Settings
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Current focus
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {activeContextSummary.currentFocus || 'No active focus yet.'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Session hint
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {activeContextSummary.sessionHint || 'No hint captured yet.'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Active issues
            </p>
            <p className="mt-1 text-sm text-text-primary">{activeIssuesCount}</p>
          </div>

          <div className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Deep context domains
            </p>
            <p className="mt-1 text-sm text-text-primary">{deepContextKeys.length}</p>
          </div>
        </div>

        {!profile?.advanced_config && (
          <p className="mt-4 text-xs text-text-muted">
            Manual override is disabled. Enable advanced config in Advanced Profile Settings.
          </p>
        )}
      </section>

      {/* ── Phone verification ────────────────────────────────── */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-[family-name:var(--font-display)] text-text-primary">
            Phone
          </h2>
          {profile?.phone_verified && (
            <span className="font-mono text-xs uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              Verified
            </span>
          )}
        </div>
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">Phone number</span>
        <p className="text-text-primary">{profile?.phone || 'Not set'}</p>
      </section>

      {/* ── Developer details (shown only with ?dev) ──────────── */}
      {showDev && (
        <details className="mb-8 bg-surface rounded-xl border border-border p-6">
          <summary className="font-mono text-xs uppercase tracking-wider text-text-muted cursor-pointer hover:underline">
            Developer · Raw profile JSON
          </summary>
          <pre className="mt-4 text-xs text-text-primary overflow-auto font-[family-name:var(--font-mono)] whitespace-pre-wrap">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

/* ── Exported component (Suspense boundary for useSearchParams) ── */
export default function ProfileContent(props: ProfileContentProps) {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-12 text-center text-text-muted">Loading profile…</div>}>
      <ProfileInner {...props} />
    </Suspense>
  )
}
