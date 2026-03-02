
-- Tabela 2.5: process_instance_steps
CREATE TABLE public.process_instance_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_instance_id UUID NOT NULL REFERENCES public.process_instances(id) ON DELETE CASCADE,
    process_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.process_instance_steps ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace members OR assigned user
CREATE POLICY "pis_select_workspace" ON public.process_instance_steps
  FOR SELECT TO authenticated
  USING (process_instance_id IN (SELECT id FROM public.process_instances WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pis_select_assigned" ON public.process_instance_steps
  FOR SELECT TO authenticated
  USING (process_instance_id IN (SELECT id FROM public.process_instances WHERE assigned_to_user_id = auth.uid()));

-- INSERT/UPDATE/DELETE: workspace members only
CREATE POLICY "pis_insert" ON public.process_instance_steps
  FOR INSERT TO authenticated
  WITH CHECK (process_instance_id IN (SELECT id FROM public.process_instances WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pis_update" ON public.process_instance_steps
  FOR UPDATE TO authenticated
  USING (process_instance_id IN (SELECT id FROM public.process_instances WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pis_delete" ON public.process_instance_steps
  FOR DELETE TO authenticated
  USING (process_instance_id IN (SELECT id FROM public.process_instances WHERE workspace_id = get_user_workspace_id()));

-- Index & trigger
CREATE INDEX idx_pis_instance ON public.process_instance_steps(process_instance_id);

CREATE TRIGGER update_process_instance_steps_updated_at
  BEFORE UPDATE ON public.process_instance_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
