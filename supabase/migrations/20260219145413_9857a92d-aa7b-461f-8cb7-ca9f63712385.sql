
-- Add content_link field for managers to share the actual content
ALTER TABLE public.editorial_calendar_items
  ADD COLUMN IF NOT EXISTS content_link text NULL;

-- Add client approval status and adjustment notes
ALTER TABLE public.editorial_calendar_items
  ADD COLUMN IF NOT EXISTS client_approval_status text NULL DEFAULT 'pending'
    CHECK (client_approval_status IN ('pending', 'approved', 'adjustment_requested'));

ALTER TABLE public.editorial_calendar_items
  ADD COLUMN IF NOT EXISTS client_adjustment_notes text NULL;

ALTER TABLE public.editorial_calendar_items
  ADD COLUMN IF NOT EXISTS client_reviewed_at timestamp with time zone NULL;

-- Allow client portal users to UPDATE only the approval fields on their own items
CREATE POLICY "Client users can update approval on their items"
  ON public.editorial_calendar_items
  FOR UPDATE
  USING (
    is_client_user(workspace_id, auth.uid())
    AND client_id = get_my_client_id(workspace_id)
  )
  WITH CHECK (
    is_client_user(workspace_id, auth.uid())
    AND client_id = get_my_client_id(workspace_id)
  );
