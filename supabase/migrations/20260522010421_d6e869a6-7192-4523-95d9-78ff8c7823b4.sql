-- 1. Fix views
ALTER VIEW public.editorial_calendar_summary SET (security_invoker = true);

-- 2. Fix function search paths
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_briefing_notification() SET search_path = public;
ALTER FUNCTION public.get_user_360_summary(uuid) SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- 3. Revoke public execute from security definer functions (fixed signatures)
REVOKE EXECUTE ON FUNCTION public.handle_briefing_notification() FROM public;
REVOKE EXECUTE ON FUNCTION public.create_default_ai_agent_for_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.create_default_ai_agent() FROM public;
REVOKE EXECUTE ON FUNCTION public.update_sales_goals_on_prospect_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.revert_sales_goals_on_prospect_delete() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_workspace() FROM public;

GRANT EXECUTE ON FUNCTION public.handle_briefing_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_ai_agent_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_ai_agent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sales_goals_on_prospect_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_sales_goals_on_prospect_delete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_workspace() TO authenticated;

-- 4. Policies for briefing_magic_links
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'briefing_magic_links') THEN
        CREATE POLICY "Users can manage workspace magic links" 
        ON public.briefing_magic_links 
        FOR ALL 
        USING (EXISTS (
            SELECT 1 FROM public.briefing_responses br
            JOIN public.briefings b ON b.id = br.briefing_id
            WHERE br.id = briefing_magic_links.briefing_response_id
            AND has_workspace_access(b.workspace_id)
        ));
    END IF;
END $$;

-- 5. Ensure all core tables have isolation policies (using has_workspace_access for consistency)

-- Client Video Settings
DROP POLICY IF EXISTS "Users can manage workspace video settings" ON public.client_video_settings;
CREATE POLICY "Users can manage workspace video settings" 
ON public.client_video_settings FOR ALL 
USING (has_workspace_access(workspace_id));

-- Video Editing Briefings
DROP POLICY IF EXISTS "Users can manage workspace video briefings" ON public.video_editing_briefings;
CREATE POLICY "Users can manage workspace video briefings" 
ON public.video_editing_briefings FOR ALL 
USING (has_workspace_access(workspace_id));

-- Briefings
DROP POLICY IF EXISTS "Users can manage workspace briefings" ON public.briefings;
CREATE POLICY "Users can manage workspace briefings" 
ON public.briefings FOR ALL 
USING (has_workspace_access(workspace_id));

-- Business Processes
DROP POLICY IF EXISTS "Users can manage workspace processes" ON public.business_processes;
CREATE POLICY "Users can manage workspace processes" 
ON public.business_processes FOR ALL 
USING (has_workspace_access(workspace_id));

-- Process Instances
DROP POLICY IF EXISTS "pi_select_workspace" ON public.process_instances;
DROP POLICY IF EXISTS "pi_insert" ON public.process_instances;
DROP POLICY IF EXISTS "pi_update" ON public.process_instances;
DROP POLICY IF EXISTS "pi_delete" ON public.process_instances;
DROP POLICY IF EXISTS "Users can manage workspace process instances" ON public.process_instances;

CREATE POLICY "Users can manage workspace process instances" 
ON public.process_instances FOR ALL 
USING (has_workspace_access(workspace_id));

-- Process Instance Steps
DROP POLICY IF EXISTS "pis_select_workspace" ON public.process_instance_steps;
DROP POLICY IF EXISTS "pis_insert" ON public.process_instance_steps;
DROP POLICY IF EXISTS "pis_update" ON public.process_instance_steps;
DROP POLICY IF EXISTS "pis_delete" ON public.process_instance_steps;
DROP POLICY IF EXISTS "Users can manage workspace process instance steps" ON public.process_instance_steps;

CREATE POLICY "Users can manage workspace process instance steps" 
ON public.process_instance_steps FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.process_instances pi
    WHERE pi.id = process_instance_steps.process_instance_id
    AND has_workspace_access(pi.workspace_id)
));

-- 6. Refine External Access Policies (keep them restrictive)

-- Briefings External Access
DROP POLICY IF EXISTS "External access to view briefing" ON public.briefings;
CREATE POLICY "External access to view briefing" 
ON public.briefings FOR SELECT 
USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

DROP POLICY IF EXISTS "External access to update briefing" ON public.briefings;
CREATE POLICY "External access to update briefing" 
ON public.briefings FOR UPDATE 
USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now())
WITH CHECK (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

-- Briefing Responses External Access
DROP POLICY IF EXISTS "External access to briefing responses" ON public.briefing_responses;
CREATE POLICY "External access to briefing responses" 
ON public.briefing_responses FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.briefings b
    WHERE b.id = briefing_responses.briefing_id
    AND b.magic_link_token IS NOT NULL 
    AND b.magic_link_expires_at > now()
));

-- Briefing Video Items External Access
DROP POLICY IF EXISTS "External access to briefing video items" ON public.briefing_video_items;
CREATE POLICY "External access to briefing video items" 
ON public.briefing_video_items FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.briefings b
    WHERE b.id = briefing_video_items.briefing_id
    AND b.magic_link_token IS NOT NULL 
    AND b.magic_link_expires_at > now()
));
