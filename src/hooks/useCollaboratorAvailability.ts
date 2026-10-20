import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';

// Schedule primitives (timeToMinutes, hasConflict, rangesOverlap,
// parseDateOnly, formatDateBR) live in @/lib/schedule.

const QUERY_KEY = 'collab-availability';

// =====================================================
// Queries
// =====================================================

/**
 * Rows overlapping [dateFrom, dateTo].
 *
 * No third argument: the signed-in collaborator's own rows. A member id: the
 * manager reading the collaborator selected in `/pj/agenda` (MGR-03).
 * Explicit `null`: no collaborator selected, so the query stays disabled.
 */
export function useCollaboratorAvailability(
  dateFrom: string,
  dateTo: string,
  memberUserId?: string | null,
) {
  const { user } = useAuthContext();
  const target = memberUserId === undefined ? user?.id ?? null : memberUserId;

  return useQuery({
    queryKey: [QUERY_KEY, target, dateFrom, dateTo],
    queryFn: async () => {
      if (!target) return [];
      const { data, error } = await supabase
        // The generated Supabase types predate this table.
        .from('collaborator_availability' as any)
        .select('*')
        .eq('member_user_id', target)
        .lte('start_date', dateTo)
        .gte('end_date', dateFrom)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CollaboratorAvailabilityRow[];
    },
    enabled: !!user?.id && !!target,
    staleTime: 60_000,
  });
}

// =====================================================
// Mutations
// =====================================================

/** The five granularities all reduce to this shape (AVAIL-01/02/03). */
export interface AvailabilityInput {
  start_date: string;
  end_date: string;
  /** `HH:MM`, only valid when start_date === end_date. */
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
}

export function useCreateAvailability() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (input: AvailabilityInput) => {
      if (!user) throw new Error('Não autenticado');

      const { data: workspaceId, error: wsError } = await supabase.rpc('get_my_workspace_id');
      if (wsError) throw wsError;

      const row = {
        workspace_id: workspaceId,
        member_user_id: user.id,
        start_date: input.start_date,
        end_date: input.end_date,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        reason: input.reason ?? null,
      };

      const { data, error } = await supabase
        .from('collaborator_availability' as any)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CollaboratorAvailabilityRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Indisponibilidade registrada!');
    },
    onError: () => toast.error('Erro ao registrar indisponibilidade'),
  });
}

export function useDeleteAvailability() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collaborator_availability' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Indisponibilidade removida');
    },
    onError: () => toast.error('Erro ao remover indisponibilidade'),
  });
}
