import { useState } from 'react';
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

/** The edge function that sends the WhatsApp, invoked with a `kind`. */
export const NOTIFY_FUNCTION = 'notify-appointment';

/** ACK-03 / ACK-04 — the two acts that reach out, and who performed them. */
export type CancellationKind = 'cancelled_by_collaborator' | 'cancelled_by_manager';

/** ACK-06…ACK-08 — the same vocabulary the edge function answers with. */
export type CancellationDelivery = 'sent' | 'failed' | 'timeout' | 'no_whatsapp';

const DELIVERY_VERDICTS: readonly string[] = ['sent', 'failed', 'timeout', 'no_whatsapp'];

/**
 * ACK-06…ACK-08 — one cancellation delivery attempt, and its verdict.
 *
 * The same contract as the creation notifier (`AppointmentNotifier`): the edge
 * function owns the message, the provider and the attempt number, and its body
 * carries the verdict. Anything that is not a known verdict — a rejected call,
 * an error response, a body without `notify_status` — is a failure, so a
 * cancellation is never reported as delivered when it was not.
 *
 * Fire-and-forget as far as the cancellation goes: the row is already
 * cancelled by the time this runs, and a delivery failure must never roll it
 * back (ACK-05). The attempt itself is recorded server-side, in
 * `appointment_notification_log`.
 */
export async function sendCancellationNotice(
  appointmentId: string,
  kind: CancellationKind,
): Promise<CancellationDelivery> {
  try {
    const { data, error } = await supabase.functions.invoke(NOTIFY_FUNCTION, {
      body: { appointment_id: appointmentId, kind },
    });
    const verdict = (data as { notify_status?: unknown } | null)?.notify_status;
    if (!error && typeof verdict === 'string' && DELIVERY_VERDICTS.includes(verdict)) {
      return verdict as CancellationDelivery;
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * ACK-06…ACK-08 — what the party that cancelled must see afterwards.
 *
 * A cancelled appointment is dropped from every read path the moment it is
 * cancelled (COLAB-14, MGR-13) and `appointment_notification_log` has no RLS
 * by design, so this record — written at call time, while the actor is still
 * known — is the only thing the acting view can render the notice from.
 */
export type CancellationNotice = {
  appointmentId: string;
  kind: CancellationKind;
  status: CancellationDelivery;
};

/** One notice per cancel hook, reset only by a new cancellation. */
function useCancellationNotice() {
  const [notice, setNotice] = useState<CancellationNotice | null>(null);
  return { notice, record: setNotice };
}

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
 *
 * Both pages read through this one hook, so a cancelled appointment is dropped
 * here once and disappears from the collaborator's calendar and list (COLAB-14)
 * and from the manager's `/pj/agenda` (MGR-13) alike. The row stays in the
 * database — only the read path hides it.
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
        .neq('status', 'cancelled')
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
 * collaborator's. An edit sends no notification; cancelling does (ACK-04).
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
 * the `20261019130000` trigger would reject at runtime.
 *
 * ACK-04: the collaborator is told on WhatsApp, to the number they already
 * receive the appointment on. The write lands first and stands on its own.
 * ACK-06…ACK-08: how that delivery went is handed back as `notice`, for the
 * manager's own view to render.
 */
export function useCancelAppointment() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const cancellation = useCancellationNotice();

  const mutation = useMutation({
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
      // ACK-06…ACK-08: the verdict goes straight to the view, because the row
      // is about to disappear from it (MGR-13) and nothing else can carry it.
      const status = await sendCancellationNotice(id, 'cancelled_by_manager');
      cancellation.record({ appointmentId: id, kind: 'cancelled_by_manager', status });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao cancelar compromisso'),
  });

  // The notice is the cancel's own feedback (ACK-06 pins its text), so the
  // generic success toast is gone from this path.
  return { ...mutation, notice: cancellation.notice };
}

// =====================================================
// Collaborator: confirm / cancel
// =====================================================

export type AppointmentAction = 'confirm' | 'cancel';

/**
 * Collaborator's answer.
 *
 * ACK-02: confirming sends nothing — the manager already has the in-app
 * notification (ACK-01). ACK-03: cancelling tells the workspace's `agenda`
 * recipients, because the appointment is about to disappear from their view.
 */
export function useRespondAppointment() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const cancellation = useCancellationNotice();

  const mutation = useMutation({
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
      // ACK-02 / ACK-03 — only the cancellation reaches out, and only after
      // the row is already cancelled.
      if (action === 'cancel') {
        // ACK-06…ACK-08: the verdict goes straight to the view, because the
        // row is about to disappear from it (COLAB-14) and nothing else can
        // carry it.
        const status = await sendCancellationNotice(appointment.id, 'cancelled_by_collaborator');
        cancellation.record({
          appointmentId: appointment.id,
          kind: 'cancelled_by_collaborator',
          status,
        });
      }
      return data as unknown as CollaboratorAppointmentRow;
    },
    // The cancellation's own feedback is the notice (ACK-06 pins its text), so
    // only the confirmation still toasts.
    onSuccess: (_data, { action }) => {
      if (action === 'confirm') toast.success('Compromisso confirmado!');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao responder compromisso'),
  });

  return { ...mutation, notice: cancellation.notice };
}
