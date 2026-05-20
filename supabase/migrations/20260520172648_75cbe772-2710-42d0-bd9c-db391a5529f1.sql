-- 1. Garantir que a função get_user_workspace_id exista e esteja atualizada
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

-- 2. Configurar RLS para a tabela 'clients'
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Workspace admins can delete clients" ON public.clients;

CREATE POLICY "Workspace members can view clients" 
ON public.clients FOR SELECT 
USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can insert clients" 
ON public.clients FOR INSERT 
WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can update clients" 
ON public.clients FOR UPDATE 
USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can delete clients" 
ON public.clients FOR DELETE 
USING (workspace_id = get_user_workspace_id());

-- 3. Configurar RLS para a tabela 'briefing_templates'
ALTER TABLE public.briefing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view templates of their workspace" ON public.briefing_templates;
DROP POLICY IF EXISTS "Users can insert templates in their workspace" ON public.briefing_templates;
DROP POLICY IF EXISTS "Users can update templates in their workspace" ON public.briefing_templates;
DROP POLICY IF EXISTS "Users can delete templates in their workspace" ON public.briefing_templates;

CREATE POLICY "Workspace members can view templates" 
ON public.briefing_templates FOR SELECT 
USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can insert templates" 
ON public.briefing_templates FOR INSERT 
WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can update templates" 
ON public.briefing_templates FOR UPDATE 
USING (workspace_id = get_user_workspace_id());

CREATE POLICY "Workspace members can delete templates" 
ON public.briefing_templates FOR DELETE 
USING (workspace_id = get_user_workspace_id());

-- 4. Configurar RLS para a tabela 'briefings'
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces can manage their briefings" ON public.briefings;
DROP POLICY IF EXISTS "Workspaces can view their briefings" ON public.briefings;
DROP POLICY IF EXISTS "Assigned user can view their briefings" ON public.briefings;
DROP POLICY IF EXISTS "External filler can view their briefing via magic link" ON public.briefings;
DROP POLICY IF EXISTS "External filler can update their briefing via magic link" ON public.briefings;

-- Política geral para membros do workspace
CREATE POLICY "Workspace members can manage briefings" 
ON public.briefings FOR ALL 
TO authenticated 
USING (workspace_id = get_user_workspace_id())
WITH CHECK (workspace_id = get_user_workspace_id());

-- Políticas para usuários externos (via link mágico)
CREATE POLICY "External access to view briefing" 
ON public.briefings FOR SELECT 
USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

CREATE POLICY "External access to update briefing" 
ON public.briefings FOR UPDATE 
USING (magic_link_token IS NOT NULL AND magic_link_expires_at > now())
WITH CHECK (magic_link_token IS NOT NULL AND magic_link_expires_at > now());

-- 5. Configurar RLS para 'briefing_responses'
ALTER TABLE public.briefing_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces can manage their briefing responses" ON public.briefing_responses;
DROP POLICY IF EXISTS "Workspaces can view their briefing responses" ON public.briefing_responses;
DROP POLICY IF EXISTS "Assigned user can view their briefing responses" ON public.briefing_responses;
DROP POLICY IF EXISTS "External filler can view their briefing responses via magic lin" ON public.briefing_responses;
DROP POLICY IF EXISTS "External filler can insert their briefing responses via magic l" ON public.briefing_responses;
DROP POLICY IF EXISTS "External filler can update their briefing responses via magic l" ON public.briefing_responses;

CREATE POLICY "Workspace members can manage briefing responses" 
ON public.briefing_responses FOR ALL 
TO authenticated 
USING (briefing_id IN (SELECT id FROM public.briefings WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "External access to briefing responses" 
ON public.briefing_responses FOR ALL 
USING (briefing_id IN (SELECT id FROM public.briefings WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()));

-- 6. Configurar RLS para 'briefing_video_items'
ALTER TABLE public.briefing_video_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces can manage their briefing video items" ON public.briefing_video_items;
DROP POLICY IF EXISTS "Workspaces can view their briefing video items" ON public.briefing_video_items;
DROP POLICY IF EXISTS "Assigned user can view their briefing video items" ON public.briefing_video_items;
DROP POLICY IF EXISTS "External filler can view their briefing video items via magic l" ON public.briefing_video_items;
DROP POLICY IF EXISTS "External filler can insert their briefing video items via magic" ON public.briefing_video_items;
DROP POLICY IF EXISTS "External filler can update their briefing video items via magic" ON public.briefing_video_items;

CREATE POLICY "Workspace members can manage briefing video items" 
ON public.briefing_video_items FOR ALL 
TO authenticated 
USING (briefing_id IN (SELECT id FROM public.briefings WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "External access to briefing video items" 
ON public.briefing_video_items FOR ALL 
USING (briefing_id IN (SELECT id FROM public.briefings WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()));