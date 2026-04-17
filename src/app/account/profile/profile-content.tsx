'use client'

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

export default function ProfileContent({ profile, email }: ProfileContentProps) {
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
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2C1810]">
              {profile?.identity?.name || email}
            </h1>
            <p className="text-[#8B7355]">
              @{profile?.identity?.handle || 'no-handle'} · v{profile?.profile_version || 1}
            </p>
          </div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="px-4 py-2 text-sm border border-[#D4C5B0] rounded-lg text-[#8B7355] hover:bg-[#F0E8DC] transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Tier / Subscription */}
        <section className="mb-8 bg-white rounded-xl border border-[#D4C5B0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2C1810]">Subscription</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isExpired ? 'bg-red-100 text-red-700' :
              tier === 'trial' ? 'bg-[#F0E8DC] text-[#8B7355]' :
              tier === 'tier1' ? 'bg-blue-100 text-blue-700' :
              tier === 'tier2' ? 'bg-purple-100 text-purple-700' :
              'bg-[#F0E8DC] text-[#8B7355]'
            }`}>
              {tierConfig.name}
            </span>
          </div>

          {tier === 'trial' && trialEndsAt && (
            <p className="text-sm text-[#8B7355] mb-3">
              Trial ends {trialEndsAt.toLocaleDateString()} ({daysLeft} days left)
            </p>
          )}

          {isExpired && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">
              Your free trial has expired. Upgrade to continue using the coffee agent.
            </div>
          )}

          {tier !== 'tier2' && (
            <div className="mt-2">
              {tier === 'trial' || tier === 'expired_trial' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleCheckout('tier1')}
                    className="block w-full text-center py-3 px-4 bg-[#2C1810] text-white rounded-lg font-medium hover:bg-[#3D2918] transition-colors"
                  >
                    Upgrade to Basic — $5/mo
                  </button>
                  <button
                    onClick={() => handleCheckout('tier2')}
                    className="block w-full text-center py-3 px-4 border-2 border-[#2C1810] text-[#2C1810] rounded-lg font-medium hover:bg-[#F0E8DC] transition-colors"
                  >
                    Upgrade to Pro — $19/mo
                  </button>
                </div>
              ) : tier === 'tier1' ? (
                <button
                  onClick={() => handleCheckout('tier2')}
                  className="block w-full text-center py-3 px-4 bg-[#2C1810] text-white rounded-lg font-medium hover:bg-[#3D2918] transition-colors"
                >
                  Upgrade to Pro — $19/mo
                </button>
              ) : null}
            </div>
          )}

          <div className="mt-4 text-sm text-[#8B7355]">
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
          <a href="/account/chat" className="block mb-8 py-3 px-4 text-center bg-[#2C1810] text-white rounded-lg font-medium hover:bg-[#3D2918] transition-colors">
            Chat with coffee agent →
          </a>
        )}

        {/* L1: Identity */}
        <section className="mb-8 bg-white rounded-xl border border-[#D4C5B0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2C1810]">Identity</h2>
            <span className="text-xs bg-[#F0E8DC] text-[#8B7355] px-2 py-1 rounded-full">L1 · Always loaded</span>
          </div>
          <p className="text-xs text-[#8B7355] mb-4">
            ~150 tokens per session. Your agent sees this every time.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#8B7355]">Name</span>
              <p className="font-medium text-[#2C1810]">{profile?.identity?.name || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Handle</span>
              <p className="font-medium text-[#2C1810]">{profile?.identity?.handle || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Timezone</span>
              <p className="font-medium text-[#2C1810]">{profile?.identity?.timezone || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Roles</span>
              <p className="font-medium text-[#2C1810]">
                {profile?.identity?.roles?.length ? profile.identity.roles.join(', ') : 'None'}
              </p>
            </div>
          </div>
        </section>

        {/* L2: Active Context */}
        <section className="mb-8 bg-white rounded-xl border border-[#D4C5B0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2C1810]">Active Context</h2>
            <span className="text-xs bg-[#F0E8DC] text-[#8B7355] px-2 py-1 rounded-full">L2 · Per-session</span>
          </div>
          <p className="text-xs text-[#8B7355] mb-4">
            ~300 tokens. Auto-generated from your recent activity.
            {!profile?.advanced_config && ' Enable advanced config for manual override.'}
          </p>
          <div className="text-sm text-[#2C1810] space-y-2">
            <div>
              <span className="text-[#8B7355]">Current focus</span>
              <p>{String((profile?.active_context as Record<string, unknown>)?.current_focus ?? 'No active focus')}</p>
            </div>
          </div>
        </section>

        {/* L3: Deep Context */}
        <section className="mb-8 bg-white rounded-xl border border-[#D4C5B0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2C1810]">Deep Context</h2>
            <span className="text-xs bg-[#F0E8DC] text-[#8B7355] px-2 py-1 rounded-full">L3 · On-demand</span>
          </div>
          <p className="text-xs text-[#8B7355] mb-4">
            Fetched by agents only when needed. Unlimited depth.
          </p>
          <div className="text-sm space-y-1">
            {profile?.deep_context && Object.entries(profile.deep_context).map(([key, value]) => (
              <div key={key} className="flex justify-between text-[#2C1810]">
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-[#8B7355]">
                  {value && typeof value === 'object' && Object.keys(value).length > 0
                    ? `${Object.keys(value).length} entries`
                    : 'Empty'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Raw JSON */}
        <details className="mb-8">
          <summary className="text-xs text-[#8B7355] cursor-pointer hover:underline">
            Raw profile JSON
          </summary>
          <pre className="mt-2 text-xs text-[#2C1810] bg-white rounded-xl border border-[#D4C5B0] p-4 overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}