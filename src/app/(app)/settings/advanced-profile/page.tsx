import Link from 'next/link'
import { ArrowLeft, Database, Shield, SlidersHorizontal } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { summarizeActiveContext } from '@/lib/profile/active-context'

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
  profile_version: number
  updated_at: string
  updated_by: string
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function AdvancedProfileSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const typedProfile = profile as Profile | null
  const activeContextSummary = summarizeActiveContext(typedProfile?.active_context)
  const deepContextEntries = typedProfile?.deep_context
    ? Object.entries(typedProfile.deep_context)
    : []
  const sharingEntries = typedProfile?.sharing_allowlist
    ? Object.entries(typedProfile.sharing_allowlist)
    : []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <Link
          href="/settings"
          className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 text-sm text-text-secondary hover:bg-surface-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Settings
        </Link>

        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-latte">
            <SlidersHorizontal className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-[family-name:var(--font-display)] text-espresso">
              Advanced Profile Settings
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Control advanced memory surfaces used by Measure Barista.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">Memory Layers</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              L1 Identity
            </p>
            <p className="mt-1 text-sm text-text-primary">Always loaded user identity and preferences.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              L2 Active Context
            </p>
            <p className="mt-1 text-sm text-text-primary">Session focus, hints, and live blockers.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              L3 Deep Context
            </p>
            <p className="mt-1 text-sm text-text-primary">On-demand historical knowledge domains.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">Identity (L1)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Name</p>
            <p className="text-sm text-text-primary">{typedProfile?.identity?.name || 'Not set'}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Handle</p>
            <p className="text-sm text-text-primary">{typedProfile?.identity?.handle || 'Not set'}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Timezone</p>
            <p className="text-sm text-text-primary">{typedProfile?.identity?.timezone || 'Not set'}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Communication style
            </p>
            <p className="text-sm text-text-primary">
              {typedProfile?.identity?.communication_style || 'Not set'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">Active Context (L2)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Current focus
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {activeContextSummary.currentFocus || 'No focus captured yet.'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Session hint
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {activeContextSummary.sessionHint || 'No hint captured yet.'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 sm:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Active issues
            </p>
            {activeContextSummary.activeIssues.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeContextSummary.activeIssues.map((issue) => (
                  <span
                    key={issue}
                    className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-text-primary">No active issues tracked.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">Deep Context (L3)</h2>
        </div>
        <div className="mt-4 space-y-2">
          {deepContextEntries.length > 0 ? (
            deepContextEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-text-primary">
                  {value && Object.keys(value).length > 0
                    ? `${Object.keys(value).length} entries`
                    : 'Empty'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">
              No deep context domains yet. Continued conversations will populate this surface.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-text-primary">Governance</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Advanced config
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {typedProfile?.advanced_config ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Last updated
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {formatUpdatedAt(typedProfile?.updated_at || null)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Updated by: {typedProfile?.updated_by || 'Unknown'}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3 md:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Sharing allowlist
            </p>
            {sharingEntries.length > 0 ? (
              <div className="mt-2 space-y-2">
                {sharingEntries.map(([scope, entries]) => (
                  <div key={scope}>
                    <p className="text-xs font-medium text-text-primary">{scope}</p>
                    <p className="text-xs text-text-secondary">
                      {entries.length > 0 ? entries.join(', ') : 'No entries'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                No explicit sharing rules configured.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
