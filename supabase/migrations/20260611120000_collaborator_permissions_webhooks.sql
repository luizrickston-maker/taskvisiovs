-- ============================================================
-- collaborator_permissions
-- Controla quais seções do portal cada colaborador pode acessar.
-- Gerenciado pelo gestor via TeamMemberProgressDetails > Aba "Acesso".
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collaborator_permissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key      text NOT NULL,
  enabled          boolean NOT NULL DEFAULT false,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaborator_permissions_unique UNIQUE (workspace_id, member_user_id, feature_key)
);

COMMENT ON TABLE public.collaborator_permissions IS
  'Permissões granulares por colaborador. feature_key: agenda | briefings | commercial | financial_view | projects_full';

-- Índice para leitura rápida no portal (where member_user_id = ?)
CREATE INDEX IF NOT EXISTS idx_collab_perms_user
  ON public.collaborator_permissions (member_user_id, workspace_id);

-- RLS
ALTER TABLE public.collaborator_permissions ENABLE ROW LEVEL SECURITY;

-- Colaborador lê apenas as próprias permissões
CREATE POLICY "collaborator_permissions_select_own"
  ON public.collaborator_permissions FOR SELECT
  USING (member_user_id = auth.uid());

-- Gestor/admin lê e escreve permissões do seu workspace
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

-- ============================================================
-- webhook_configs
-- Endpoints registrados pelo gestor para receber eventos do sistema.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           text NOT NULL,
  endpoint_url   text NOT NULL,
  secret_token   text,
  -- Lista de eventos aceitos; array vazio = aceita todos
  events         text[] NOT NULL DEFAULT '{}',
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.webhook_configs IS
  'Endpoints de webhook configurados por workspace. events: task.completed | task.assigned | project.assigned';

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- webhook_event_log
-- Registro imutável de todos os disparos (auditoria + debug).
-- ============================================================
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

-- Service role pode inserir via Edge Function (sem RLS)
CREATE POLICY "webhook_log_service_insert"
  ON public.webhook_event_log FOR INSERT
  WITH CHECK (true);