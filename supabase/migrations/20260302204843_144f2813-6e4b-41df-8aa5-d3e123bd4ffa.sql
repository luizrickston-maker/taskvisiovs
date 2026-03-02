
-- Tabela 2.1: business_processes
CREATE TABLE public.business_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    related_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_select" ON public.business_processes
  FOR SELECT TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE POLICY "bp_insert" ON public.business_processes
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id = get_user_workspace_id());

CREATE POLICY "bp_update" ON public.business_processes
  FOR UPDATE TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE POLICY "bp_delete" ON public.business_processes
  FOR DELETE TO authenticated
  USING (workspace_id = get_user_workspace_id());

CREATE INDEX idx_business_processes_workspace ON public.business_processes(workspace_id);

CREATE TRIGGER update_business_processes_updated_at
  BEFORE UPDATE ON public.business_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
