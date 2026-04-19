-- ============================================================
-- measure.coffee profiles — Phase 7: Multi-user business accounts
-- ============================================================
-- Introduces organization tenancy for roaster businesses:
--   organizations (billing + tenancy boundary)
--   roaster_profiles (roaster-specific shared defaults)
--   organization_locations (site-level defaults)
--   organization_memberships (owner/manager/barista roles)
--   organization_recipes (shared recipe library)
-- ============================================================

-- -----------------------------------------------------------
-- ORGANIZATIONS
-- -----------------------------------------------------------
CREATE TABLE public.organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE CHECK (length(trim(slug)) > 0),
  display_name          text NOT NULL CHECK (length(trim(display_name)) > 0),
  legal_name            text,
  organization_type     text NOT NULL DEFAULT 'roaster' CHECK (organization_type IN ('roaster')),

  created_by_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  billing_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  stripe_customer_id    text UNIQUE,
  subscription_tier     text NOT NULL DEFAULT 'trial'
                        CHECK (subscription_tier IN ('trial', 'expired_trial', 'tier1', 'tier2')),
  subscription_model    text NOT NULL DEFAULT 'seat'
                        CHECK (subscription_model IN ('seat', 'location', 'hybrid')),
  billing_status        text NOT NULL DEFAULT 'active'
                        CHECK (billing_status IN ('active', 'past_due', 'cancelled')),
  seat_limit            integer CHECK (seat_limit IS NULL OR seat_limit > 0),
  location_limit        integer CHECK (location_limit IS NULL OR location_limit > 0),
  trial_started_at      timestamptz,

  settings              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_billing_owner
  ON public.organizations(billing_owner_user_id);

-- -----------------------------------------------------------
-- ROASTER PROFILES (1:1 with organizations)
-- -----------------------------------------------------------
CREATE TABLE public.roaster_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  roast_styles            jsonb NOT NULL DEFAULT '[]'::jsonb,
  production_defaults     jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared_coffee_knowledge jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- ORGANIZATION LOCATIONS
-- -----------------------------------------------------------
CREATE TABLE public.organization_locations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug                text NOT NULL CHECK (length(trim(slug)) > 0),
  name                text NOT NULL CHECK (length(trim(name)) > 0),
  timezone            text,
  address             jsonb NOT NULL DEFAULT '{}'::jsonb,
  defaults            jsonb NOT NULL DEFAULT '{"brew": {}, "dial_in": {}, "service": {}}'::jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  created_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_organization_locations_org_active
  ON public.organization_locations(organization_id, is_active, updated_at DESC);

