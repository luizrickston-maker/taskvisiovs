-- =====================================================
-- Agendador de cobranças (Fase 3): roda diariamente e chama a Edge Function
-- process-client-charges, que envia lembretes/cobrança/atraso pelo WhatsApp.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que lê a config e dispara a Edge Function via pg_net.
CREATE OR REPLACE FUNCTION public.trigger_process_charges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, net
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT value INTO v_url    FROM private.app_config WHERE key = 'charges_fn_url';
  SELECT value INTO v_secret FROM private.app_config WHERE key = 'notify_secret';
  IF v_url IS NULL THEN
    RETURN; -- ainda não configurado; não faz nada
  END IF;

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

-- Agenda diária às 12:00 UTC (09:00 horário de Brasília).
-- Remove agendamento anterior (se existir) antes de recriar.
SELECT cron.unschedule('process-client-charges-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-client-charges-daily');

SELECT cron.schedule(
  'process-client-charges-daily',
  '0 12 * * *',
  $$ SELECT public.trigger_process_charges(); $$
);

-- =====================================================
-- LEMBRETE (rodar manualmente após deploy da Edge Function):
--   INSERT INTO private.app_config (key, value)
--   VALUES ('charges_fn_url',
--     'https://gvjvwirlgzrmmeekpyzh.supabase.co/functions/v1/process-client-charges')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- (a config 'notify_secret' já existe, vinda da notificação de tarefas)
-- =====================================================