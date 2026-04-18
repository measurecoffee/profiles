'use client'

import { useSearchParams } from 'next/navigation'
import { TIERS } from '@/lib/agent/tiers'

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

const TIER_BADGE_STYLES: Record<string, string> = {
  trial: 'bg-latte text-mocha border border-mocha/20',
  expired_trial: 'bg-red-50 text-destructive border border-destructive/20',
  tier1: 'bg-cream text-copper border border-copper/30',
  tier2: 'bg-espresso text-gold border border-gold/30',
}

export default function ProfileContent({ profile, email }: ProfileContentProps) {
  const searchParams = useSearchParams()
  const showDev = searchParams.get('dev') !== null

  const tier = profile?.subscription_tier || 'trial'
  const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.trial
  const isExpired = tier === 'expired_trial'

  const trialStarted = profile?.trial_started_at ? new Date(profile.trial_started_at) : null
  const trialEndsAt = trialStarted ? new Date(trialStarted.getTime() + 7 * 24 * 60 * 60 * 1000) : null
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null

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
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-[family-name:var(--font-display)] text-espresso">
            {profile?.identity?.name || email}
          </h1>
          <p className="text-text-secondary">
            @{profile?.identity?.handle || 'no-handle'} · v{profile?.profile_version || 1}
          </p>
        </div>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="px-4 py-2 text-sm border border-border rounded-full text-text-secondary hover:bg-surface-muted transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Tier / Subscription */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Subscription</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TIER_BADGE_STYLES[tier] || TIER_BADGE_STYLES.trial}`}>
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
            Your free trial has expired. Upgrade to continue using the coffee agent.
          </div>
        )}

        {tier !== 'tier2' && (
          <div className="mt-2">
            {tier === 'trial' || tier === 'expired_trial' ? (
              <div className="space-y-3">
                <button
                  onClick={() => handleCheckout('tier1')}
                  className="block w-full text-center py-3 px-6 bg-cream text-copper rounded-full font-medium border border-copper/30 hover:bg-latte transition-colors"
                >
                  Upgrade to Basic — $5/mo
                </button>
                <button
                  onClick={() => handleCheckout('tier2')}
                  className="block w-full text-center py-3 px-6 bg-espresso text-gold rounded-full font-medium border border-gold/30 hover:bg-primary-hover transition-colors"
                >
                  Upgrade to Pro — $19/mo
                </button>
              </div>
            ) : tier === 'tier1' ? (
              <button
                onClick={() => handleCheckout('tier2')}
                className="block w-full text-center py-3 px-6 bg-espresso text-gold rounded-full font-medium border border-gold/30 hover:bg-primary-hover transition-colors"
              >
                Upgrade to Pro — $19/mo
              </button>
            ) : null}
          </div>
        )}

        <div className="mt-4 text-sm text-text-secondary">
          <p>{tierConfig.name} plan features:</p>
          <ul className="list-disc list-inside mt-1">
            {tierConfig.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Chat link */}
      {tierConfig.canChat && (
        <a href="/chat" className="block mb-8 py-3 px-6 text-center bg-accent text-cream rounded-full font-medium hover:bg-accent-hover transition-colors">
          Chat with coffee agent →
        </a>
      )}

      {/* L1: Your Coffee Identity */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your Coffee Identity</h2>
          <span className="text-xs bg-latte text-mocha px-2 py-1 rounded-full border border-mocha/10">L1 · Always loaded</span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          ~150 tokens per session. Your agent sees this every time.
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Name</span>
            <p className="font-medium text-text-primary">{profile?.identity?.name || 'Not set'}</p>
          </div>
          <div>
            <span className="text-text-muted">Handle</span>
            <p className="font-medium text-text-primary">{profile?.identity?.handle || 'Not set'}</p>
          </div>
          <div>
            <span className="text-text-muted">Timezone</span>
            <p className="font-medium text-text-primary">{profile?.identity?.timezone || 'Not set'}</p>
          </div>
          <div>
            <span className="text-text-muted">Roles</span>
            <p className="font-medium text-text-primary">
              {profile?.identity?.roles?.length ? profile.identity.roles.join(', ') : 'None'}
            </p>
          </div>
        </div>
      </section>

      {/* L2: What You're Working On */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">What You&apos;re Working On</h2>
          <span className="text-xs bg-cream text-copper px-2 py-1 rounded-full border border-copper/20">L2 · Per-session</span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          ~300 tokens. Auto-generated from your recent activity.
          {!profile?.advanced_config && ' Enable advanced config for manual override.'}
        </p>
        <div className="text-sm text-text-primary space-y-2">
          <div>
            <span className="text-text-muted">Current focus</span>
            <p>{String((profile?.active_context as Record<string, unknown>)?.current_focus ?? 'No active focus')}</p>
          </div>
        </div>
      </section>

      {/* L3: Your Coffee Knowledge */}
      <section className="mb-8 bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your Coffee Knowledge</h2>
          <span className="text-xs bg-espresso text-gold px-2 py-1 rounded-full border border-gold/20">L3 · On-demand</span>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Fetched by agents only when needed. Unlimited depth.
        </p>
        <div className="text-sm space-y-1">
          {profile?.deep_context && Object.entries(profile.deep_context).map(([key, value]) => (
            <div key={key} className="flex justify-between text-text-primary">
              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-text-muted">
                {value && typeof value === 'object' && Object.keys(value).length > 0
                  ? `${Object.keys(value).length} entries`
                  : 'Empty'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Raw JSON — only shown with ?dev query param */}
      {showDev && (
        <details className="mb-8">
          <summary className="text-xs text-text-muted cursor-pointer hover:underline">
            Raw profile JSON (dev mode)
          </summary>
          <pre className="mt-2 text-xs text-text-primary bg-surface rounded-xl border border-border p-4 overflow-auto font-[family-name:var(--font-mono)]">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}