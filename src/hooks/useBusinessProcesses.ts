import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BusinessProcess {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  related_product_id: string | null;
  related_service_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useBusinessProcesses() {
  return useQuery({
    queryKey: ['business-processes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_processes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as BusinessProcess[];
    },
  });
}

export function useCreateBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (process: {
      name: string;
      description?: string;
      category?: string;
      related_product_id?: string;
      related_service_id?: string;
      workspace_id: string;
    }) => {
      const { data, error } = await supabase
        .from('business_processes')
        .insert(process)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Processo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar processo: ' + error.message);
    },
  });
}

export function useDeleteBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_processes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Processo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir processo: ' + error.message);
    },
  });
}

export function useDuplicateBusinessProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (process: BusinessProcess) => {
      const { data, error } = await supabase
        .from('business_processes')
        .insert({
          name: `${process.name} (Cópia)`,
          description: process.description,
          category: process.category,
          related_product_id: process.related_product_id,
          related_service_id: process.related_service_id,
          workspace_id: process.workspace_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Processo duplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar processo: ' + error.message);
    },
  });
}

export function useProcessInstances(processId?: string) {
  return useQuery({
    queryKey: ['process-instances', processId],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_instances')
        .select('*')
        .eq('process_id', processId!);

      if (error) throw error;
      return data;
    },
  });
}
