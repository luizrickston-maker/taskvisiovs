-- Create client_contents table
CREATE TABLE public.client_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('video', 'photo', 'document', 'other')),
    title TEXT NOT NULL,
    drive_link TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contents ENABLE ROW LEVEL SECURITY;

-- Workspace members can view client contents of their workspace
CREATE POLICY "Workspace members can view client contents"
ON public.client_contents
FOR SELECT
USING (
    is_workspace_member(workspace_id, auth.uid())
    OR is_super_admin(auth.uid())
);

-- Client users can view their own client's contents
CREATE POLICY "Client users can view their client contents"
ON public.client_contents
FOR SELECT
USING (
    is_client_user(workspace_id, auth.uid())
    AND client_id = get_my_client_id(workspace_id)
);

-- Workspace admins can insert client contents
CREATE POLICY "Workspace admins can insert client contents"
ON public.client_contents
FOR INSERT
WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
    OR is_super_admin(auth.uid())
);

-- Workspace admins can update client contents
CREATE POLICY "Workspace admins can update client contents"
ON public.client_contents
FOR UPDATE
USING (
    is_workspace_admin(workspace_id, auth.uid())
    OR is_super_admin(auth.uid())
);

-- Workspace admins can delete client contents
CREATE POLICY "Workspace admins can delete client contents"
ON public.client_contents
FOR DELETE
USING (
    is_workspace_admin(workspace_id, auth.uid())
    OR is_super_admin(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_client_contents_updated_at
    BEFORE UPDATE ON public.client_contents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contents;