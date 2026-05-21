-- 1. Update user_roles policy to allow super admins to see all roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage roles" 
ON public.user_roles FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. Update clients policy to allow super admins
DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace members can delete clients" ON public.clients;

CREATE POLICY "Users can view workspace clients" 
ON public.clients FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace clients" 
ON public.clients FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 3. Update video_editing_briefings policy
DROP POLICY IF EXISTS "Workspaces can view their video editing briefings" ON public.video_editing_briefings;
DROP POLICY IF EXISTS "Workspaces can manage their video editing briefings" ON public.video_editing_briefings;

CREATE POLICY "Users can view workspace video briefings" 
ON public.video_editing_briefings FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace video briefings" 
ON public.video_editing_briefings FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 4. Update briefings policy
DROP POLICY IF EXISTS "Workspace members can manage briefings" ON public.briefings;

CREATE POLICY "Users can view workspace briefings" 
ON public.briefings FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace briefings" 
ON public.briefings FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 5. Update client_video_settings policy
DROP POLICY IF EXISTS "Workspaces can view their client video settings" ON public.client_video_settings;
DROP POLICY IF EXISTS "Workspaces can manage their client video settings" ON public.client_video_settings;

CREATE POLICY "Users can view workspace video settings" 
ON public.client_video_settings FOR SELECT 
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users can manage workspace video settings" 
ON public.client_video_settings FOR ALL 
USING (has_workspace_access(workspace_id))
WITH CHECK (has_workspace_access(workspace_id));

-- 6. Add missing workspace_id check to other core tables if needed
-- For briefings_responses and other child tables, they usually rely on parent briefings.
-- But let's ensure they also allow super admin via a simpler check if workspace_id is present.

-- Ensure has_workspace_access is robust
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    _workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = _workspace_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
$function$;
