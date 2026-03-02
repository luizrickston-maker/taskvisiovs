
-- =============================================
-- MÓDULO DE PROCESSOS - Canvas de Operações
-- =============================================

-- Tabela principal: Processos
CREATE TABLE public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'geral',
  icon TEXT DEFAULT 'workflow',
  color TEXT DEFAULT '#6366f1',
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de etapas do processo
CREATE TABLE public.process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL DEFAULT 'action', -- action, decision, start, end, milestone
  responsible_team_member_id UUID REFERENCES public.corporate_team(id) ON DELETE SET NULL,
  estimated_duration_minutes INTEGER,
  checklist JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conexões entre etapas (para o canvas visual)
CREATE TABLE public.process_step_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  to_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
  label TEXT,
  condition TEXT, -- para decisões: "Sim", "Não", etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vínculo de processos com produtos/serviços/projetos
CREATE TABLE public.process_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL, -- 'product', 'service', 'project'
  link_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(process_id, link_type, link_id)
);

-- Índices para performance
CREATE INDEX idx_processes_workspace ON public.processes(workspace_id);
CREATE INDEX idx_processes_user ON public.processes(user_id);
CREATE INDEX idx_process_steps_process ON public.process_steps(process_id);
CREATE INDEX idx_process_steps_order ON public.process_steps(process_id, step_order);
CREATE INDEX idx_process_step_connections_process ON public.process_step_connections(process_id);
CREATE INDEX idx_process_links_process ON public.process_links(process_id);
CREATE INDEX idx_process_links_target ON public.process_links(link_type, link_id);

-- =============================================
-- RLS - Row Level Security
-- =============================================

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_step_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_links ENABLE ROW LEVEL SECURITY;

-- PROCESSES policies
CREATE POLICY "processes_select" ON public.processes FOR SELECT
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "processes_insert" ON public.processes FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "processes_update" ON public.processes FOR UPDATE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "processes_delete" ON public.processes FOR DELETE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

-- PROCESS_STEPS policies
CREATE POLICY "process_steps_select" ON public.process_steps FOR SELECT
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_steps_insert" ON public.process_steps FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_steps_update" ON public.process_steps FOR UPDATE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_steps_delete" ON public.process_steps FOR DELETE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

-- PROCESS_STEP_CONNECTIONS policies
CREATE POLICY "process_step_connections_select" ON public.process_step_connections FOR SELECT
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_step_connections_insert" ON public.process_step_connections FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_step_connections_update" ON public.process_step_connections FOR UPDATE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_step_connections_delete" ON public.process_step_connections FOR DELETE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

-- PROCESS_LINKS policies
CREATE POLICY "process_links_select" ON public.process_links FOR SELECT
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_links_insert" ON public.process_links FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_links_update" ON public.process_links FOR UPDATE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

CREATE POLICY "process_links_delete" ON public.process_links FOR DELETE
  USING ((auth.uid() = user_id) AND has_workspace_access(workspace_id));

-- Trigger para updated_at automático
CREATE TRIGGER update_processes_updated_at
  BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_steps_updated_at
  BEFORE UPDATE ON public.process_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
