import { AlertCircle, ShieldCheck, Users2, Building2, FlaskConical, Activity } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCompanyIntelligenceOverview,
  type CompanyAccessControlRow,
} from '@/lib/company-intelligence/overview'

function formatTier(tier: string): string {
  if (tier === 'tier1') return 'Basic'
  if (tier === 'tier2') return 'Pro'
  if (tier === 'expired_trial') return 'Expired Trial'
  if (tier === 'trial') return 'Trial'
  return tier
}

function formatSubscriptionModel(model: string): string {
  if (model === 'seat') return 'Seat'
  if (model === 'location') return 'Location'
  if (model === 'hybrid') return 'Hybrid'
  return model
}

function formatBillingStatus(status: string): string {
  if (status === 'past_due') return 'Past Due'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'active') return 'Active'
  return status
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getUtilization(current: number, limit: number | null) {
  if (!limit || limit <= 0) {
    return {
      label: 'Unlimited',
      ratio: 0,
      hasLimit: false,
    }
  }

  return {
    label: `${current}/${limit}`,
    ratio: Math.min(current / limit, 1),
    hasLimit: true,
  }
}

function formatMembershipStatus(status: CompanyAccessControlRow['membership_status']): string {
  if (status === 'invited') return 'Invited'
  if (status === 'active') return 'Active'
  if (status === 'suspended') return 'Suspended'
  if (status === 'removed') return 'Removed'
  return status
}

function formatMembershipRole(role: CompanyAccessControlRow['role']): string {
  if (role === 'owner') return 'Owner'
  if (role === 'manager') return 'Manager'
  if (role === 'barista') return 'Barista'
  return role
}

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : tone === 'danger'
          ? 'bg-red-100 text-red-700 border-red-200'
          : 'bg-surface-muted text-text-secondary border-border'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        toneClass,
      ].join(' ')}
    >
      {label}
    </span>
  )
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <div className="rounded-lg bg-latte p-2 text-accent">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-text-primary font-[family-name:var(--font-display)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </article>
  )
}

