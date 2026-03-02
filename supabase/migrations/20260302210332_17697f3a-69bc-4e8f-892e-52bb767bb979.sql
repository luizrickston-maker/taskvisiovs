
-- Drop old process_steps table (linked to old 'processes' table)
DROP TABLE IF EXISTS public.process_steps CASCADE;

-- Tabela 2.2: process_steps (linked to business_processes)
CREATE TABLE public.process_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES public.business_processes(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_time TEXT,
    responsible_role TEXT,
    support_links JSONB,
    node_type TEXT DEFAULT 'default',
    icon TEXT,
    color_scheme TEXT,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select" ON public.process_steps
  FOR SELECT TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "ps_insert" ON public.process_steps
  FOR INSERT TO authenticated
  WITH CHECK (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "ps_update" ON public.process_steps
  FOR UPDATE TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE POLICY "ps_delete" ON public.process_steps
  FOR DELETE TO authenticated
  USING (process_id IN (SELECT id FROM public.business_processes WHERE workspace_id = get_user_workspace_id()));

CREATE INDEX idx_process_steps_process ON public.process_steps(process_id);

CREATE TRIGGER update_process_steps_updated_at
  BEFORE UPDATE ON public.process_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
