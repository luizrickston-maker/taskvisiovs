-- =====================================================
-- Rateio de recebimentos de clientes (metodologia de gestão).
-- Ao receber um pagamento de cliente (via infinitepay-webhook), o valor é
-- dividido em fatias (%) destinadas a "bancos"/finalidades, para o gestor saber
-- quanto transferir para cada conta. NÃO move dinheiro — apenas planeja/rastreia.
-- Aplica-se SOMENTE a pagamentos de clientes (webhook), não a outras entradas.
-- Tudo aditivo.
-- =====================================================

-- 1) Regra de rateio (editável). Soma dos percentuais deve dar 100.
CREATE TABLE IF NOT EXISTS public.caixa_allocation_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label        text NOT NULL,               -- ex: Salário
  percent      numeric(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  destino      text NOT NULL,               -- ex: PicPay PF
  sort         int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caixa_allocation_rules_ws ON public.caixa_allocation_rules(workspace_id);
ALTER TABLE public.caixa_allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members manage allocation_rules"
  ON public.caixa_allocation_rules FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- 2) Distribuição gerada por pagamento (uma linha por fatia).
CREATE TABLE IF NOT EXISTS public.caixa_allocations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  charge_id           uuid,                  -- cobrança de origem (client_charges)
  source_transacao_id uuid,                  -- entrada no caixa correspondente
  label               text NOT NULL,
  destino             text NOT NULL,
  valor               numeric(15,2) NOT NULL,
  transferido         boolean NOT NULL DEFAULT false,
  transferido_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_caixa_allocations_ws ON public.caixa_allocations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_caixa_allocations_transf ON public.caixa_allocations(workspace_id, transferido);
ALTER TABLE public.caixa_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members manage allocations"
  ON public.caixa_allocations FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- 3) Semeia a regra padrão (70/20/10) para workspaces sem regra.
INSERT INTO public.caixa_allocation_rules (workspace_id, label, percent, destino, sort)
SELECT w.id, x.label, x.percent, x.destino, x.sort
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Salário',        70, 'PicPay PF',    1),
  ('Dívidas/Contas', 20, 'Mercado Pago', 2),
  ('Guardar',        10, 'PicPay PJ',    3)
) AS x(label, percent, destino, sort)
WHERE NOT EXISTS (SELECT 1 FROM public.caixa_allocation_rules r WHERE r.workspace_id = w.id);