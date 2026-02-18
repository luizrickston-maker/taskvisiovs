
-- Create clients table (linked to workspaces)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_users table (portal logins for clients)
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a client portal user in a workspace
CREATE OR REPLACE FUNCTION public.is_client_user(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_users
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND is_active = true
  )
$$;

-- RLS Policies for clients
-- Workspace members can view their workspace's clients
CREATE POLICY "Workspace members can view clients"
  ON public.clients FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Workspace admins can insert clients
CREATE POLICY "Workspace admins can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Workspace admins can update clients
CREATE POLICY "Workspace admins can update clients"
  ON public.clients FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Workspace admins can delete clients
CREATE POLICY "Workspace admins can delete clients"
  ON public.clients FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- RLS Policies for client_users
-- Workspace members can view client portal users
CREATE POLICY "Workspace members can view client users"
  ON public.client_users FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()) OR user_id = auth.uid());

-- Workspace admins can insert client portal users
CREATE POLICY "Workspace admins can insert client users"
  ON public.client_users FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Workspace admins can update client portal users
CREATE POLICY "Workspace admins can update client users"
  ON public.client_users FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Workspace admins can delete client portal users
CREATE POLICY "Workspace admins can delete client users"
  ON public.client_users FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Auto-update updated_at triggers
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
