import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import type { TimeBlock } from '@/types/database';

// =====================================================
// Helpers (exported for use in component + AI handler)
// =====================================================

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function hasConflict(
  a: { date?: string; start_time?: string; end_time?: string; id?: string },
  b: TimeBlock
): boolean {
  if (!a.date || a.date !== b.date) return false;
  if (a.id && a.id === b.id) return false;
  if (!a.start_time || !a.end_time) return false;
  const aStart = timeToMinutes(a.start_time);
  const aEnd = timeToMinutes(a.end_time);
  const bStart = timeToMinutes(b.start_time);
  const bEnd = timeToMinutes(b.end_time);
  return aStart < bEnd && aEnd > bStart;
}

const QUERY_KEY = 'agenda-pj-timeblocks';

// =====================================================
// Queries
// =====================================================

export function useTimeBlocks(dateFrom: string, dateTo: string) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('completed', false)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data || []) as TimeBlock[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

// =====================================================
// Mutations
// =====================================================

export interface CreateTimeBlockPayload {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  color?: string;
}

export function useCreateTimeBlock() {
  const qc = useQueryClient();
  const { user } = useAuthContext();
  const { addTimeBlock } = useAppStore();

  return useMutation({
    mutationFn: async (payload: CreateTimeBlockPayload) => {
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('time_blocks')
        .insert({ user_id: user.id, completed: false, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data as TimeBlock;
    },
    onSuccess: (data) => {
      addTimeBlock(data as any);
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Compromisso criado!');
    },
    onError: () => toast.error('Erro ao criar compromisso'),
  });
}

export function useUpdateTimeBlock() {
  const qc = useQueryClient();
  const { updateTimeBlock } = useAppStore();

  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TimeBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('time_blocks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TimeBlock;
    },
    onSuccess: (data) => {
      updateTimeBlock(data.id, data as any);
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Compromisso atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar compromisso'),
  });
}

export function useDeleteTimeBlock() {
  const qc = useQueryClient();
  const { deleteTimeBlock } = useAppStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_blocks').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      deleteTimeBlock(id);
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Compromisso removido');
    },
    onError: () => toast.error('Erro ao remover compromisso'),
  });
}
