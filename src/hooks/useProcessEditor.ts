import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BusinessProcess, ProcessStep, ProcessConnection } from '@/types/business';

export type { ProcessStep, ProcessConnection };

export interface ProcessWithDetails extends BusinessProcess {
  steps: ProcessStep[];
  connections: ProcessConnection[];
}

export function useProcess(processId: string | undefined) {
  return useQuery({
    queryKey: ['process', processId],
    enabled: !!processId,
    queryFn: async (): Promise<ProcessWithDetails> => {
      const { data: process, error: pErr } = await supabase
        .from('business_processes')
        .select('*')
        .eq('id', processId!)
        .single();
      if (pErr) throw pErr;

      const [stepsRes, connsRes] = await Promise.all([
        supabase.from('process_steps').select('*').eq('process_id', processId!).order('order_index'),
        supabase.from('process_connections').select('*').eq('process_id', processId!),
      ]);

      if (stepsRes.error) throw stepsRes.error;
      if (connsRes.error) throw connsRes.error;

      return {
        ...process,
        steps: stepsRes.data as ProcessStep[],
        connections: connsRes.data as ProcessConnection[],
      };
    },
  });
}

export function useUpdateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; category?: string }) => {
      const { error } = await supabase.from('business_processes').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['process', vars.id] });
      qc.invalidateQueries({ queryKey: ['business-processes'] });
    },
    onError: (e: Error) => toast.error('Erro ao atualizar processo: ' + e.message),
  });
}

export function useCreateProcessStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: {
      process_id: string;
      title: string;
      order_index: number;
      position_x: number;
      position_y: number;
      node_type?: string;
      icon?: string;
      color_scheme?: string;
      description?: string;
      estimated_time?: string;
      responsible_role?: string;
      support_links?: any;
    }) => {
      const { data, error } = await supabase.from('process_steps').insert(step).select().single();
      if (error) throw error;
      return data as ProcessStep;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['process', data.process_id] });
    },
    onError: (e: Error) => toast.error('Erro ao criar etapa: ' + e.message),
  });
}

export function useUpdateProcessStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, process_id, ...updates }: Partial<ProcessStep> & { id: string; process_id: string }) => {
      const { error } = await supabase.from('process_steps').update(updates).eq('id', id);
      if (error) throw error;
      return process_id;
    },
    onSuccess: (processId) => {
      qc.invalidateQueries({ queryKey: ['process', processId] });
    },
    onError: (e: Error) => toast.error('Erro ao atualizar etapa: ' + e.message),
  });
}

export function useDeleteProcessStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, process_id }: { id: string; process_id: string }) => {
      const { error } = await supabase.from('process_steps').delete().eq('id', id);
      if (error) throw error;
      return process_id;
    },
    onSuccess: (processId) => {
      qc.invalidateQueries({ queryKey: ['process', processId] });
    },
    onError: (e: Error) => toast.error('Erro ao excluir etapa: ' + e.message),
  });
}

export function useCreateProcessConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conn: {
      process_id: string;
      source_step_id: string;
      target_step_id: string;
      label?: string;
      connection_type?: string;
      animated?: boolean;
    }) => {
      const { data, error } = await supabase.from('process_connections').insert(conn).select().single();
      if (error) throw error;
      return data as ProcessConnection;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['process', data.process_id] });
    },
    onError: (e: Error) => toast.error('Erro ao criar conexão: ' + e.message),
  });
}

export function useDeleteProcessConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, process_id }: { id: string; process_id: string }) => {
      const { error } = await supabase.from('process_connections').delete().eq('id', id);
      if (error) throw error;
      return process_id;
    },
    onSuccess: (processId) => {
      qc.invalidateQueries({ queryKey: ['process', processId] });
    },
    onError: (e: Error) => toast.error('Erro ao excluir conexão: ' + e.message),
  });
}
