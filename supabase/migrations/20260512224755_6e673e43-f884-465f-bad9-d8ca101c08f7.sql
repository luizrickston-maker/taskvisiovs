-- Security hardening for public schema functions
-- Revokes public execution and ensures only authenticated users can call these functions

-- create_default_categories()
REVOKE EXECUTE ON FUNCTION public.create_default_categories() FROM public;
GRANT EXECUTE ON FUNCTION public.create_default_categories() TO authenticated;
ALTER FUNCTION public.create_default_categories() SET search_path = public;

-- create_workspace_for_user(uuid, text, text)
REVOKE EXECUTE ON FUNCTION public.create_workspace_for_user(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(UUID, TEXT, TEXT) TO authenticated;
ALTER FUNCTION public.create_workspace_for_user(UUID, TEXT, TEXT) SET search_path = public;

-- get_client_portal_info()
REVOKE EXECUTE ON FUNCTION public.get_client_portal_info() FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_portal_info() TO authenticated;
ALTER FUNCTION public.get_client_portal_info() SET search_path = public;

-- get_my_client_id(uuid)
REVOKE EXECUTE ON FUNCTION public.get_my_client_id(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_client_id(UUID) TO authenticated;
ALTER FUNCTION public.get_my_client_id(UUID) SET search_path = public;

-- get_my_workspace_id()
REVOKE EXECUTE ON FUNCTION public.get_my_workspace_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_workspace_id() TO authenticated;
ALTER FUNCTION public.get_my_workspace_id() SET search_path = public;

-- get_personal_360_summary(uuid)
REVOKE EXECUTE ON FUNCTION public.get_personal_360_summary(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_personal_360_summary(UUID) TO authenticated;
ALTER FUNCTION public.get_personal_360_summary(UUID) SET search_path = public;

-- get_user_360_summary(uuid)
REVOKE EXECUTE ON FUNCTION public.get_user_360_summary(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_360_summary(UUID) TO authenticated;
ALTER FUNCTION public.get_user_360_summary(UUID) SET search_path = public;

-- get_user_workspace_id()
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_id() TO authenticated;
ALTER FUNCTION public.get_user_workspace_id() SET search_path = public;

-- get_workspace_id_for_user(uuid)
REVOKE EXECUTE ON FUNCTION public.get_workspace_id_for_user(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_workspace_id_for_user(UUID) TO authenticated;
ALTER FUNCTION public.get_workspace_id_for_user(UUID) SET search_path = public;

-- has_role(uuid, app_role)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
ALTER FUNCTION public.has_role(UUID, app_role) SET search_path = public;

-- has_workspace_access(uuid)
REVOKE EXECUTE ON FUNCTION public.has_workspace_access(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.has_workspace_access(UUID) TO authenticated;
ALTER FUNCTION public.has_workspace_access(UUID) SET search_path = public;

-- is_client_user(uuid, uuid)
REVOKE EXECUTE ON FUNCTION public.is_client_user(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_client_user(UUID, UUID) TO authenticated;
ALTER FUNCTION public.is_client_user(UUID, UUID) SET search_path = public;

-- is_super_admin(uuid)
REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
ALTER FUNCTION public.is_super_admin(UUID) SET search_path = public;

-- is_workspace_admin(uuid, uuid)
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) TO authenticated;
ALTER FUNCTION public.is_workspace_admin(UUID, UUID) SET search_path = public;

-- is_workspace_member(uuid, uuid)
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
ALTER FUNCTION public.is_workspace_member(UUID, UUID) SET search_path = public;

-- update_updated_at_column()
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;