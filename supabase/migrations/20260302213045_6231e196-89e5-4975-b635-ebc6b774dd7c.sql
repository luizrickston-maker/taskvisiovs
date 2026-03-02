
-- Tabela 2.4: process_instances
CREATE TABLE public.process_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.process_instances ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace members OR assigned user
CREATE POLICY "pi_select_workspace" ON public.process_instances
  FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE POLICY "pi_select_assigned" ON public.process_instances
  FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid());

-- INSERT/UPDATE/DELETE: workspace members only
CREATE POLICY "pi_insert" ON public.process_instances
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "pi_update" ON public.process_instances
  FOR UPDATE TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE POLICY "pi_delete" ON public.process_instances
  FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id());

-- Index & trigger
CREATE INDEX idx_process_instances_process ON public.process_instances(process_id);
CREATE INDEX idx_process_instances_workspace ON public.process_instances(workspace_id);

CREATE TRIGGER update_process_instances_updated_at
  BEFORE UPDATE ON public.process_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
