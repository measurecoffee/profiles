import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export interface CompanyIntelligenceOrgRow {
  snapshot_date: string
  organization_id: string
  organization_slug: string
  organization_name: string
  organization_type: string
  subscription_tier: string
  subscription_model: string
  billing_status: string
  active_members: number
  active_owners: number
  active_managers: number
  active_baristas: number
  invited_members: number
  suspended_members: number
  total_locations: number
  active_locations: number
  inactive_locations: number
  total_recipes: number
  active_recipes: number
  archived_recipes: number
  location_scoped_recipes: number
  has_roaster_profile: boolean
  roast_style_count: number
  organization_created_at: string
  organization_updated_at: string
  roaster_profile_updated_at: string | null
  last_location_change_at: string | null
  last_recipe_change_at: string | null
}

export interface CompanyIntelligenceAdminRow {
  snapshot_date: string
  organization_id: string
  organization_slug: string
  organization_name: string
  legal_name: string | null
  organization_type: string
  created_by_user_id: string
  billing_owner_user_id: string | null
  subscription_tier: string
  subscription_model: string
  billing_status: string
  seat_limit: number | null
  location_limit: number | null
  trial_started_at: string | null
  active_members: number
  active_owners: number
  active_managers: number
  active_baristas: number
  invited_members: number
  suspended_members: number
  total_locations: number
  active_locations: number
  total_recipes: number
  active_recipes: number
  archived_recipes: number
  location_scoped_recipes: number
  organization_created_at: string
  organization_updated_at: string
}

export interface CompanyAccessControlRow {
  organization_id: string
  organization_slug: string
  organization_name: string
  user_id: string
  role: 'owner' | 'manager' | 'barista'
  membership_status: 'invited' | 'active' | 'suspended' | 'removed'
  location_scope: unknown
  invited_by_user_id: string | null
  invited_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

interface ActiveMembershipRow {
  organization_id: string
  role: 'owner' | 'manager' | 'barista'
  membership_status: string
  created_at: string
}

export type CompanyIntelligenceOverviewStatus =
  | 'ok'
  | 'no_membership'
  | 'no_org_snapshot'

export interface CompanyIntelligenceOverviewResult {
  status: CompanyIntelligenceOverviewStatus
  activeOrganizationId: string | null
  activeRole: 'owner' | 'manager' | 'barista' | null
  orgSummary: CompanyIntelligenceOrgRow | null
  adminSummary: CompanyIntelligenceAdminRow | null
  accessControl: CompanyAccessControlRow[]
}

type LooseRelation = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: Array<{
    foreignKeyName: string
    columns: string[]
    isOneToOne: boolean
    referencedRelation: string
    referencedColumns: string[]
  }>
}

type LooseView = {
  Row: Record<string, unknown>
  Relationships: Array<{
    foreignKeyName: string
    columns: string[]
    isOneToOne: boolean
    referencedRelation: string
    referencedColumns: string[]
  }>
}

type LooseSchema = {
  Tables: Record<string, LooseRelation>
  Views: Record<string, LooseView>
  Functions: Record<string, never>
  Enums: Record<string, never>
  CompositeTypes: Record<string, never>
}

type LooseDatabase = {
  __InternalSupabase: {
    PostgrestVersion: string
  }
  public: LooseSchema
  analytics: LooseSchema
}

function isNoRowsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST116'
}

export async function getCompanyIntelligenceOverview(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CompanyIntelligenceOverviewResult> {
  // The generated database types lag the newest migrations on this branch.
  // Cast once in this boundary so the rest of the app stays strongly typed.
  const supabaseAny = supabase as unknown as SupabaseClient<LooseDatabase>

  const [{ data: profile }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabaseAny
      .from('profiles')
      .select('active_organization_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAny
      .from('organization_memberships')
      .select('organization_id, role, membership_status, created_at')
      .eq('user_id', userId)
      .eq('membership_status', 'active')
      .order('created_at', { ascending: true }),
  ])

  if (membershipsError) {
    throw new Error(`Unable to load organization memberships: ${membershipsError.message}`)
  }

  const activeMemberships = (memberships ?? []) as ActiveMembershipRow[]
  if (activeMemberships.length === 0) {
    return {
      status: 'no_membership',
      activeOrganizationId: null,
      activeRole: null,
      orgSummary: null,
      adminSummary: null,
      accessControl: [],
    }
  }

  let activeOrganizationId =
    typeof profile?.active_organization_id === 'string'
      ? profile.active_organization_id
      : activeMemberships[0].organization_id

  let activeMembership =
    activeMemberships.find((membership) => membership.organization_id === activeOrganizationId) ??
    null

  if (!activeMembership) {
    activeMembership = activeMemberships[0]
    activeOrganizationId = activeMembership.organization_id
  }

  // Keep profile context aligned with whichever active membership we resolved.
  if (profile?.active_organization_id !== activeOrganizationId) {
    await supabaseAny
      .from('profiles')
      .update({ active_organization_id: activeOrganizationId })
      .eq('user_id', userId)
  }

  const analytics = supabaseAny.schema('analytics')

  const [
    { data: orgSummaryData, error: orgSummaryError },
    { data: adminSummaryData, error: adminSummaryError },
    { data: accessControlData, error: accessControlError },
  ] = await Promise.all([
    analytics
      .from('company_intelligence_org_v1')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle(),
    analytics
      .from('company_intelligence_admin_v1')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .maybeSingle(),
    analytics
      .from('company_access_control_v1')
      .select('*')
      .eq('organization_id', activeOrganizationId)
      .order('created_at', { ascending: false }),
  ])

  if (orgSummaryError && !isNoRowsError(orgSummaryError)) {
    throw new Error(`Unable to load organization intelligence: ${orgSummaryError.message}`)
  }

  if (!orgSummaryData) {
    return {
      status: 'no_org_snapshot',
      activeOrganizationId,
      activeRole: activeMembership.role,
      orgSummary: null,
      adminSummary: null,
      accessControl: [],
    }
  }

  if (adminSummaryError && !isNoRowsError(adminSummaryError)) {
    throw new Error(`Unable to load executive intelligence: ${adminSummaryError.message}`)
  }

  if (accessControlError) {
    throw new Error(`Unable to load access-control intelligence: ${accessControlError.message}`)
  }

  return {
    status: 'ok',
    activeOrganizationId,
    activeRole: activeMembership.role,
    orgSummary: orgSummaryData as unknown as CompanyIntelligenceOrgRow,
    adminSummary: (adminSummaryData as unknown as CompanyIntelligenceAdminRow | null) ?? null,
    accessControl: (accessControlData as unknown as CompanyAccessControlRow[]) ?? [],
  }
}
