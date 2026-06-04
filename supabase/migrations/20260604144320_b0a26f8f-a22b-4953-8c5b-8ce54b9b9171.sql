
DO $$ 
BEGIN
    -- has_role(UUID, app_role)
    BEGIN
        REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
        REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'has_role failed: %', SQLERRM;
    END;

    -- create_workspace_for_user(UUID, text, text)
    BEGIN
        REVOKE ALL ON FUNCTION public.create_workspace_for_user(UUID, text, text) FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.create_workspace_for_user(UUID, text, text) FROM anon;
        REVOKE ALL ON FUNCTION public.create_workspace_for_user(UUID, text, text) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(UUID, text, text) TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'create_workspace_for_user failed: %', SQLERRM;
    END;

    -- get_client_portal_info()
    BEGIN
        REVOKE ALL ON FUNCTION public.get_client_portal_info() FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.get_client_portal_info() FROM anon;
        REVOKE ALL ON FUNCTION public.get_client_portal_info() FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.get_client_portal_info() TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'get_client_portal_info failed: %', SQLERRM;
    END;

    -- get_my_client_id(UUID)
    BEGIN
        REVOKE ALL ON FUNCTION public.get_my_client_id(UUID) FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.get_my_client_id(UUID) FROM anon;
        REVOKE ALL ON FUNCTION public.get_my_client_id(UUID) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.get_my_client_id(UUID) TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'get_my_client_id failed: %', SQLERRM;
    END;

    -- has_workspace_access(UUID)
    BEGIN
        REVOKE ALL ON FUNCTION public.has_workspace_access(UUID) FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.has_workspace_access(UUID) FROM anon;
        REVOKE ALL ON FUNCTION public.has_workspace_access(UUID) FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.has_workspace_access(UUID) TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'has_workspace_access failed: %', SQLERRM;
    END;

    -- create_default_ai_agent()
    BEGIN
        REVOKE ALL ON FUNCTION public.create_default_ai_agent() FROM PUBLIC;
        REVOKE ALL ON FUNCTION public.create_default_ai_agent() FROM anon;
        REVOKE ALL ON FUNCTION public.create_default_ai_agent() FROM authenticated;
        GRANT EXECUTE ON FUNCTION public.create_default_ai_agent() TO authenticated, service_role;
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'create_default_ai_agent failed: %', SQLERRM;
    END;

END $$;
