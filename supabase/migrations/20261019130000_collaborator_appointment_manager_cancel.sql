-- =====================================================
-- Agenda do colaborador: o gestor pode cancelar.
--
-- SPEC_DEVIATION em relação a 20261019120100_collaborator_agenda_behavior.sql
--   — este arquivo a supersede no ramo do gestor e mantém o ramo do
--   colaborador intacto. A migration anterior travava o gestor em
--   `status` inteiro ("O gestor não pode alterar status ou a resposta do
--   colaborador"), o que contradiz MGR-09 ("WHEN the manager cancels or
--   edits an appointment THEN the system SHALL persist the change") e a
--   decisão do usuário "Manager can edit and cancel". O design é que estava
--   errado; o spec manda.
--
-- Contrato corrigido do ramo do gestor:
--   • permitido: pending -> cancelled e confirmed -> cancelled;
--   • recusado:  tudo que vira `confirmed` (aceitar é só do colaborador),
--                tudo que sai de `cancelled` (estado terminal),
--                pending -> pending / confirmed -> confirmed (não é transição);
--   • ao cancelar, decided_at/decided_by registram quem moveu a linha para o
--     estado terminal — colaborador ou gestor;
--   • sem mudança de status, decided_at/decided_by não mudam;
--   • title/notes/date/start_time/end_time continuam livres para o gestor.
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_assert_appointment_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_collaborator boolean;
  v_manager boolean;
  v_status_changed boolean := NEW.status IS DISTINCT FROM OLD.status;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Campo a campo: tudo que NÃO é status/decided_* pertence ao sistema e ao
  -- gestor. updated_at fica de fora porque o trigger
  -- set_collaborator_appointments_updated_at já o escreveu antes deste.
  v_collaborator := (v_uid = NEW.member_user_id);
  v_manager := (public.is_workspace_admin(NEW.workspace_id, v_uid) OR public.is_super_admin(v_uid));

  IF v_collaborator THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.notes IS DISTINCT FROM OLD.notes
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.member_user_id IS DISTINCT FROM OLD.member_user_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.notify_status IS DISTINCT FROM OLD.notify_status
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      -- COLAB-05: o colaborador responde, não reagenda.
      -- SPEC_PRECISION_GAP: o spec não define mensagem para COLAB-05.
      RAISE EXCEPTION 'Colaborador não pode alterar os dados do compromisso (apenas status, decided_at e decided_by).'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_status_changed THEN
      -- COLAB-04: estado terminal não sai do lugar.
      IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Esta solicitação já foi respondida.' USING ERRCODE = 'P0001';
      END IF;
      -- COLAB-02/03: só confirmed e cancelled saem de pending.
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Transição de status inválida: % -> %.', OLD.status, NEW.status
          USING ERRCODE = 'P0001';
      END IF;
      -- COLAB-02/03 exigem decided_at/decided_by = auth.uid(); o banco garante
      -- mesmo que o cliente esqueça de escrever.
      NEW.decided_at := COALESCE(NEW.decided_at, now());
      NEW.decided_by := v_uid;
    END IF;

    RETURN NEW;
  END IF;

  IF v_manager THEN
    IF v_status_changed THEN
      -- Cancelar é gestor; confirmar é só do colaborador, e estado terminal
      -- não volta para o mundo.
      IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Esta solicitação já foi respondida.' USING ERRCODE = 'P0001';
      END IF;
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'O gestor só pode cancelar um compromisso, não confirmá-lo.'
          USING ERRCODE = 'P0001';
      END IF;

      -- Quem moveu a linha para o terminal fica registrado (MGR-09/COLAB-02).
      NEW.decided_at := COALESCE(NEW.decided_at, now());
      NEW.decided_by := v_uid;
      RETURN NEW;
    END IF;

    -- Sem mudança de status o gestor edita o corpo do compromisso, e nada mais.
    IF NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
    THEN
      RAISE EXCEPTION 'decided_at/decided_by só mudam junto com o status.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar este compromisso.' USING ERRCODE = 'P0001';
END;
$$;

-- O vínculo do trigger não muda (mesma assinatura), então CREATE OR REPLACE
-- basta: nenhuma janela sem o guard no meio do replay das migrations.
