import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDateBR } from '@/lib/schedule';
import type { CollaboratorAppointmentRow, CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';

/** Prefix shared by every appointment query, so invalidation covers both readers. */
export const APPOINTMENT_QUERY_KEY = 'collab-appointments';

/** COLAB-04 — the exact message the database trigger raises. */
export const ALREADY_ANSWERED_MESSAGE = 'Esta solicitação já foi respondida.';

/** MGR-04 — the exact refusal the spec names. */
export function formatConflictMessage(name: string, from: string, to: string): string {
  return `Este período está indisponível para ${name} de ${from} a ${to}.`;
}

/** `2026-12-01` + `14:00` -> `01/12/2026 14:00`; no time -> `01/12/2026`. */
function formatBound(date: string, time: string | null): string {
  return time ? `${formatDateBR(date)} ${time}` : formatDateBR(date);
}

// =====================================================
// Queries
// =====================================================

/**
 * Appointments for one member inside the period.
 *
 * No third argument: the signed-in collaborator's own rows (the portal page).
 * A member id: the manager reading the collaborator selected in `/pj/agenda`
 * (MGR-03). Explicit `null`: no collaborator selected, so the query stays
 * disabled and the manager's own `time_blocks` are the only source
 * (Edge Case: "the manager's own calendar ... SHALL not query
 * `collaborator_appointments` at all").
 */
export function useCollaboratorAppointments(
  dateFrom: string,
  dateTo: string,
  memberUserId?: string | null,
) {
  const { user } = useAuthContext();
  const target = memberUserId === undefined ? user?.id ?? null : memberUserId;

  return useQuery({
    queryKey: [APPOINTMENT_QUERY_KEY, target, dateFrom, dateTo],
    queryFn: async () => {
      if (!target) return [];
      const { data, error } = await supabase
        // The generated Supabase types predate this table.
        .from('collaborator_appointments' as any)
        .select('*')
        .eq('member_user_id', target)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CollaboratorAppointmentRow[];
    },
    enabled: !!user?.id && !!target,
    staleTime: 60_000,
  });
}

// =====================================================
// Manager: create (with the conflict pre-check), edit and cancel
// =====================================================

export interface CreateAppointmentInput {
  member_user_id: string;
  title: string;
  notes?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  /** Name used in the refusal message; the manager's selector already holds it. */
  collaboratorName?: string;
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      if (!user) throw new Error('Não autenticado');

      const { data: workspaceId, error: wsError } = await supabase.rpc('get_my_workspace_id');
      if (wsError) throw wsError;

      // One conflict algorithm, in SQL (AD-002): the client asks, the
      // BEFORE INSERT trigger decides.
      const { data: conflicted, error: conflictError } = await supabase.rpc(
        'fn_collaborator_has_conflict' as any,
        {
          p_member: input.member_user_id,
          p_date: input.date,
          p_end_date: input.date,
          p_start_time: input.start_time,
          p_end_time: input.end_time,
        },
      );
      if (conflictError) throw conflictError;

      if (conflicted === true) {
        const { data: rows } = await supabase
          .from('collaborator_availability' as any)
          .select('*')
          .eq('member_user_id', input.member_user_id)
          .lte('start_date', input.date)
          .gte('end_date', input.date)
          .order('start_date', { ascending: true });
        const blocking = ((rows ?? []) as unknown as CollaboratorAvailabilityRow[])[0];
        throw new Error(formatConflictMessage(
          input.collaboratorName ?? 'este colaborador',
          blocking ? formatBound(blocking.start_date, blocking.start_time) : formatDateBR(input.date),
          blocking ? formatBound(blocking.end_date, blocking.end_time) : formatDateBR(input.date),
        ));
      }

      const { data, error } = await supabase
        .from('collaborator_appointments' as any)
        .insert({
          workspace_id: workspaceId,
          member_user_id: input.member_user_id,
          created_by: user.id,
          title: input.title,
          notes: input.notes ?? null,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time,
        })
        .select()
        .single();
      if (error) throw error;

      qc.invalidateQueries({ queryKey: [APPOINTMENT_QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: () => toast.success('Compromisso criado!'),
    onError: (err: Error) => toast.error(err.message || 'Erro ao criar compromisso'),
  });
}

export type AppointmentEditableFields = Pick<
  CollaboratorAppointmentRow,
  'title' | 'notes' | 'date' | 'start_time' | 'end_time'
>;

/**
 * Manager edit (MGR-09). The status and decided_* columns are deliberately
 * absent from the payload type: an edit changes the body of the appointment
 * only — withdrawing is `useCancelAppointment`, accepting stays the
 * collaborator's — and neither edit nor cancel sends a notification.
 */
export function useUpdateAppointment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<AppointmentEditableFields>) => {
      const { data, error } = await supabase
        .from('collaborator_appointments' as any)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: [APPOINTMENT_QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: () => toast.success('Compromisso atualizado!'),
    onError: () => toast.error('Erro ao atualizar compromisso'),
  });
}

/**
 * Manager cancel (MGR-09, AD-007): the manager withdraws scheduling they
 * created, from `pending` or `confirmed`, and never confirms — that act stays
 * the collaborator's.
 *
 * The payload carries no status field at all: the caller names a row, and the
 * mutation writes `cancelled`. The type therefore cannot advertise `confirmed`,
 * and the body cannot send it either, so the client never offers an operation
 * the `20261019130000` trigger would reject at runtime. Like every edit or
 * cancel, this path sends no notification (MGR-09).
 */
export function useCancelAppointment() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('collaborator_appointments' as any)
        .update({
          status: 'cancelled',
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      qc.invalidateQueries({ queryKey: [APPOINTMENT_QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: () => toast.success('Compromisso cancelado!'),
    onError: (err: Error) => toast.error(err.message || 'Erro ao cancelar compromisso'),
  });
}

// =====================================================
// Collaborator: confirm / cancel
// =====================================================

export type AppointmentAction = 'confirm' | 'cancel';

export function useRespondAppointment() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      appointment,
      action,
    }: {
      appointment: CollaboratorAppointmentRow;
      action: AppointmentAction;
    }) => {
      if (!user) throw new Error('Não autenticado');

      // COLAB-05: an action on someone else's row never reaches the database.
      if (appointment.member_user_id !== user.id) {
        throw new Error('Sem permissão para responder este compromisso.');
      }

      // COLAB-04: a terminal row is refused before any write. The database
      // trigger is the authority; this is the same rule for instant feedback.
      if (appointment.status !== 'pending') {
        throw new Error(ALREADY_ANSWERED_MESSAGE);
      }

      const { data, error } = await supabase
        .from('collaborator_appointments' as any)
        .update({
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
          decided_at: new Date().toISOString(),
          decided_by: user.id,
        })
        .eq('id', appointment.id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      qc.invalidateQueries({ queryKey: [APPOINTMENT_QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: (_data, { action }) =>
      toast.success(action === 'confirm' ? 'Compromisso confirmado!' : 'Compromisso cancelado!'),
    onError: (err: Error) => toast.error(err.message || 'Erro ao responder compromisso'),
  });
}
