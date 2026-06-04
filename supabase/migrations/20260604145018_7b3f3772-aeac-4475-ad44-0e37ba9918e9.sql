-- Enable RLS on portal_short_links
ALTER TABLE public.portal_short_links ENABLE ROW LEVEL SECURITY;

-- Add policies for portal_short_links
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portal_short_links' AND policyname = 'Authenticated users can view short links') THEN
        CREATE POLICY "Authenticated users can view short links" ON public.portal_short_links
            FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portal_short_links' AND policyname = 'Service role can manage short links') THEN
        CREATE POLICY "Service role can manage short links" ON public.portal_short_links
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Grant permissions to portal_short_links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_short_links TO service_role;
GRANT SELECT ON public.portal_short_links TO authenticated;

-- Revoke EXECUTE from PUBLIC/anon for sensitive helper functions
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_personal_360_summary(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_personal_360_summary(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_client_user(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_client_user(uuid, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_my_client_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_client_id(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_my_workspace_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_workspace_id() FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_workspace_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_workspace_access(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;

-- Ensure magic link functions are explicitly granted to appropriate roles
GRANT EXECUTE ON FUNCTION public.get_video_briefing_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_briefing_by_token(text, jsonb, jsonb, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_briefing_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_video_briefing_by_token(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(text) TO anon, authenticated, service_role;
