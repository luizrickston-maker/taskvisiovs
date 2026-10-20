-- =====================================================
-- Agenda do colaborador: comportamento.
--
-- A autoridade é do banco (AD-002): o algoritmo de conflito existe UMA vez,
-- em SQL, e é chamado pelo RPC do cliente (feedback imediato) e pelo
-- BEFORE INSERT (decisão real). O BEFORE UPDATE concentra a máquina de
-- estados e os direitos de campo, porque RLS não restringe colunas.
-- =====================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Conflito: janela proposta x indisponibilidades declaradas.
--    SECURITY INVOKER (implícito) + STABLE => herda RLS (design R7): só dá
--    para perguntar sobre um membro cuja disponibilidade o chamador já lê.
--    Pontos tocados NÃO conflitam: a.start < b.end AND a.end > b.start.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_collaborator_has_conflict(
  p_member    uuid,
  p_date      date,
  p_end_date  date,
  p_start_time text,
  p_end_time   text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collaborator_availability av
    WHERE av.member_user_id = p_member
      AND av.start_date <= p_end_date
      AND av.end_date   >= p_date
      AND (
        -- Indisponibilidade de dia inteiro (ou janela sem horários): basta
        -- as datas se tocarem.
        av.start_time IS NULL
        OR p_start_time IS NULL
        -- Com horários dos dois lados: só vale no próprio dia da
        -- indisponibilidade e só com sobreposição estrita.
        OR (
          av.start_date BETWEEN p_date AND p_end_date
          AND p_start_time < av.end_time
          AND p_end_time   > av.start_time
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_collaborator_has_conflict(uuid, date, date, text, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) BEFORE INSERT: o banco recusa o compromisso dentro de indisponibilidade.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_assert_appointment_no_conflict()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_name   text;
  v_from   text;
  v_to     text;
BEGIN
  IF public.fn_collaborator_has_conflict(NEW.member_user_id, NEW.date, NEW.date, NEW.start_time, NEW.end_time) THEN
    -- Só para a mensagem: a decisão acima já tomou o "sim".
    -- SPEC_PRECISION_GAP: o spec escreve
    --   "Este período está indisponível para {nome} de {início} a {fim}."
    -- sem dizer se {início}/{fim} são a faixa da indisponibilidade ou a janela
    -- proposta. Aqui vale a faixa indisponível (a frase lê-se assim).
    SELECT coalesce(
      (SELECT ct.name FROM public.corporate_team ct
       WHERE ct.member_user_id = NEW.member_user_id
       ORDER BY ct.is_active DESC, ct.created_at LIMIT 1),
      'este colaborador'
    ) INTO v_name;

    WITH conflicting AS (
      SELECT av.*
      FROM public.collaborator_availability av
      WHERE av.member_user_id = NEW.member_user_id
        AND av.start_date <= NEW.date
        AND av.end_date   >= NEW.date
        AND (
          av.start_time IS NULL
          OR (
            av.start_date = NEW.date
            AND NEW.start_time < av.end_time
            AND NEW.end_time   > av.start_time
          )
        )
      ORDER BY av.start_date, av.start_time NULLS FIRST
      LIMIT 1
    )
    SELECT
      CASE
        WHEN c.start_time IS NULL THEN to_char(c.start_date, 'DD/MM/YYYY')
        ELSE to_char(c.start_date, 'DD/MM/YYYY') || ' ' || c.start_time
      END,
      CASE
        WHEN c.end_time IS NULL THEN to_char(c.end_date, 'DD/MM/YYYY')
        ELSE to_char(c.end_date, 'DD/MM/YYYY') || ' ' || c.end_time
      END
      INTO v_from, v_to
    FROM conflicting c;

    RAISE EXCEPTION 'Este período está indisponível para % de % a %.', v_name, v_from, v_to
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assert_appointment_no_conflict
  BEFORE INSERT ON public.collaborator_appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_assert_appointment_no_conflict();

-- ────────────────────────────────────────────────────────────────────────────
-- 3) BEFORE UPDATE: máquina de estados + direitos de campo.
--
--    Sem identidade na request (service_role / job interno) a RLS já decidiu,
--    então segue. Com identidade, só há dois papéis: o colaborador da linha
--    (responde) e o admin/super do workspace (edita).
-- ────────────────────────────────────────────────────────────────────────────
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
    -- O gestor edita o compromisso, mas não responde no lugar do colaborador.
    IF v_status_changed
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
       OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
    THEN
      RAISE EXCEPTION 'O gestor não pode alterar status ou a resposta do colaborador.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para alterar este compromisso.' USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER assert_appointment_transition
  BEFORE UPDATE ON public.collaborator_appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_assert_appointment_transition();
