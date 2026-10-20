-- ACK-01 / ACK-02: quando o colaborador responde, o gestor que criou o
-- compromisso é avisado no aplicativo — e nenhuma mensagem de WhatsApp é
-- enviada. O provedor só é alcançável a partir de notify-appointment, que é
-- exclusivo da criação (NOTIF-07), então "nenhuma mensagem" aqui é
-- estrutural: este caminho não conhece nenhum adaptador.
--
-- Forma seguindo handle_video_briefing_notification()
-- (20260521181327_28f0e9cc-021b-4dba-af28-c97ca61cd8b8.sql): um gatilho
-- AFTER UPDATE na própria tabela do recurso, SECURITY DEFINER porque
-- public.notifications concede ao usuário apenas SELECT e UPDATE — a linha
-- só pode nascer por um caminho privilegiado.

CREATE OR REPLACE FUNCTION public.collaborator_appointment_ack_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Somente uma decisão real do colaborador. O gestor retirando o próprio
  -- agendamento (AD-007) não é novidade para ele mesmo, e uma atualização que
  -- não muda status não é decisão nenhuma.
  IF OLD.status = 'pending'
     AND NEW.status IN ('confirmed', 'cancelled')
     AND NEW.decided_by IS DISTINCT FROM NEW.created_by THEN
    INSERT INTO public.notifications (workspace_id, user_id, title, message, link, type, read)
    VALUES (
      NEW.workspace_id,
      NEW.created_by,
      CASE
        WHEN NEW.status = 'confirmed' THEN 'Compromisso confirmado'
        ELSE 'Compromisso cancelado'
      END,
      CASE
        WHEN NEW.status = 'confirmed' THEN
          'O colaborador confirmou o compromisso "' || NEW.title || '" de ' ||
          to_char(NEW.date, 'DD/MM/YYYY') || ', ' || NEW.start_time || '–' || NEW.end_time || '.'
        ELSE
          'O colaborador cancelou o compromisso "' || NEW.title || '" de ' ||
          to_char(NEW.date, 'DD/MM/YYYY') || ', ' || NEW.start_time || '–' || NEW.end_time || '.'
      END,
      '/pj/agenda',
      'agenda',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collaborator_appointment_ack_notification
  ON public.collaborator_appointments;
CREATE TRIGGER collaborator_appointment_ack_notification
AFTER UPDATE ON public.collaborator_appointments
FOR EACH ROW
EXECUTE FUNCTION public.collaborator_appointment_ack_notification();
