-- Notificação de WhatsApp ao atribuir tarefa a um colaborador.
-- Dispara server-side (trigger) para funcionar em QUALQUER origem (UI, IA, API).

-- 1) WhatsApp do colaborador (em corporate_team, onde vive o responsável).
--    Formato internacional, só dígitos (DDI+numero). BR: 55 + DDD + numero.
--    Coluna nullable para suportar colaboradores estrangeiros no futuro.
ALTER TABLE public.corporate_team ADD COLUMN IF NOT EXISTS whatsapp text;
COMMENT ON COLUMN public.corporate_team.whatsapp IS
  'WhatsApp em formato internacional (apenas dígitos, DDI+numero). BR: 55DDDNUMERO.';

-- 2) Extensão para HTTP assíncrono a partir do Postgres.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Config interna (URL da função, anon key, secret de notificação).
--    Schema 'private' não é exposto pela API; valores definidos fora do git.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- 4) Dedupe / auditoria de envios (evita notificar 2x o mesmo par tarefa+pessoa).
CREATE TABLE IF NOT EXISTS public.task_assignment_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id        uuid NOT NULL,
  member_user_id uuid NOT NULL,
  status         text,
  detail         text,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, member_user_id)
);
ALTER TABLE public.task_assignment_notifications ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Function) escreve/lê.

-- 5) Trigger: ao atribuir (INSERT) ou trocar o responsável (UPDATE), chama a
--    Edge Function notify-task-assigned via pg_net. A função enriquece e envia.
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, net
AS $$
DECLARE
  v_url    text;
  v_anon   text;
  v_secret text;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Em UPDATE, só notifica se o responsável realmente mudou.
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_url    FROM private.app_config WHERE key = 'notify_fn_url';
  SELECT value INTO v_anon   FROM private.app_config WHERE key = 'anon_key';
  SELECT value INTO v_secret FROM private.app_config WHERE key = 'notify_secret';

  -- Se ainda não configurado, não faz nada (não quebra a criação da tarefa).
  IF v_url IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'Authorization',   'Bearer ' || COALESCE(v_anon, ''),
      'x-notify-secret', COALESCE(v_secret, '')
    ),
    body    := jsonb_build_object(
      'event',       'task.assigned',
      'task_id',     NEW.id,
      'assigned_to', NEW.assigned_to
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignment_ins ON public.project_tasks;
CREATE TRIGGER trg_notify_task_assignment_ins
AFTER INSERT ON public.project_tasks
FOR EACH ROW
WHEN (NEW.assigned_to IS NOT NULL)
EXECUTE FUNCTION public.notify_task_assignment();

DROP TRIGGER IF EXISTS trg_notify_task_assignment_upd ON public.project_tasks;
CREATE TRIGGER trg_notify_task_assignment_upd
AFTER UPDATE OF assigned_to ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();
