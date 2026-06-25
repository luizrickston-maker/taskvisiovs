-- =====================================================
-- Notifica o GESTOR no WhatsApp quando um colaborador muda o status de uma tarefa.
-- Espelha o padrão de notify-task-assigned (trigger -> pg_net -> Edge Function -> agzap).
-- =====================================================

-- 1) Número de WhatsApp do gestor para receber avisos (por workspace).
--    Formato internacional só-dígitos (DDI+numero). BR: 55 + DDD + numero.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS notify_whatsapp text;
COMMENT ON COLUMN public.workspaces.notify_whatsapp IS
  'WhatsApp do gestor para notificações de atualização de tarefas (só dígitos, DDI+numero).';

-- 2) pg_net e config interna já existem (criados na migração de atribuição).
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- 3) Log/auditoria de envios (SEM unique: queremos registrar TODA mudança).
CREATE TABLE IF NOT EXISTS public.task_status_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL,
  new_status text,
  changed_by uuid,
  status     text,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_status_notifications ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Function) escreve/lê.

-- 4) Trigger: ao mudar o status de uma tarefa atribuída, chama a Edge Function.
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, net
AS $$
DECLARE
  v_url    text;
  v_anon   text;
  v_secret text;
  v_uid    uuid;
BEGIN
  -- Só quando o status realmente muda.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Só tarefas com responsável (colaborador).
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sem auto-aviso: se quem alterou é o próprio gestor (dono da tarefa), ignora.
  v_uid := auth.uid();
  IF v_uid IS NOT NULL AND v_uid = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_url    FROM private.app_config WHERE key = 'notify_status_fn_url';
  SELECT value INTO v_anon   FROM private.app_config WHERE key = 'anon_key';
  SELECT value INTO v_secret FROM private.app_config WHERE key = 'notify_secret';

  -- Se ainda não configurado, não faz nada (não quebra o update da tarefa).
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
      'event',       'task.status_changed',
      'task_id',     NEW.id,
      'new_status',  NEW.status,
      'old_status',  OLD.status,
      'changed_by',  v_uid,
      'occurred_at', now()
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_status_change ON public.project_tasks;
CREATE TRIGGER trg_notify_task_status_change
AFTER UPDATE OF status ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_status_change();

-- 5) LEMBRETE (rodar manualmente, fora do git, após deploy da Edge Function):
--    INSERT INTO private.app_config (key, value)
--    VALUES ('notify_status_fn_url', 'https://<projeto>.supabase.co/functions/v1/notify-task-status')
--    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;