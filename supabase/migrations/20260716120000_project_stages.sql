-- =====================================================
-- ETAPAS DE PROJETO (PROJECT_STAGES)
-- Adiciona hierarquia Projeto → Etapa → Tarefa
-- Todas as alterações são ADITIVAS (não quebram dados existentes)
-- =====================================================

-- 1. Nova tabela project_stages
CREATE TABLE IF NOT EXISTS public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  sla_days INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON public.project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_workspace_id ON public.project_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_order ON public.project_stages(project_id, order_index);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Users can insert own project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Users can update own project_stages" ON public.project_stages;
DROP POLICY IF EXISTS "Users can delete own project_stages" ON public.project_stages;

CREATE POLICY "Users can view own project_stages" ON public.project_stages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project_stages" ON public.project_stages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project_stages" ON public.project_stages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project_stages" ON public.project_stages
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Adicionar colunas em project_tasks (FK opcional para não quebrar dados existentes)
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_tasks_stage_id ON public.project_tasks(stage_id);

-- 3. Adicionar coluna current_stage_id em projects (qual etapa está ativa)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS current_stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL;

-- 4. Adicionar template padrão em project_categories
ALTER TABLE public.project_categories
  ADD COLUMN IF NOT EXISTS default_stage_template TEXT;

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS update_project_stages_updated_at ON public.project_stages;
CREATE TRIGGER update_project_stages_updated_at
  BEFORE UPDATE ON public.project_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Realtime
ALTER TABLE public.project_stages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_stages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_stages;
  END IF;
END $$;

-- 7. View: project_overview_with_stages (para UI do gestor ver saúde por etapa)
CREATE OR REPLACE VIEW public.project_stages_overview AS
SELECT
  ps.id,
  ps.user_id,
  ps.workspace_id,
  ps.project_id,
  ps.name,
  ps.status,
  ps.order_index,
  ps.icon,
  ps.color,
  ps.sla_days,
  ps.deadline,
  ps.started_at,
  ps.completed_at,
  ps.assigned_to,
  ps.notes,
  ps.template_id,
  ps.created_at,
  ps.updated_at,
  p.deadline AS project_deadline,
  p.project AS project_name,
  p.status AS project_status,
  p.priority AS project_priority,
  (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.stage_id = ps.id) AS total_tasks,
  (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.stage_id = ps.id AND pt.status = 'done') AS done_tasks,
  (SELECT COUNT(*) FROM public.project_tasks pt WHERE pt.stage_id = ps.id AND pt.deadline < CURRENT_DATE AND pt.status != 'done') AS overdue_tasks,
  CASE
    WHEN ps.deadline < CURRENT_DATE AND ps.status != 'done' THEN true
    ELSE false
  END AS is_overdue
FROM public.project_stages ps
LEFT JOIN public.projects p ON ps.project_id = p.id;

-- 8. Função: criar etapas padrão baseado em template
CREATE OR REPLACE FUNCTION public.create_default_stages_for_project(
  p_project_id UUID,
  p_template TEXT DEFAULT 'video'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_order INTEGER := 0;
  v_stage RECORD;
BEGIN
  -- Descobrir user_id e workspace_id do projeto
  SELECT user_id, workspace_id INTO v_user_id, v_workspace_id
  FROM public.projects WHERE id = p_project_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Template: VIDEO
  IF p_template = 'video' THEN
    INSERT INTO public.project_stages (user_id, workspace_id, project_id, name, icon, order_index, sla_days, template_id)
    VALUES
      (v_user_id, v_workspace_id, p_project_id, 'Briefing', 'ClipboardList', 0, 2, 'video'),
      (v_user_id, v_workspace_id, p_project_id, 'Roteiro', 'FileText', 1, 3, 'video'),
      (v_user_id, v_workspace_id, p_project_id, 'Captação', 'Video', 2, 5, 'video'),
      (v_user_id, v_workspace_id, p_project_id, 'Edição', 'Scissors', 3, 4, 'video'),
      (v_user_id, v_workspace_id, p_project_id, 'Entrega', 'Package', 4, 1, 'video');

  -- Template: DESIGN
  ELSIF p_template = 'design' THEN
    INSERT INTO public.project_stages (user_id, workspace_id, project_id, name, icon, order_index, sla_days, template_id)
    VALUES
      (v_user_id, v_workspace_id, p_project_id, 'Briefing', 'ClipboardList', 0, 2, 'design'),
      (v_user_id, v_workspace_id, p_project_id, 'Pesquisa', 'Search', 1, 2, 'design'),
      (v_user_id, v_workspace_id, p_project_id, 'Criação', 'Palette', 2, 5, 'design'),
      (v_user_id, v_workspace_id, p_project_id, 'Revisão', 'RefreshCw', 3, 2, 'design'),
      (v_user_id, v_workspace_id, p_project_id, 'Entrega', 'Package', 4, 1, 'design');

  -- Template: MOTION
  ELSIF p_template = 'motion' THEN
    INSERT INTO public.project_stages (user_id, workspace_id, project_id, name, icon, order_index, sla_days, template_id)
    VALUES
      (v_user_id, v_workspace_id, p_project_id, 'Briefing', 'ClipboardList', 0, 2, 'motion'),
      (v_user_id, v_workspace_id, p_project_id, 'Storyboard', 'Film', 1, 3, 'motion'),
      (v_user_id, v_workspace_id, p_project_id, 'Animação', 'Sparkles', 2, 7, 'motion'),
      (v_user_id, v_workspace_id, p_project_id, 'Revisão', 'RefreshCw', 3, 2, 'motion'),
      (v_user_id, v_workspace_id, p_project_id, 'Entrega', 'Package', 4, 1, 'motion');

  -- Template: OUTROS (genérico)
  ELSE
    INSERT INTO public.project_stages (user_id, workspace_id, project_id, name, icon, order_index, sla_days, template_id)
    VALUES
      (v_user_id, v_workspace_id, p_project_id, 'Planejamento', 'ClipboardList', 0, 2, 'outros'),
      (v_user_id, v_workspace_id, p_project_id, 'Execução', 'PlayCircle', 1, 5, 'outros'),
      (v_user_id, v_workspace_id, p_project_id, 'Revisão', 'RefreshCw', 2, 2, 'outros'),
      (v_user_id, v_workspace_id, p_project_id, 'Entrega', 'Package', 3, 1, 'outros');
  END IF;

  -- Atualizar current_stage_id do projeto para a primeira etapa
  UPDATE public.projects
  SET current_stage_id = (
    SELECT id FROM public.project_stages
    WHERE project_id = p_project_id
    ORDER BY order_index ASC
    LIMIT 1
  )
  WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_default_stages_for_project(UUID, TEXT) TO authenticated;