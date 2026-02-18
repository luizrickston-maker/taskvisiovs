
-- Add RLS policy so client_users can read editorial_calendar_items from their workspace
CREATE POLICY "Client users can view workspace editorial items"
ON public.editorial_calendar_items
FOR SELECT
USING (is_client_user(workspace_id, auth.uid()));

-- Add RLS policy so client_users can read client_projects from their workspace
-- (they can already view via is_client_user function)

-- Create a helper function to get client_id for the current user
CREATE OR REPLACE FUNCTION public.get_my_client_id(_workspace_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.client_users
  WHERE user_id = auth.uid()
    AND workspace_id = _workspace_id
    AND is_active = true
  LIMIT 1
$$;

-- Create a function to get portal info for logged-in client user
CREATE OR REPLACE FUNCTION public.get_client_portal_info()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'client_id', cu.client_id,
    'workspace_id', cu.workspace_id,
    'client_name', c.name,
    'client_company', c.company_name,
    'email', cu.email,
    'is_active', cu.is_active
  )
  FROM public.client_users cu
  JOIN public.clients c ON c.id = cu.client_id
  WHERE cu.user_id = auth.uid()
    AND cu.is_active = true
  LIMIT 1
$$;
