
-- Create get_user_workspace_id() as the standard function name
-- Returns the workspace_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
