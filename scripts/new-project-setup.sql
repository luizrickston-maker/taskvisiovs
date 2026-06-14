-- ============================================================
-- TaskVisionPro — Setup completo para o novo projeto Supabase
-- Projeto: gvjvwirlgzrmmeekpyzh
-- Data: 2026-06-12
--
-- Execute este arquivo no SQL Editor do novo projeto:
-- https://supabase.com/dashboard/project/gvjvwirlgzrmmeekpyzh/sql/new
--
-- Contém:
--   1. Tabelas pendentes (pj_caixa + collaborator_permissions + webhooks)
--   2. Realtime — habilita as 27 tabelas usadas pelo app
--   3. Storage — garante que os 2 buckets existem com as policies certas
--   4. Grants de permissão para authenticated / anon
-- ============================================================


-- ============================================================
-- PARTE 1: MIGRATION pj_caixa (20260605000001)
-- Tabelas: pj_caixa_categorias, pj_caixa_transacoes, pj_contas_pagar
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pj_caixa_categorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ambos')),
  cor           text NOT NULL DEFAULT '#6b7280',
  icone         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_caixa_transacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tipo            text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao       text NOT NULL,
  valor           numeric(15,2) NOT NULL CHECK (valor > 0),
  data            date NOT NULL DEFAULT CURRENT_DATE,
  origem_destino  text,
  categoria_id    uuid REFERENCES public.pj_caixa_categorias(id) ON DELETE SET NULL,
  forma_pagamento text CHECK (forma_pagamento IN ('pix','boleto','cartao_credito','cartao_debito','transferencia','dinheiro','cheque','outro')),
  observacoes     text,
  referencia      text,
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_contas_pagar (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao        text NOT NULL,
  fornecedor       text,
  valor            numeric(15,2) NOT NULL CHECK (valor > 0),
  data_vencimento  date NOT NULL,
  data_pagamento   date,
  status           text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  categoria_id     uuid REFERENCES public.pj_caixa_categorias(id) ON DELETE SET NULL,
  forma_pagamento  text CHECK (forma_pagamento IN ('pix','boleto','cartao_credito','cartao_debito','transferencia','dinheiro','cheque','outro')),
  recorrente       boolean NOT NULL DEFAULT false,
  frequencia       text CHECK (frequencia IN ('mensal','trimestral','semestral','anual')),
  observacoes      text,
  comprovante_url  text,
  created_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_workspace ON public.pj_caixa_transacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_data      ON public.pj_caixa_transacoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_pj_caixa_transacoes_tipo      ON public.pj_caixa_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_workspace     ON public.pj_contas_pagar(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_vencimento    ON public.pj_contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_pj_contas_pagar_status        ON public.pj_contas_pagar(status);

-- RLS
ALTER TABLE public.pj_caixa_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_caixa_transacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_contas_pagar      ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem (idempotente)
DROP POLICY IF EXISTS "Workspace members can manage caixa categorias" ON public.pj_caixa_categorias;
DROP POLICY IF EXISTS "Workspace members can manage caixa transacoes"  ON public.pj_caixa_transacoes;
DROP POLICY IF EXISTS "Workspace members can manage contas pagar"       ON public.pj_contas_pagar;

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

-- Triggers updated_at
CREATE OR REPLACE FUNCTION public.update_pj_caixa_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_pj_caixa_transacoes_updated_at ON public.pj_caixa_transacoes;
CREATE TRIGGER trg_pj_caixa_transacoes_updated_at
  BEFORE UPDATE ON public.pj_caixa_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_pj_caixa_updated_at();

DROP TRIGGER IF EXISTS trg_pj_contas_pagar_updated_at ON public.pj_contas_pagar;
CREATE TRIGGER trg_pj_contas_pagar_updated_at
  BEFORE UPDATE ON public.pj_contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.update_pj_caixa_updated_at();

-- Função para marcar contas vencidas
CREATE OR REPLACE FUNCTION public.update_contas_pagar_vencidas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.pj_contas_pagar
  SET status = 'vencido', updated_at = now()
  WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE;
END;
$$;


-- ============================================================
-- PARTE 2: MIGRATION collaborator_permissions + webhooks (20260611120000)
-- Tabelas: collaborator_permissions, webhook_configs, webhook_event_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collaborator_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key     text NOT NULL,
  enabled         boolean NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaborator_permissions_unique UNIQUE (workspace_id, member_user_id, feature_key)
);

COMMENT ON TABLE public.collaborator_permissions IS
  'Permissões granulares por colaborador. feature_key: agenda | briefings | commercial | financial_view | projects_full';

CREATE INDEX IF NOT EXISTS idx_collab_perms_user
  ON public.collaborator_permissions (member_user_id, workspace_id);

ALTER TABLE public.collaborator_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaborator_permissions_select_own"        ON public.collaborator_permissions;
DROP POLICY IF EXISTS "collaborator_permissions_manage_workspace"  ON public.collaborator_permissions;

CREATE POLICY "collaborator_permissions_select_own"
  ON public.collaborator_permissions FOR SELECT
  USING (member_user_id = auth.uid());

CREATE POLICY "collaborator_permissions_manage_workspace"
  ON public.collaborator_permissions FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
      UNION
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

-- webhook_configs
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text NOT NULL,
  endpoint_url  text NOT NULL,
  secret_token  text,
  events        text[] NOT NULL DEFAULT '{}',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_configs IS
  'Endpoints de webhook configurados por workspace. events: task.completed | task.assigned | project.assigned';

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_configs_workspace_owner" ON public.webhook_configs;

CREATE POLICY "webhook_configs_workspace_owner"
  ON public.webhook_configs FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
      UNION
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

-- webhook_event_log
CREATE TABLE IF NOT EXISTS public.webhook_event_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id  uuid REFERENCES public.webhook_configs(id) ON DELETE SET NULL,
  workspace_id       uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type         text NOT NULL,
  payload            jsonb NOT NULL,
  http_status        integer,
  success            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_event_log IS
  'Log imutável de disparos de webhook. Nunca faça UPDATE/DELETE nesta tabela.';

CREATE INDEX IF NOT EXISTS idx_webhook_log_workspace
  ON public.webhook_event_log (workspace_id, created_at DESC);

ALTER TABLE public.webhook_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_log_workspace_read"   ON public.webhook_event_log;
DROP POLICY IF EXISTS "webhook_log_service_insert"   ON public.webhook_event_log;

CREATE POLICY "webhook_log_workspace_read"
  ON public.webhook_event_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
      UNION
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "webhook_log_service_insert"
  ON public.webhook_event_log FOR INSERT
  WITH CHECK (true);


-- ============================================================
-- PARTE 3: REALTIME — habilitar todas as 27 tabelas usadas pelo app
-- O pg_dump não preserva publication membership.
-- ============================================================

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'incomes', 'expenses', 'debts', 'savings', 'tasks', 'time_blocks',
    'projects', 'project_tasks', 'scripts', 'goals', 'categories',
    'sales_goals', 'prospects', 'corporate_pricing', 'corporate_investments',
    'corporate_team', 'service_plans', 'service_plan_items',
    'corporate_cost_categories', 'corporate_costs',
    'editorial_calendar_items', 'editorial_comments',
    'purchase_plans', 'user_income_categories', 'user_debt_categories',
    'products', 'product_pricing_details'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Verifica se a tabela existe antes de adicionar
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        RAISE NOTICE 'Realtime habilitado: %', tbl;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Já na publication: %', tbl;
        WHEN OTHERS THEN
          RAISE NOTICE 'Erro em %: %', tbl, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Tabela não existe (skip): %', tbl;
    END IF;
  END LOOP;
END;
$$;


-- ============================================================
-- PARTE 4: STORAGE — garantir buckets e policies
-- Os buckets foram criados mas as policies podem não ter sido migradas.
-- ============================================================

-- task-attachments (público para leitura, autenticado para upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', true, 52428800, null)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- prospect-documents (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('prospect-documents', 'prospect-documents', false, 10485760, null)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

-- Policies storage: task-attachments
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task attachments"               ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own task attachments"          ON storage.objects;

CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can view task attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies storage: prospect-documents
DROP POLICY IF EXISTS "Authenticated users can upload prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view prospect documents"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete prospect documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload prospect documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prospect-documents');

CREATE POLICY "Authenticated users can view prospect documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prospect-documents');

CREATE POLICY "Authenticated users can delete prospect documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prospect-documents');


-- ============================================================
-- PARTE 5: GRANTS — garantir permissões para authenticated
-- Necessário se as tabelas novas não herdaram os grants do dump
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_caixa_categorias    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_caixa_transacoes    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_contas_pagar        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_configs         TO authenticated;
GRANT SELECT, INSERT               ON public.webhook_event_log        TO authenticated;
GRANT ALL                           ON public.webhook_event_log        TO service_role;


-- ============================================================
-- VERIFICAÇÃO FINAL — rode depois para confirmar
-- ============================================================
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;