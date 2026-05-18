-- Create a helper function to get the current user's workspace_id safely
CREATE OR REPLACE FUNCTION public.get_user_workspace_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Create public.briefings table if it doesn't exist
-- Note: We are migrating from the previous briefing_responses to this unified briefings structure
CREATE TABLE IF NOT EXISTS public.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'pending_fill', 'in_review', 'approved', 'rejected'
    assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    external_filler_email TEXT,
    magic_link_token TEXT,
    magic_link_expires_at TIMESTAMPTZ,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if any to avoid duplicates during migration
DROP POLICY IF EXISTS "Workspaces can view their briefings" ON public.briefings;
DROP POLICY IF EXISTS "Assigned user can view their briefings" ON public.briefings;
DROP POLICY IF EXISTS "External filler can view their briefing via magic link" ON public.briefings;
DROP POLICY IF EXISTS "Workspaces can manage their briefings" ON public.briefings;
DROP POLICY IF EXISTS "External filler can update their briefing via magic link" ON public.briefings;

-- Create Policies
CREATE POLICY "Workspaces can view their briefings" ON public.briefings
FOR SELECT USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Assigned user can view their briefings" ON public.briefings
FOR SELECT USING (assigned_to_user_id = auth.uid());

-- Allow external access via magic link for SELECT
CREATE POLICY "External filler can view their briefing via magic link" ON public.briefings
FOR SELECT USING (
    magic_link_token IS NOT NULL 
    AND magic_link_expires_at > now()
);

-- Manage for authenticated workspace users
CREATE POLICY "Workspaces can manage their briefings" ON public.briefings
FOR ALL TO authenticated USING (workspace_id = get_user_workspace_id());

-- Allow external filler to UPDATE (fill) the briefing
CREATE POLICY "External filler can update their briefing via magic link" ON public.briefings
FOR UPDATE USING (
    magic_link_token IS NOT NULL 
    AND magic_link_expires_at > now()
) WITH CHECK (
    magic_link_token IS NOT NULL 
    AND magic_link_expires_at > now()
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_briefings_updated_at
BEFORE UPDATE ON public.briefings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
