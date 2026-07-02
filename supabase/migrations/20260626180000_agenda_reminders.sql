-- =====================================================
-- Lembretes de compromissos (agenda) para o gestor.
-- Config por workspace: dias antes e/ou horas antes (cada um opcional).
-- Roda via pg_cron a cada 15 min; envia pelo WhatsApp (agzap) aos destinatários
-- do tipo 'agenda'. Tudo aditivo — não altera nada existente.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Config de cadência no workspace (vazio = aquele modo desligado).
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS agenda_remind_days_before  int[] NOT NULL DEFAULT '{1}',
  ADD COLUMN IF NOT EXISTS agenda_remind_hours_before int[] NOT NULL DEFAULT '{2}';

-- 2) Log/dedupe (só service_role).
CREATE TABLE IF NOT EXISTS public.agenda_reminder_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_block_id uuid NOT NULL,
  reference     text NOT NULL,       -- 'day-1' | 'hour-2' ...
  status        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (time_block_id, reference)
);
ALTER TABLE public.agenda_reminder_events ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Function).

-- 3) Dispara a Edge Function process-agenda-reminders.
CREATE OR REPLACE FUNCTION public.trigger_process_agenda()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, net
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT value INTO v_url    FROM private.app_config WHERE key = 'agenda_fn_url';
  SELECT value INTO v_secret FROM private.app_config WHERE key = 'notify_secret';
  IF v_url IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-notify-secret', COALESCE(v_secret, '')
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- 4) Agenda a cada 15 min (a própria função filtra horário/condições).
SELECT cron.unschedule('process-agenda-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-agenda-reminders');
SELECT cron.schedule('process-agenda-reminders', '*/15 * * * *', $$ SELECT public.trigger_process_agenda(); $$);

-- 5) Semeia o tipo 'agenda' no destinatário Gestor (para funcionar de cara).
UPDATE public.notification_recipients
SET types = array_append(types, 'agenda')
WHERE label = 'Gestor' AND NOT ('agenda' = ANY(types));

-- =====================================================
-- LEMBRETE (rodar após deploy da Edge Function):
--   INSERT INTO private.app_config (key, value)
--   VALUES ('agenda_fn_url',
--     'https://gvjvwirlgzrmmeekpyzh.supabase.co/functions/v1/process-agenda-reminders')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- =====================================================