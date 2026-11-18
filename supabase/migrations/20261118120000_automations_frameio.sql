-- =====================================================
-- Automações Frame.io: schema.
--
-- Duas tabelas novas e uma RPC, nenhuma policy.
--
-- As duas tabelas guardam credencial (frameio_connections) ou o estado de uma
-- execução (frameio_runs), então seguem o padrão appointment_notification_log
-- (20261019120000_collaborator_agenda_schema.sql:66-71) e AD-009: RLS
-- habilitado e NENHUMA policy, logo nenhum papel cliente lê nenhuma linha -
-- só service_role. O navegador enxerga apenas o resultado da RPC abaixo, que
-- devolve colunas sem segredo e exige is_workspace_admin (AD-006), nunca
-- has_workspace_access sozinho.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.frameio_connections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Uma conexão por workspace (context.md): a chave única é a garantia.
  workspace_id            uuid NOT NULL UNIQUE
                          REFERENCES public.workspaces(id) ON DELETE CASCADE,
  frameio_account_id      text NOT NULL,
  frameio_account_name    text,                      -- exibição
  frameio_workspace_id    text NOT NULL,
  frameio_workspace_name  text,                      -- exibição
  access_token            text NOT NULL,             -- não sai do servidor
  access_token_expires_at timestamptz NOT NULL,
  refresh_token           text NOT NULL,             -- não sai do servidor
  requires_reconnect      boolean NOT NULL DEFAULT false,
  connected_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_frameio_connections_updated_at
  BEFORE UPDATE ON public.frameio_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- updated_at não consta na tabela de dados do design, mas o bloco de triggers
-- do design aplica update_updated_at_column às DUAS tabelas; a coluna existe
-- para esse trigger, e started_at precisa ser NOT NULL porque a varredura de
-- execução presa compara o campo.
CREATE TABLE IF NOT EXISTS public.frameio_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  flow         text NOT NULL
               CONSTRAINT frameio_runs_flow_check
               CHECK (flow IN ('client_structure', 'video_project')),
  params       jsonb NOT NULL,                       -- o que foi pedido
  status       text NOT NULL DEFAULT 'running'
               CONSTRAINT frameio_runs_status_check
               CHECK (status IN ('running', 'done', 'failed')),
  result       jsonb,                                -- {created, existing, failedAt, remaining}
  error        text,
  started_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_frameio_runs_updated_at
  BEFORE UPDATE ON public.frameio_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mutex: uma execução viva por cliente. O predicado usa só colunas imutáveis;
-- now() não pode entrar aqui (um índice exige expressão imutável). A linha
-- presa em 'running' é varrida pela função ANTES do insert:
--   UPDATE public.frameio_runs SET status = 'failed'
--    WHERE status = 'running' AND started_at < now() - interval '10 minutes'
CREATE UNIQUE INDEX IF NOT EXISTS frameio_runs_one_live_per_client
  ON public.frameio_runs (client_id)
  WHERE status = 'running';

ALTER TABLE public.frameio_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frameio_runs ENABLE ROW LEVEL SECURITY;

-- Sem nenhuma policy nos dois blocos acima: authenticated recebe zero linhas
-- e nenhuma credencial chega ao navegador (AD-009).

-- =====================================================
-- RPC: como o cliente lê o estado da conexão.
-- =====================================================
CREATE OR REPLACE FUNCTION public.frameio_connection_status()
RETURNS TABLE (
  workspace_id           uuid,
  frameio_workspace_name text,
  frameio_account_name   text,
  requires_reconnect     boolean,
  connected_at           timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.workspace_id,
         c.frameio_workspace_name,
         c.frameio_account_name,
         c.requires_reconnect,
         c.created_at
  FROM public.frameio_connections c
  WHERE c.workspace_id = public.get_my_workspace_id()
    AND public.is_workspace_admin(c.workspace_id, auth.uid())
$$;

-- Padrão get_my_workspace_id: sem o REVOKE o PUBLIC herdaria o EXECUTE.
REVOKE EXECUTE ON FUNCTION public.frameio_connection_status() FROM public;
GRANT EXECUTE ON FUNCTION public.frameio_connection_status() TO authenticated;
