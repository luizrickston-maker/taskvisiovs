-- Add client_id to editorial_calendar_items for per-client isolation
ALTER TABLE public.editorial_calendar_items
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_items_client_id
  ON public.editorial_calendar_items(client_id);

-- Update the RLS policy for client portal users to filter by their specific client_id
-- (drop existing permissive policy and replace with stricter one)
DROP POLICY IF EXISTS "Client users can view workspace editorial items" ON public.editorial_calendar_items;

CREATE POLICY "Client users can view their client editorial items"
  ON public.editorial_calendar_items
  FOR SELECT
  USING (
    is_client_user(workspace_id, auth.uid())
    AND client_id = get_my_client_id(workspace_id)
  );