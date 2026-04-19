-- ============================================================
-- measure.coffee profiles — Phase 8: Company intelligence architecture
-- ============================================================
-- Establishes warehouse-view architecture for organization intelligence:
--   - analytics schema for governed read models
--   - role-aware access helper for org-scoped intelligence
--   - versioned warehouse + consumer views
-- ============================================================

-- -----------------------------------------------------------
-- ANALYTICS SCHEMA
-- -----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS analytics;

REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
GRANT USAGE ON SCHEMA analytics TO authenticated, service_role;

-- -----------------------------------------------------------
-- ACCESS HELPER
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_company_intelligence(
  p_organization_id uuid,
  p_allowed_roles text[] DEFAULT ARRAY['owner', 'manager']
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships m
      WHERE m.organization_id = p_organization_id
        AND m.user_id = auth.uid()
        AND m.membership_status = 'active'
        AND (
          p_allowed_roles IS NULL
          OR cardinality(p_allowed_roles) = 0
          OR m.role = ANY (p_allowed_roles)
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_company_intelligence(uuid, text[]) TO authenticated, service_role;

-- -----------------------------------------------------------
-- WAREHOUSE VIEW (service workload contract)
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW analytics.company_intelligence_warehouse_v1 AS
WITH membership_rollup AS (
  SELECT
    m.organization_id,
    COUNT(*) FILTER (WHERE m.membership_status = 'active')::integer AS active_members,
    COUNT(*) FILTER (WHERE m.membership_status = 'active' AND m.role = 'owner')::integer AS active_owners,
    COUNT(*) FILTER (WHERE m.membership_status = 'active' AND m.role = 'manager')::integer AS active_managers,
    COUNT(*) FILTER (WHERE m.membership_status = 'active' AND m.role = 'barista')::integer AS active_baristas,
    COUNT(*) FILTER (WHERE m.membership_status = 'invited')::integer AS invited_members,
    COUNT(*) FILTER (WHERE m.membership_status = 'suspended')::integer AS suspended_members
  FROM public.organization_memberships m
  GROUP BY m.organization_id
),
location_rollup AS (
  SELECT
    l.organization_id,
    COUNT(*)::integer AS total_locations,
    COUNT(*) FILTER (WHERE l.is_active)::integer AS active_locations,
    COUNT(*) FILTER (WHERE NOT l.is_active)::integer AS inactive_locations,
    MAX(l.updated_at) AS last_location_change_at
  FROM public.organization_locations l
  GROUP BY l.organization_id
),
recipe_rollup AS (
  SELECT
    r.organization_id,
    COUNT(*)::integer AS total_recipes,
    COUNT(*) FILTER (WHERE NOT r.is_archived)::integer AS active_recipes,
    COUNT(*) FILTER (WHERE r.is_archived)::integer AS archived_recipes,
    COUNT(*) FILTER (WHERE r.visibility = 'location')::integer AS location_scoped_recipes,
    MAX(r.updated_at) AS last_recipe_change_at
  FROM public.organization_recipes r
  GROUP BY r.organization_id
)
SELECT
  timezone('utc', now())::date AS snapshot_date,
  o.id AS organization_id,
  o.slug AS organization_slug,
  o.display_name AS organization_name,
  o.legal_name,
  o.organization_type,
  o.created_by_user_id,
  o.billing_owner_user_id,
  o.stripe_customer_id,
  o.subscription_tier,
  o.subscription_model,
  o.billing_status,
  o.seat_limit,
  o.location_limit,
  o.trial_started_at,
  o.created_at AS organization_created_at,
  o.updated_at AS organization_updated_at,
  COALESCE(mr.active_members, 0) AS active_members,
  COALESCE(mr.active_owners, 0) AS active_owners,
  COALESCE(mr.active_managers, 0) AS active_managers,
  COALESCE(mr.active_baristas, 0) AS active_baristas,
  COALESCE(mr.invited_members, 0) AS invited_members,
  COALESCE(mr.suspended_members, 0) AS suspended_members,
  COALESCE(lr.total_locations, 0) AS total_locations,
  COALESCE(lr.active_locations, 0) AS active_locations,
  COALESCE(lr.inactive_locations, 0) AS inactive_locations,
  COALESCE(rr.total_recipes, 0) AS total_recipes,
  COALESCE(rr.active_recipes, 0) AS active_recipes,
  COALESCE(rr.archived_recipes, 0) AS archived_recipes,
  COALESCE(rr.location_scoped_recipes, 0) AS location_scoped_recipes,
  (rp.id IS NOT NULL) AS has_roaster_profile,
  CASE
    WHEN rp.id IS NULL THEN 0
    ELSE jsonb_array_length(rp.roast_styles)
  END AS roast_style_count,
  rp.updated_at AS roaster_profile_updated_at,
  lr.last_location_change_at,
  rr.last_recipe_change_at
FROM public.organizations o
LEFT JOIN membership_rollup mr ON mr.organization_id = o.id
LEFT JOIN location_rollup lr ON lr.organization_id = o.id
LEFT JOIN recipe_rollup rr ON rr.organization_id = o.id
LEFT JOIN public.roaster_profiles rp ON rp.organization_id = o.id;

COMMENT ON VIEW analytics.company_intelligence_warehouse_v1 IS
  'Canonical org-grain warehouse contract for company intelligence (service workloads and ETL).';

-- -----------------------------------------------------------
-- MEMBER-SAFE VIEW (owners/managers/baristas)
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW analytics.company_intelligence_org_v1
WITH (security_barrier = true) AS
SELECT
  w.snapshot_date,
  w.organization_id,
  w.organization_slug,
  w.organization_name,
  w.organization_type,
  w.subscription_tier,
  w.subscription_model,
  w.billing_status,
  w.active_members,
  w.active_owners,
  w.active_managers,
  w.active_baristas,
  w.invited_members,
  w.suspended_members,
  w.total_locations,
  w.active_locations,
  w.inactive_locations,
  w.total_recipes,
  w.active_recipes,
  w.archived_recipes,
  w.location_scoped_recipes,
  w.has_roaster_profile,
  w.roast_style_count,
  w.organization_created_at,
  w.organization_updated_at,
  w.roaster_profile_updated_at,
  w.last_location_change_at,
  w.last_recipe_change_at
FROM analytics.company_intelligence_warehouse_v1 w
WHERE public.can_access_company_intelligence(
  w.organization_id,
  ARRAY['owner', 'manager', 'barista']
);

COMMENT ON VIEW analytics.company_intelligence_org_v1 IS
  'Organization-scoped intelligence for active org members. Excludes sensitive billing identifiers.';

-- -----------------------------------------------------------
-- ADMIN VIEW (owners/managers only)
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW analytics.company_intelligence_admin_v1
WITH (security_barrier = true) AS
SELECT
  w.snapshot_date,
  w.organization_id,
  w.organization_slug,
  w.organization_name,
  w.legal_name,
  w.organization_type,
  w.created_by_user_id,
  w.billing_owner_user_id,
  w.subscription_tier,
  w.subscription_model,
  w.billing_status,
  w.seat_limit,
  w.location_limit,
  w.trial_started_at,
  w.active_members,
  w.active_owners,
  w.active_managers,
  w.active_baristas,
  w.invited_members,
  w.suspended_members,
  w.total_locations,
  w.active_locations,
  w.total_recipes,
  w.active_recipes,
  w.archived_recipes,
  w.location_scoped_recipes,
  w.organization_created_at,
  w.organization_updated_at
FROM analytics.company_intelligence_warehouse_v1 w
WHERE public.can_access_company_intelligence(
  w.organization_id,
  ARRAY['owner', 'manager']
);

COMMENT ON VIEW analytics.company_intelligence_admin_v1 IS
  'Owner/manager intelligence view with entitlement and governance fields.';

-- -----------------------------------------------------------
-- ACCESS GOVERNANCE VIEW (owners/managers only)
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW analytics.company_access_control_v1
WITH (security_barrier = true) AS
SELECT
  m.organization_id,
  o.slug AS organization_slug,
  o.display_name AS organization_name,
  m.user_id,
  m.role,
  m.membership_status,
  m.location_scope,
  m.invited_by_user_id,
  m.invited_at,
  m.accepted_at,
  m.created_at,
  m.updated_at
FROM public.organization_memberships m
JOIN public.organizations o ON o.id = m.organization_id
WHERE public.can_access_company_intelligence(
  m.organization_id,
  ARRAY['owner', 'manager']
);

COMMENT ON VIEW analytics.company_access_control_v1 IS
  'Membership and role-state roster for org access governance.';

-- -----------------------------------------------------------
-- GRANTS
-- -----------------------------------------------------------
REVOKE ALL ON TABLE analytics.company_intelligence_warehouse_v1 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE analytics.company_intelligence_org_v1 FROM PUBLIC;
REVOKE ALL ON TABLE analytics.company_intelligence_admin_v1 FROM PUBLIC;
REVOKE ALL ON TABLE analytics.company_access_control_v1 FROM PUBLIC;

GRANT SELECT ON TABLE analytics.company_intelligence_org_v1 TO authenticated;
GRANT SELECT ON TABLE analytics.company_intelligence_admin_v1 TO authenticated;
GRANT SELECT ON TABLE analytics.company_access_control_v1 TO authenticated;

GRANT SELECT ON TABLE analytics.company_intelligence_warehouse_v1 TO service_role;
GRANT SELECT ON TABLE analytics.company_intelligence_org_v1 TO service_role;
GRANT SELECT ON TABLE analytics.company_intelligence_admin_v1 TO service_role;
GRANT SELECT ON TABLE analytics.company_access_control_v1 TO service_role;
