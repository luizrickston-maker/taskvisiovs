
-- Drop old process_step_connections table
DROP TABLE IF EXISTS public.process_step_connections CASCADE;

-- Tabela 2.3: process_connections
CREATE TABLE public.process_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
    source_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
    target_step_id UUID NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
    label TEXT,
    connection_type TEXT DEFAULT 'default',
    animated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.process_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pc_select" ON public.process_connections
  FOR SELECT TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pc_insert" ON public.process_connections
  FOR INSERT TO authenticated
  WITH CHECK (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pc_update" ON public.process_connections
  FOR UPDATE TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "pc_delete" ON public.process_connections
  FOR DELETE TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE INDEX idx_process_connections_process ON public.process_connections(process_id);
