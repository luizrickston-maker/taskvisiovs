
-- Helper function: get workspace_id for a given user_id (for backfill and RLS)
CREATE OR REPLACE FUNCTION public.get_workspace_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = _user_id AND role = 'owner'
  LIMIT 1
$$;

-- RLS helper: check if current user has workspace access to a row's workspace_id
-- This function is used in RLS policies for workspace-scoped tables
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _workspace_id IS NULL  -- Allow access to legacy rows without workspace_id
    OR public.is_workspace_member(_workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
$$;

-- Update RLS policies for projects: add workspace-aware check
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for prospects
DROP POLICY IF EXISTS "Users can view own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can insert own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can update own prospects" ON public.prospects;
DROP POLICY IF EXISTS "Users can delete own prospects" ON public.prospects;

CREATE POLICY "Users can view own prospects"
  ON public.prospects FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own prospects"
  ON public.prospects FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own prospects"
  ON public.prospects FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own prospects"
  ON public.prospects FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for corporate_team
DROP POLICY IF EXISTS "Users can view own team" ON public.corporate_team;
DROP POLICY IF EXISTS "Users can insert own team" ON public.corporate_team;
DROP POLICY IF EXISTS "Users can update own team" ON public.corporate_team;
DROP POLICY IF EXISTS "Users can delete own team" ON public.corporate_team;

CREATE POLICY "Users can view own team"
  ON public.corporate_team FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own team"
  ON public.corporate_team FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own team"
  ON public.corporate_team FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own team"
  ON public.corporate_team FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for corporate_costs
DROP POLICY IF EXISTS "costs_select" ON public.corporate_costs;
DROP POLICY IF EXISTS "costs_insert" ON public.corporate_costs;
DROP POLICY IF EXISTS "costs_update" ON public.corporate_costs;
DROP POLICY IF EXISTS "costs_delete" ON public.corporate_costs;

CREATE POLICY "costs_select"
  ON public.corporate_costs FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "costs_insert"
  ON public.corporate_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "costs_update"
  ON public.corporate_costs FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "costs_delete"
  ON public.corporate_costs FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for corporate_pricing
DROP POLICY IF EXISTS "Users can view own pricing" ON public.corporate_pricing;
DROP POLICY IF EXISTS "Users can insert own pricing" ON public.corporate_pricing;
DROP POLICY IF EXISTS "Users can update own pricing" ON public.corporate_pricing;
DROP POLICY IF EXISTS "Users can delete own pricing" ON public.corporate_pricing;

CREATE POLICY "Users can view own pricing"
  ON public.corporate_pricing FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own pricing"
  ON public.corporate_pricing FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own pricing"
  ON public.corporate_pricing FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own pricing"
  ON public.corporate_pricing FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for editorial_calendar_items
DROP POLICY IF EXISTS "Users can view own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can insert own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can update own editorial items" ON public.editorial_calendar_items;
DROP POLICY IF EXISTS "Users can delete own editorial items" ON public.editorial_calendar_items;

CREATE POLICY "Users can view own editorial items"
  ON public.editorial_calendar_items FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own editorial items"
  ON public.editorial_calendar_items FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own editorial items"
  ON public.editorial_calendar_items FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own editorial items"
  ON public.editorial_calendar_items FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

-- Update RLS policies for service_plans
DROP POLICY IF EXISTS "Users can view own plans" ON public.service_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON public.service_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON public.service_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON public.service_plans;

CREATE POLICY "Users can view own plans"
  ON public.service_plans FOR SELECT
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can insert own plans"
  ON public.service_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can update own plans"
  ON public.service_plans FOR UPDATE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));

CREATE POLICY "Users can delete own plans"
  ON public.service_plans FOR DELETE
  USING (auth.uid() = user_id AND public.has_workspace_access(workspace_id));
