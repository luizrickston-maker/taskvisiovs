-- =====================================================
-- Cobrança de clientes (Fase 1): modelo de dados.
-- Cria cobranças por cliente, integra com InfinitePay (link de pagamento) e
-- prepara o terreno para alertas (agendador) e baixa automática (webhook).
-- Tudo aditivo — não altera nenhum fluxo existente.
-- =====================================================

-- 1) Configurações de cobrança por workspace (handle InfinitePay + cadência padrão).
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS billing_handle text,
  ADD COLUMN IF NOT EXISTS billing_alert_days_before int[] NOT NULL DEFAULT '{3,1}',
  ADD COLUMN IF NOT EXISTS billing_overdue_every_days int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS billing_overdue_max int NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.workspaces.billing_handle IS
  'InfiniteTag do InfinitePay (sem o $). Usado para gerar links de pagamento.';

-- 2) Cobranças.
CREATE TABLE IF NOT EXISTS public.client_charges (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  descricao          text NOT NULL,
  valor              numeric(15,2) NOT NULL CHECK (valor > 0),
  due_date           date NOT NULL,
  status             text NOT NULL DEFAULT 'pendente'
                       CHECK (status IN ('pendente','pago','vencido','cancelado')),
  recorrente         boolean NOT NULL DEFAULT false,
  frequencia         text CHECK (frequencia IN ('mensal','trimestral','semestral','anual')),
  -- Sobrescreve a cadência do workspace quando não nulo.
  alert_days_before  int[],
  overdue_every_days int,
  overdue_max        int,
  -- InfinitePay.
  payment_link       text,
  invoice_slug       text,
  external_ref       text,            -- order_nsu (usamos o próprio id da cobrança)
  -- Pagamento / reconciliação.
  paid_at            timestamptz,
  paid_amount        numeric(15,2),
  receipt_url        text,
  caixa_transacao_id uuid,            -- entrada lançada no caixa ao pagar
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_charges_workspace  ON public.client_charges(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_charges_client     ON public.client_charges(client_id);
CREATE INDEX IF NOT EXISTS idx_client_charges_status_due ON public.client_charges(status, due_date);

ALTER TABLE public.client_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members manage client_charges"
  ON public.client_charges FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- 3) Log de eventos (notificações enviadas + reconciliação). Só service_role.
--    UNIQUE garante idempotência (não envia o mesmo alerta 2x no mesmo ciclo).
CREATE TABLE IF NOT EXISTS public.client_charge_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id  uuid NOT NULL REFERENCES public.client_charges(id) ON DELETE CASCADE,
  kind       text NOT NULL,           -- link_criado | lembrete | cobranca | atraso | pago
  reference  text NOT NULL,           -- 'criacao' | 'D-3' | 'D0' | 'D+3' | 'webhook' ...
  status     text,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charge_id, kind, reference)
);
ALTER TABLE public.client_charge_events ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Functions) escreve/lê.

-- 4) updated_at automático.
CREATE OR REPLACE FUNCTION public.touch_client_charges_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_client_charges_updated_at ON public.client_charges;
CREATE TRIGGER trg_client_charges_updated_at
  BEFORE UPDATE ON public.client_charges
  FOR EACH ROW EXECUTE FUNCTION public.touch_client_charges_updated_at();

-- =====================================================
-- LEMBRETE (rodar manualmente após aplicar): defina seu handle InfinitePay.
--   UPDATE public.workspaces SET billing_handle = 'chapadadigital'
--   WHERE id = 'c0b994ce-8308-4e55-a616-8ca0230c66da';
-- =====================================================