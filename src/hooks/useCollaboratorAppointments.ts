import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDateBR } from '@/lib/schedule';
import type { CollaboratorAppointmentRow, CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';

const QUERY_KEY = 'collab-appointments';

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

/** The signed-in collaborator's appointments inside the period. */
export function useCollaboratorAppointments(dateFrom: string, dateTo: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        // The generated Supabase types predate this table.
        .from('collaborator_appointments' as any)
        .select('*')
        .eq('member_user_id', user.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CollaboratorAppointmentRow[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

// =====================================================
// Manager: create (with the conflict pre-check) and edit
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

      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
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
 * absent from the payload type: the database refuses a manager touching the
 * collaborator's answer, and no edit or cancel sends a notification.
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
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: () => toast.success('Compromisso atualizado!'),
    onError: () => toast.error('Erro ao atualizar compromisso'),
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

      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      return data as unknown as CollaboratorAppointmentRow;
    },
    onSuccess: (_data, { action }) =>
      toast.success(action === 'confirm' ? 'Compromisso confirmado!' : 'Compromisso cancelado!'),
    onError: (err: Error) => toast.error(err.message || 'Erro ao responder compromisso'),
  });
}
