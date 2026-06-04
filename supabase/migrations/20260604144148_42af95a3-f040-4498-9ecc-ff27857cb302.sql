
-- 1. Revoke public execution on sensitive functions
-- We revoke from PUBLIC (which includes anon) and grant to authenticated/service_role where needed

DO $$ 
BEGIN
    -- Permission checks
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_client_user(UUID, UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_client_user(UUID, UUID) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_workspace_access(UUID, UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_workspace_access(UUID, UUID) TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_role(UUID, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(UUID, text) TO authenticated, service_role';

    -- Workspace & User Info
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_workspace_id() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_my_workspace_id() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_my_workspace_id() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_my_client_id() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_personal_360_summary(UUID) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_personal_360_summary(UUID) TO authenticated, service_role';

    -- Creation & Automation
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_workspace_for_user() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_workspace_for_user() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_default_ai_agent_for_user() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_default_ai_agent_for_user() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_default_categories() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_default_categories() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_workspace() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_workspace() TO authenticated, service_role';

    -- Notifications (Internal use)
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_briefing_notification() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_briefing_notification() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_video_briefing_notification() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_video_briefing_notification() TO authenticated, service_role';

    -- Business Logic
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.update_sales_goals_on_prospect_change() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_sales_goals_on_prospect_change() TO authenticated, service_role';

    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.revert_sales_goals_on_prospect_delete() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.revert_sales_goals_on_prospect_delete() TO authenticated, service_role';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some functions might have different signatures or already be restricted: %', SQLERRM;
END $$;

-- 2. Tighten storage policy for task-attachments
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can only view task attachments from their workspaces" ON storage.objects;

CREATE POLICY "Users can only view task attachments from their workspaces"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'task-attachments' 
    AND (
        -- Folder name is the workspace_id
        public.is_workspace_member(
            (storage.foldername(name))[1]::uuid, 
            auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can only upload task attachments to their workspaces" ON storage.objects;

CREATE POLICY "Users can only upload task attachments to their workspaces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-attachments' 
    AND (
        public.is_workspace_member(
            (storage.foldername(name))[1]::uuid, 
            auth.uid()
        )
    )
);
