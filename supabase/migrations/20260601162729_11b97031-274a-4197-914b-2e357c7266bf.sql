
-- 1) Backfill NULL workspace_id where the row's user_id has a workspace membership
UPDATE public.project_tasks pt
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE pt.workspace_id IS NULL AND wm.user_id = pt.user_id;

UPDATE public.projects p
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE p.workspace_id IS NULL AND wm.user_id = p.user_id;

UPDATE public.editorial_calendar_items e
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE e.workspace_id IS NULL AND wm.user_id = e.user_id;

-- 2) Remove the NULL bypass from has_workspace_access
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _workspace_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
      )
    )
$function$;

-- 3) Lock down portal_short_links and add an RPC for safe resolution
DROP POLICY IF EXISTS "Anyone can read short links" ON public.portal_short_links;

CREATE OR REPLACE FUNCTION public.resolve_short_link(_code text)
RETURNS TABLE(target_url text, expires_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT target_url, expires_at
  FROM public.portal_short_links
  WHERE code = _code
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_short_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(text) TO anon, authenticated;