-- -----------------------------------------------------------
-- ORGANIZATION MEMBERSHIPS
-- -----------------------------------------------------------
CREATE TABLE public.organization_memberships (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role               text NOT NULL CHECK (role IN ('owner', 'manager', 'barista')),
  membership_status  text NOT NULL DEFAULT 'active'
                     CHECK (membership_status IN ('invited', 'active', 'suspended', 'removed')),
  location_scope     jsonb NOT NULL DEFAULT '[]'::jsonb, -- optional location IDs for scoped access
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at         timestamptz,
  accepted_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organization_memberships_user_status
  ON public.organization_memberships(user_id, membership_status);

CREATE INDEX idx_organization_memberships_org_role
  ON public.organization_memberships(organization_id, role, membership_status);

-- -----------------------------------------------------------
-- ORGANIZATION RECIPES
-- -----------------------------------------------------------
CREATE TABLE public.organization_recipes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id        uuid REFERENCES public.organization_locations(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipe_name        text NOT NULL CHECK (length(trim(recipe_name)) > 0),
  recipe_payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility         text NOT NULL DEFAULT 'organization' CHECK (visibility IN ('organization', 'location')),
  is_archived        boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organization_recipes_org_location
  ON public.organization_recipes(organization_id, location_id, updated_at DESC);

-- Ensure location-scoped recipes stay inside the same organization.
CREATE OR REPLACE FUNCTION public.validate_recipe_location_membership()
RETURNS trigger AS $$
BEGIN
  IF NEW.location_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_locations l
    WHERE l.id = NEW.location_id
      AND l.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Recipe location % must belong to organization %', NEW.location_id, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_recipe_location_membership ON public.organization_recipes;
CREATE TRIGGER trg_validate_recipe_location_membership
  BEFORE INSERT OR UPDATE ON public.organization_recipes
  FOR EACH ROW EXECUTE FUNCTION public.validate_recipe_location_membership();

-- -----------------------------------------------------------
-- PROFILE CONTEXT EXTENSIONS
-- -----------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS active_location_id uuid REFERENCES public.organization_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_organization
  ON public.profiles(active_organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_active_location
  ON public.profiles(active_location_id);

-- Validate profile active location belongs to active organization.
CREATE OR REPLACE FUNCTION public.validate_profile_active_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.active_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.active_organization_id IS NULL THEN
    RAISE EXCEPTION 'active_organization_id is required when active_location_id is set';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_locations l
    WHERE l.id = NEW.active_location_id
      AND l.organization_id = NEW.active_organization_id
  ) THEN
    RAISE EXCEPTION 'active_location_id % must belong to active_organization_id %',
      NEW.active_location_id,
      NEW.active_organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_profile_active_location ON public.profiles;
CREATE TRIGGER trg_validate_profile_active_location
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_active_location();

-- -----------------------------------------------------------
-- UPDATED-AT TRIGGERS
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_business_account_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_touch_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_account_updated_at();

DROP TRIGGER IF EXISTS trg_touch_roaster_profiles_updated_at ON public.roaster_profiles;
CREATE TRIGGER trg_touch_roaster_profiles_updated_at
  BEFORE UPDATE ON public.roaster_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_account_updated_at();

DROP TRIGGER IF EXISTS trg_touch_locations_updated_at ON public.organization_locations;
CREATE TRIGGER trg_touch_locations_updated_at
  BEFORE UPDATE ON public.organization_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_account_updated_at();

DROP TRIGGER IF EXISTS trg_touch_memberships_updated_at ON public.organization_memberships;
CREATE TRIGGER trg_touch_memberships_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_account_updated_at();

DROP TRIGGER IF EXISTS trg_touch_recipes_updated_at ON public.organization_recipes;
CREATE TRIGGER trg_touch_recipes_updated_at
  BEFORE UPDATE ON public.organization_recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_business_account_updated_at();

-- -----------------------------------------------------------
-- MEMBERSHIP HELPER FUNCTIONS
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(
  p_organization_id uuid,
  p_allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.membership_status = 'active'
      AND m.role = ANY (p_allowed_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated, service_role;

-- -----------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roaster_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_recipes ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_org_member(id));

CREATE POLICY "Users can create organizations they own"
  ON public.organizations FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.uid() = created_by_user_id
      AND (billing_owner_user_id IS NULL OR billing_owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Owners can update organizations"
  ON public.organizations FOR UPDATE
  USING (auth.role() = 'service_role' OR public.has_org_role(id, ARRAY['owner']))
  WITH CHECK (auth.role() = 'service_role' OR public.has_org_role(id, ARRAY['owner']));

CREATE POLICY "Owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (auth.role() = 'service_role' OR public.has_org_role(id, ARRAY['owner']));

-- Roaster profiles
CREATE POLICY "Members can view roaster profiles"
  ON public.roaster_profiles FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_org_member(organization_id));

CREATE POLICY "Owners and managers can insert roaster profiles"
  ON public.roaster_profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners and managers can update roaster profiles"
  ON public.roaster_profiles FOR UPDATE
  USING (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']))
  WITH CHECK (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners can delete roaster profiles"
  ON public.roaster_profiles FOR DELETE
  USING (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner']));

-- Locations
CREATE POLICY "Members can view organization locations"
  ON public.organization_locations FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_org_member(organization_id));

CREATE POLICY "Owners and managers can insert organization locations"
  ON public.organization_locations FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners and managers can update organization locations"
  ON public.organization_locations FOR UPDATE
  USING (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']))
  WITH CHECK (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']));

CREATE POLICY "Owners and managers can delete organization locations"
  ON public.organization_locations FOR DELETE
  USING (auth.role() = 'service_role' OR public.has_org_role(organization_id, ARRAY['owner', 'manager']));

-- Memberships
CREATE POLICY "Members can view organization memberships"
  ON public.organization_memberships FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR user_id = auth.uid()
    OR public.has_org_role(organization_id, ARRAY['owner', 'manager'])
  );

CREATE POLICY "Owners and managers can insert memberships"
  ON public.organization_memberships FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner', 'manager'])
    OR (
      auth.uid() = user_id
      AND role = 'owner'
      AND membership_status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_memberships existing
        WHERE existing.organization_id = organization_memberships.organization_id
      )
    )
  );

CREATE POLICY "Owners and managers can update memberships"
  ON public.organization_memberships FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner'])
    OR (public.has_org_role(organization_id, ARRAY['manager']) AND role = 'barista')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner'])
    OR (public.has_org_role(organization_id, ARRAY['manager']) AND role = 'barista')
  );

CREATE POLICY "Owners and managers can delete memberships"
  ON public.organization_memberships FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner'])
    OR (public.has_org_role(organization_id, ARRAY['manager']) AND role = 'barista')
  );

-- Recipes
CREATE POLICY "Members can view organization recipes"
  ON public.organization_recipes FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_org_member(organization_id));

CREATE POLICY "Members can insert organization recipes"
  ON public.organization_recipes FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      public.has_org_role(organization_id, ARRAY['owner', 'manager', 'barista'])
      AND created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners managers and recipe creators can update organization recipes"
  ON public.organization_recipes FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner', 'manager'])
    OR (
      public.has_org_role(organization_id, ARRAY['barista'])
      AND created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner', 'manager'])
    OR (
      public.has_org_role(organization_id, ARRAY['barista'])
      AND created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can delete organization recipes"
  ON public.organization_recipes FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR public.has_org_role(organization_id, ARRAY['owner', 'manager'])
  );
