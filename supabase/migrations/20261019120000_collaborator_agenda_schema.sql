-- =====================================================
-- Agenda do colaborador: schema.
--
-- Três tabelas novas (o time_blocks pessoal não é tocado), os CHECKs que
-- espelham as regras AVAIL do spec, as policies RLS e o registro no realtime.
-- A autoridade é do banco: o cliente só dá feedback imediato.
-- =====================================================

-- 1) Disponibilidade / indisponibilidade declarada pelo colaborador.
CREATE TABLE IF NOT EXISTS public.collaborator_availability (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  start_time     text,                      -- NULL => dia inteiro
  end_time       text,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaborator_availability_dates_check
    CHECK (end_date >= start_date),                                          -- AVAIL-04
  CONSTRAINT collaborator_availability_times_pair_check
    CHECK ((start_time IS NULL) = (end_time IS NULL)),                        -- AVAIL-05/06
  CONSTRAINT collaborator_availability_times_single_day_check
    CHECK (start_time IS NULL OR start_date = end_date),                      -- AVAIL-05
  CONSTRAINT collaborator_availability_times_order_check
    CHECK (start_time IS NULL OR start_time < end_time)                       -- AVAIL-06
);

-- 2) Compromisso criado pelo gestor para um colaborador.
CREATE TABLE IF NOT EXISTS public.collaborator_appointments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  notes          text,                                                        -- MGR-12
  date           date NOT NULL,
  start_time     text NOT NULL,
  end_time       text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CONSTRAINT collaborator_appointments_status_check
                 CHECK (status IN ('pending', 'confirmed', 'cancelled')),      -- COLAB-02/03
  decided_at     timestamptz,
  decided_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notify_status  text NOT NULL DEFAULT 'pending'
                 CONSTRAINT collaborator_appointments_notify_status_check
                 CHECK (notify_status IN ('pending', 'sent', 'failed', 'timeout', 'no_whatsapp')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaborator_appointments_time_order_check
    CHECK (start_time < end_time)
);

CREATE TRIGGER set_collaborator_appointments_updated_at
  BEFORE UPDATE ON public.collaborator_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Histórico de tentativas de notificação: RLS ligada e SEM policies,
--    igual a agenda_reminder_events => só service_role enxerga.
CREATE TABLE IF NOT EXISTS public.appointment_notification_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    uuid NOT NULL REFERENCES public.collaborator_appointments(id) ON DELETE CASCADE,
  attempt           integer NOT NULL,
  status            text CHECK (status IN ('sent', 'failed', 'timeout', 'no_whatsapp')),
  provider_response text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, attempt)          -- NOTIF-04: idempotência da tentativa
);

ALTER TABLE public.collaborator_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notification_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Policies
-- =====================================================

-- SPEC_DEVIATION: design.md's reuse table says every new policy scopes on
--   has_workspace_access(workspace_id). That predicate is true for ANY
--   workspace member, and create-collaborator adds collaborators as role
--   'member' (supabase/functions/create-collaborator/index.ts:139,189), so a
--   has_workspace_access read policy would show collaborator A the rows of
--   collaborator B - COLAB-09 is absolute ("any row whose member_user_id
--   differs from their own id"). The manager side therefore checks
--   is_workspace_admin (owner/admin of the ROW's workspace) or is_super_admin,
--   which keeps the row-scoped rule of risk R8 and excludes collaborators.
--
-- Colaborador lê/altera/apaga as próprias linhas; gestor lê tudo do workspace.
-- Inserir disponibilidade em nome de outra pessoa não passa do WITH CHECK
-- (AVAIL-11), e o gestor não ganha esse poder: recusar tempo livre é decisão
-- registrada no design.
CREATE POLICY "Collaborator reads own availability"
  ON public.collaborator_availability FOR SELECT TO authenticated
  USING (
    auth.uid() = member_user_id
    OR public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Collaborator inserts own availability"
  ON public.collaborator_availability FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_user_id);

CREATE POLICY "Collaborator deletes own availability"
  ON public.collaborator_availability FOR DELETE TO authenticated
  USING (auth.uid() = member_user_id);

CREATE POLICY "Workspace reads appointments"
  ON public.collaborator_appointments FOR SELECT TO authenticated
  USING (
    auth.uid() = member_user_id
    OR public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace inserts appointments"
  ON public.collaborator_appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Colaborador só mexe nas próprias linhas (o campo a campo é trigger, T5);
-- gestor edita as do próprio workspace, inclusive para cancelar.
CREATE POLICY "Workspace updates appointments"
  ON public.collaborator_appointments FOR UPDATE TO authenticated
  USING (
    auth.uid() = member_user_id
    OR public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = member_user_id
    OR public.is_workspace_admin(workspace_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- appointment_notification_log: RLS habilitada acima e nenhuma policy aqui.

-- =====================================================
-- Grants (sem eles o RLS nem chega a ser avaliado para authenticated)
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_appointments TO authenticated;
GRANT SELECT ON public.appointment_notification_log TO authenticated;

-- =====================================================
-- Realtime (SYNC-03): publicação + REPLICA IDENTITY FULL, idempotente.
-- =====================================================
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY['collaborator_availability', 'collaborator_appointments'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);

      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        RAISE NOTICE 'Realtime habilitado: %', tbl;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Já na publication: %', tbl;
        WHEN OTHERS THEN
          RAISE NOTICE 'Erro em %: %', tbl, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Tabela não existe (skip): %', tbl;
    END IF;
  END LOOP;
END
$$;