function RatioBar({
  label,
  current,
  ratio,
  total,
  tone = 'accent',
}: {
  label: string
  current: number
  ratio: number
  total: number
  tone?: 'accent' | 'success' | 'warning'
}) {
  const barClass =
    tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-accent'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-[family-name:var(--font-mono)] text-text-primary">
          {current}/{total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-latte" role="presentation">
        <div
          className={['h-full rounded-full transition-all duration-300', barClass].join(' ')}
          style={{ width: `${current === 0 ? 0 : Math.max(4, Math.round(ratio * 100))}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-muted">
          Company Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-[family-name:var(--font-display)] text-espresso">
          Executive Overview
        </h1>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-medium text-amber-900">{title}</p>
              <p className="mt-1 text-sm text-amber-800">{description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccessRoster({
  rows,
}: {
  rows: CompanyAccessControlRow[]
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-4">
        <p className="text-sm text-text-secondary">
          No access-governance rows are visible for your current role.
        </p>
      </div>
    )
  }

  const visibleRows = rows.slice(0, 8)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-muted">
          <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Accepted</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const statusTone =
              row.membership_status === 'active'
                ? 'success'
                : row.membership_status === 'invited'
                  ? 'warning'
                  : 'danger'

            return (
              <tr key={`${row.organization_id}-${row.user_id}`} className="border-t border-border">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                  {row.user_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-text-primary">{formatMembershipRole(row.role)}</td>
                <td className="px-4 py-3">
                  <StatusPill label={formatMembershipStatus(row.membership_status)} tone={statusTone} />
                </td>
                <td className="px-4 py-3 text-text-secondary">{formatDate(row.accepted_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length > visibleRows.length && (
        <p className="border-t border-border bg-surface px-4 py-2 text-xs text-text-muted">
          Showing {visibleRows.length} of {rows.length} membership rows
        </p>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const overview = await getCompanyIntelligenceOverview(supabase, user.id)

  if (overview.status === 'no_membership') {
    return (
      <EmptyState
        title="No active organization membership"
        description="This dashboard is scoped to an active roaster organization. Ask an owner to add you to an organization, then refresh."
      />
    )
  }

  if (overview.status === 'no_org_snapshot' || !overview.orgSummary) {
    return (
      <EmptyState
        title="Organization intelligence snapshot is unavailable"
        description="Your organization is valid, but no governed analytics row is visible yet. Verify company-intelligence migration `011` is applied."
      />
    )
  }

  const org = overview.orgSummary
  const admin = overview.adminSummary
  const hasExecutiveAccess = Boolean(admin)

  const ownerRatio = org.active_members > 0 ? org.active_owners / org.active_members : 0
  const managerRatio = org.active_members > 0 ? org.active_managers / org.active_members : 0
  const baristaRatio = org.active_members > 0 ? org.active_baristas / org.active_members : 0

  const seatUtilization = getUtilization(org.active_members, admin?.seat_limit ?? null)
  const locationUtilization = getUtilization(org.active_locations, admin?.location_limit ?? null)

  const billingTone =
    org.billing_status === 'active'
      ? 'success'
      : org.billing_status === 'past_due'
        ? 'warning'
        : 'danger'

  const snapshotAt = formatDate(org.snapshot_date)
  const latestModelChange = formatDateTime(
    [org.roaster_profile_updated_at, org.last_location_change_at, org.last_recipe_change_at]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-border bg-surface p-6">
        <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-text-muted">
          Company Intelligence
        </p>
        <h1 className="mt-2 text-3xl font-[family-name:var(--font-display)] text-espresso">
          Executive Overview
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Governed, role-aware intelligence snapshot for{' '}
          <span className="font-medium text-text-primary">{org.organization_name}</span>.
          Membership, location, and recipe metrics are scoped by RLS and company-intelligence
          access helpers.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusPill label={`Org: ${org.organization_slug}`} tone="neutral" />
          <StatusPill label={`Role: ${overview.activeRole ?? 'member'}`} tone="neutral" />
          <StatusPill label={`Snapshot: ${snapshotAt}`} tone="neutral" />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Users2 className="h-4 w-4" aria-hidden="true" />}
          label="Active Members"
          value={org.active_members.toString()}
          hint={`${org.invited_members} invited • ${org.suspended_members} suspended`}
        />
        <MetricCard
          icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          label="Active Locations"
          value={org.active_locations.toString()}
          hint={`${org.total_locations} total • ${org.inactive_locations} inactive`}
        />
        <MetricCard
          icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}
          label="Active Recipes"
          value={org.active_recipes.toString()}
          hint={`${org.total_recipes} total • ${org.location_scoped_recipes} location-scoped`}
        />
        <MetricCard
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          label="Billing State"
          value={formatBillingStatus(org.billing_status)}
          hint={`${formatTier(org.subscription_tier)} • ${formatSubscriptionModel(org.subscription_model)} model`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-text-primary">Workforce Mix</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Active team composition by role across the organization.
          </p>
          <div className="mt-4 space-y-3">
            <RatioBar
              label={`Owners (${formatPercent(ownerRatio)})`}
              current={org.active_owners}
              ratio={ownerRatio}
              total={org.active_members}
              tone="warning"
            />
            <RatioBar
              label={`Managers (${formatPercent(managerRatio)})`}
              current={org.active_managers}
              ratio={managerRatio}
              total={org.active_members}
              tone="success"
            />
            <RatioBar
              label={`Baristas (${formatPercent(baristaRatio)})`}
              current={org.active_baristas}
              ratio={baristaRatio}
              total={org.active_members}
            />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-text-primary">Operational Health</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Coverage of shared company configuration and most recent model updates.
          </p>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-sm text-text-secondary">Roaster Profile</dt>
              <dd>
                <StatusPill
                  label={org.has_roaster_profile ? 'Configured' : 'Missing'}
                  tone={org.has_roaster_profile ? 'success' : 'warning'}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-sm text-text-secondary">Roast Styles Tracked</dt>
              <dd className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                {org.roast_style_count}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-sm text-text-secondary">Last Model Activity</dt>
              <dd className="text-sm text-text-primary">{latestModelChange}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-sm text-text-secondary">Billing Health</dt>
              <dd>
                <StatusPill label={formatBillingStatus(org.billing_status)} tone={billingTone} />
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Executive Controls</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Subscription, capacity, and access governance fields for owner/manager roles.
            </p>
          </div>
          <StatusPill
            label={hasExecutiveAccess ? 'Executive access granted' : 'Member-safe mode'}
            tone={hasExecutiveAccess ? 'success' : 'neutral'}
          />
        </div>

        {hasExecutiveAccess && admin ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Subscription</p>
              <p className="mt-2 text-sm text-text-primary">
                {formatTier(admin.subscription_tier)} • {formatSubscriptionModel(admin.subscription_model)}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Trial started: {formatDate(admin.trial_started_at)}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Capacity</p>
              <div className="mt-2 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Seat utilization</span>
                    <span className="font-[family-name:var(--font-mono)]">{seatUtilization.label}</span>
                  </div>
                  {seatUtilization.hasLimit && (
                    <div className="mt-1 h-2 rounded-full bg-latte">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${org.active_members === 0 ? 0 : Math.max(4, Math.round(seatUtilization.ratio * 100))}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Location utilization</span>
                    <span className="font-[family-name:var(--font-mono)]">
                      {locationUtilization.label}
                    </span>
                  </div>
                  {locationUtilization.hasLimit && (
                    <div className="mt-1 h-2 rounded-full bg-latte">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${org.active_locations === 0 ? 0 : Math.max(4, Math.round(locationUtilization.ratio * 100))}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-sm text-text-secondary">
              Executive controls are intentionally hidden for barista roles. Ask an owner or
              manager for governance-level visibility.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-text-primary">Access Governance Snapshot</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Membership roster from `analytics.company_access_control_v1`, scoped by role permissions.
        </p>
        <div className="mt-4">
          <AccessRoster rows={overview.accessControl} />
        </div>
      </section>

      <footer className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-4 py-3 text-xs text-text-secondary">
        <Activity className="h-3.5 w-3.5 text-accent" />
        <span>
          Snapshot date: {snapshotAt}. Dashboard is secure by Supabase auth, RLS, and
          `can_access_company_intelligence`.
        </span>
      </footer>
    </div>
  )
}
