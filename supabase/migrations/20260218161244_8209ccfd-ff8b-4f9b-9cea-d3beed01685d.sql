
-- Complete multi-tenant schema migration
-- Note: super_admin enum value was already added in a previous migration

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Helper function: is_super_admin (uses text cast to avoid enum commit issues)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_admin'
  )
$$;

-- Helper function: get_my_workspace_id
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
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

-- Helper function: is_workspace_member
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

-- Helper function: is_workspace_admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role IN ('owner', 'admin')
  )
$$;

-- RLS Policies for workspaces
CREATE POLICY "Members can view their workspace"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can update their workspace"
  ON public.workspaces FOR UPDATE
  USING (owner_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can create their own workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete workspaces"
  ON public.workspaces FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for workspace_members
CREATE POLICY "Members can view their workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can join as owner on workspace creation"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid()) 
    OR public.is_super_admin(auth.uid()) 
    OR auth.uid() = user_id
  );

CREATE POLICY "Workspace admins can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()) OR public.is_super_admin(auth.uid()));

-- Auto-update updated_at trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create workspace for a user (called from application code)
CREATE OR REPLACE FUNCTION public.create_workspace_for_user(_user_id UUID, _email TEXT, _full_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  workspace_name TEXT;
BEGIN
  workspace_name := COALESCE(_full_name, split_part(_email, '@', 1), 'Meu Workspace');
  
  INSERT INTO public.workspaces (owner_user_id, name)
  VALUES (_user_id, workspace_name)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, _user_id, 'owner');

  RETURN new_workspace_id;
END;
$$;
