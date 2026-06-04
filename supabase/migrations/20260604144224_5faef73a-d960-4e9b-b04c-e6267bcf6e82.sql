
DO $$ 
DECLARE
    func_name text;
    func_sig text;
BEGIN
    -- List of functions to restrict (name, signature)
    -- Using a temporary table to store names and signatures for easier iteration
    CREATE TEMP TABLE funcs_to_restrict (name text, signature text);
    
    INSERT INTO funcs_to_restrict VALUES 
        ('is_super_admin', 'UUID'),
        ('is_client_user', 'UUID, UUID'),
        ('is_workspace_admin', 'UUID, UUID'),
        ('is_workspace_member', 'UUID, UUID'),
        ('has_workspace_access', 'UUID, UUID'),
        ('has_role', 'UUID, text'),
        ('get_user_workspace_id', ''),
        ('get_my_workspace_id', ''),
        ('get_my_client_id', ''),
        ('get_personal_360_summary', 'UUID'),
        ('create_workspace_for_user', ''),
        ('create_default_ai_agent_for_user', ''),
        ('create_default_categories', ''),
        ('handle_new_workspace', ''),
        ('handle_briefing_notification', ''),
        ('handle_video_briefing_notification', ''),
        ('update_sales_goals_on_prospect_change', ''),
        ('revert_sales_goals_on_prospect_delete', ''),
        ('get_workspace_id_for_user', 'UUID'),
        ('get_client_portal_info', 'UUID'),
        ('create_default_ai_agent', 'UUID');

    FOR func_name, func_sig IN SELECT name, signature FROM funcs_to_restrict
    LOOP
        BEGIN
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', func_name, func_sig);
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon', func_name, func_sig);
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated', func_name, func_sig);
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', func_name, func_sig);
            EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', func_name, func_sig);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not restrict function %: %', func_name, SQLERRM;
        END;
    END LOOP;
    
    DROP TABLE funcs_to_restrict;
END $$;
