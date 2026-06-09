-- =====================================================
-- PJ Caixa: Transações de Caixa e Contas a Pagar
-- =====================================================

-- Tabela de categorias de caixa PJ
CREATE TABLE IF NOT EXISTS public.pj_caixa_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ambos')),
  cor text NOT NULL DEFAULT '#6b7280',
  icone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela principal de transações do caixa PJ
CREATE TABLE IF NOT EXISTS public.pj_caixa_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao text NOT NULL,
  valor numeric(15,2) NOT NULL CHECK (valor > 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  origem_destino text,
  categoria_id uuid REFERENCES public.pj_caixa_categorias(id) ON DELETE SET NULL,
  forma_pagamento text CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'transferencia', 'dinheiro', 'cheque', 'outro')),
  observacoes text,
  referencia text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de contas a pagar PJ
CREATE TABLE IF NOT EXISTS public.pj_contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  fornecedor text,
  valor numeric(15,2) NOT NULL CHECK (valor > 0),
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  categoria_id uuid REFERENCES public.pj_caixa_categorias(id) ON DELETE SET NULL,
  forma_pagamento text CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'transferencia', 'dinheiro', 'cheque', 'outro')),
  recorrente boolean NOT NULL DEFAULT false,
  frequencia text CHECK (frequencia IN ('mensal', 'trimestral', 'semestral', 'anual')),
  observacoes text,
  comprovante_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_workspace ON public.pj_caixa_transacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_data ON public.pj_caixa_transacoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_tipo ON public.pj_caixa_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_workspace ON public.pj_contas_pagar(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_vencimento ON public.pj_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_status ON public.pj_contas_pagar(status);

-- RLS
ALTER TABLE public.pj_caixa_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_caixa_transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: membros do workspace têm acesso
CREATE POLICY "Workspace members can manage caixa categorias"
  ON public.pj_caixa_categorias FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can manage caixa transacoes"
  ON public.pj_caixa_transacoes FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

CREATE POLICY "Workspace members can manage contas pagar"
  ON public.pj_contas_pagar FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_pj_caixa_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pj_caixa_transacoes_updated_at
  BEFORE UPDATE ON public.pj_caixa_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_pj_caixa_updated_at();

CREATE TRIGGER trg_pj_contas_pagar_updated_at
  BEFORE UPDATE ON public.pj_contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.update_pj_caixa_updated_at();

-- Função para atualizar status de contas vencidas automaticamente
CREATE OR REPLACE FUNCTION public.update_contas_pagar_vencidas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.pj_contas_pagar
  SET status = 'vencido', updated_at = now()
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$;
