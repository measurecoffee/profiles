import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Identity {
  name: string | null
  handle: string | null
  timezone: string | null
  roles: string[]
  communication_style: string | null
  active_projects: string[]
  profile_version: number
}

interface ActiveContext {
  current_focus: string | null
  recent_activity: string[]
  active_issues: string[]
  session_hint: string | null
}

interface DeepContext {
  equipment: Record<string, unknown>
  preferences: Record<string, unknown>
  projects: Record<string, unknown>
  businesses: Record<string, unknown>
  maintenance: Record<string, unknown>
  relationships: Record<string, unknown>
  custom: Record<string, unknown>
}

interface Profile {
  id: string
  user_id: string
  identity: Identity
  active_context: ActiveContext
  deep_context: DeepContext
  sharing_allowlist: Record<string, string[]>
  advanced_config: boolean
  profile_version: number
  updated_at: string
  updated_by: string
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const typedProfile = profile as Profile | null

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2C1810]">
              {typedProfile?.identity?.name || user.email}
            </h1>
            <p className="text-[#8B7355]">
              @{typedProfile?.identity?.handle || 'no-handle'} · v{typedProfile?.profile_version || 1}
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
              <p className="font-medium text-[#2C1810]">{typedProfile?.identity?.name || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Handle</span>
              <p className="font-medium text-[#2C1810]">{typedProfile?.identity?.handle || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Timezone</span>
              <p className="font-medium text-[#2C1810]">{typedProfile?.identity?.timezone || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Roles</span>
              <p className="font-medium text-[#2C1810]">
                {typedProfile?.identity?.roles?.length ? typedProfile.identity.roles.join(', ') : 'None'}
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
            {!typedProfile?.advanced_config && ' Enable advanced config for manual override.'}
          </p>
          <div className="text-sm text-[#2C1810] space-y-2">
            <div>
              <span className="text-[#8B7355]">Current focus</span>
              <p>{typedProfile?.active_context?.current_focus || 'No active focus'}</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Recent activity</span>
              <p>{typedProfile?.active_context?.recent_activity?.length || 0} items</p>
            </div>
            <div>
              <span className="text-[#8B7355]">Active issues</span>
              <p>{typedProfile?.active_context?.active_issues?.length || 0} items</p>
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
            {typedProfile?.deep_context && Object.entries(typedProfile.deep_context).map(([key, value]) => (
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

        {/* Pending Updates */}
        <section className="mb-8 bg-white rounded-xl border border-[#D4C5B0] p-6">
          <h2 className="text-lg font-semibold text-[#2C1810] mb-4">Pending Updates</h2>
          <p className="text-sm text-[#8B7355]">
            Agent-proposed changes will appear here for your review.
          </p>
          <div className="mt-4 text-sm text-[#8B7355] italic">
            No pending updates
          </div>
        </section>

        {/* Debug: raw JSON */}
        <details className="mb-8">
          <summary className="text-xs text-[#8B7355] cursor-pointer hover:underline">
            Raw profile JSON
          </summary>
          <pre className="mt-2 text-xs text-[#2C1810] bg-white rounded-xl border border-[#D4C5B0] p-4 overflow-auto">
            {JSON.stringify(typedProfile, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}