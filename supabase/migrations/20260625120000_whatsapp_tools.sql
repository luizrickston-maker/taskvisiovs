-- =====================================================
-- WhatsApp Tools: endpoints HTTP que a IA do agzap aciona como "ferramentas".
-- Cada token mapeia para um workspace; a Edge Function whatsapp-tools resolve
-- o workspace e o dono (gestor) a partir do token enviado no header x-wa-token.
-- =====================================================

-- Tabela de tokens (1 token por instância agzap -> 1 workspace).
-- Em schema public com RLS habilitado e SEM policies: apenas service_role
-- (Edge Function) lê. Mesmo padrão de task_assignment_notifications.
CREATE TABLE IF NOT EXISTS public.whatsapp_tokens (
  token        text PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_tokens ENABLE ROW LEVEL SECURITY;
-- Sem policies de propósito: nenhum usuário final lê/escreve; só o service_role.

COMMENT ON TABLE public.whatsapp_tokens IS
  'Tokens de autenticação dos conectores do agzap. Cada token opera um workspace.';

-- =====================================================
-- LEMBRETE (rodar manualmente, fora do git):
-- Gere um token aleatório forte e associe ao seu workspace. Use o MESMO valor
-- no header x-wa-token dos conectores do agzap.
--
--   INSERT INTO public.whatsapp_tokens (token, workspace_id, label)
--   VALUES ('COLE_UM_TOKEN_ALEATORIO_FORTE', 'c0b994ce-8308-4e55-a616-8ca0230c66da', 'agzap-gestor');
-- =====================================================