-- =====================================================
-- Agenda do colaborador: só se agenda quem está no time.
--
-- SPEC — Edge Case de "Manager views a collaborator's calendar":
--   "IF the selected collaborator is deactivated (`is_active = false`)
--    between selection and save, THEN the system SHALL reject the save with
--    `Este colaborador não está mais ativo.`"
--
-- O seletor (MGR-01) só oferece linhas de `corporate_team` com
-- `is_active = true` E `member_user_id` preenchido, então o banco exige
-- exatamente isso na escrita. Até aqui a recusa existia só no cliente, o que
-- viola AD-002: uma aba velha ou um request montado à mão passava por ela.
--
-- O predicado é "NÃO EXISTE linha ativa", não "existe linha inativa". Um
-- `member_user_id` sem linha alguma em `corporate_team` também é recusado.
-- Isso é intencional e cabe no spec — MGR-05 fala do "selected collaborator",
-- que só sai do seletor — e fecha um buraco real: o `WITH CHECK` do INSERT é
-- `is_workspace_admin(...) OR is_super_admin(...)` e não diz nada sobre o
-- alvo, então um admin de workspace gravava uma linha para qualquer
-- `auth.users`, que a enxergava no próprio portal pela política de SELECT do
-- colaborador (`auth.uid() = member_user_id`).
--
-- SECURITY DEFINER: `corporate_team` só é legível por quem é o `user_id` da
-- linha ou o próprio membro (20260127191335 / 20260527151706), e um segundo
-- admin do mesmo workspace não enxerga a linha do colega. Sem DEFINER esta
-- guarda recusaria um INSERT legítimo — fail-closed do lado errado. Quem
-- chega aqui já passou pela RLS de INSERT da própria tabela, então a leitura
-- só acontece para quem já podia escrever, e a função não devolve dados,
-- apenas aceita ou recusa.
--
-- Só em INSERT. Edição e cancelamento seguem cobertos por
-- `assert_appointment_transition` (BEFORE UPDATE), que não é tocado aqui:
-- um compromisso já criado continua editável e cancelável mesmo se o
-- colaborador for desativado depois.
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_assert_appointment_member_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.corporate_team ct
    WHERE ct.member_user_id = NEW.member_user_id
      AND ct.workspace_id   = NEW.workspace_id
      AND ct.is_active
  ) THEN
    RAISE EXCEPTION 'Este colaborador não está mais ativo.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Nome menor que `assert_appointment_no_conflict`, então esta guarda roda
-- primeiro: sem time não faz sentido nem calcular o conflito.
DROP TRIGGER IF EXISTS assert_appointment_member_active ON public.collaborator_appointments;
CREATE TRIGGER assert_appointment_member_active
  BEFORE INSERT ON public.collaborator_appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_assert_appointment_member_active();
