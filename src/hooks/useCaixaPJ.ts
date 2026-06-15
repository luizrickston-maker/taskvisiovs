import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  CaixaCategoria,
  CaixaTransacao,
  ContaPagar,
  CaixaTipo,
  CaixaFormaPagamento,
  ContaPagarStatus,
  ContaPagarFrequencia,
} from '@/types/caixa';

// =====================================================
// Query Keys
// =====================================================

export const caixaPJKeys = {
  all: ['caixa-pj'] as const,
  categorias: (wsId: string) => [...caixaPJKeys.all, 'categorias', wsId] as const,
  transacoes: (wsId: string) => [...caixaPJKeys.all, 'transacoes', wsId] as const,
  contasPagar: (wsId: string) => [...caixaPJKeys.all, 'contas-pagar', wsId] as const,
};

// =====================================================
// Workspace ID helper
// =====================================================

async function getWorkspaceId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_workspace_id');
  if (error || !data) return null;
  return data as string;
}

// =====================================================
// Categorias
// =====================================================

export function useCaixaCategorias() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['caixa-pj-categorias', user?.id],
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return [];

      const { data, error } = await supabase
        .from('pj_caixa_categorias')
        .select('*')
        .eq('workspace_id', wsId)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as CaixaCategoria[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCaixaCategoria() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (payload: {
      nome: string;
      tipo: 'entrada' | 'saida' | 'ambos';
      cor?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const wsId = await getWorkspaceId();
      if (!wsId) throw new Error('Workspace não encontrado');

      const { data, error } = await supabase
        .from('pj_caixa_categorias')
        .insert({ workspace_id: wsId, ...payload })
        .select()
        .single();

      if (error) throw error;
      return data as CaixaCategoria;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-categorias'] });
      toast.success('Categoria criada!');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });
}

export function useDeleteCaixaCategoria() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pj_caixa_categorias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-categorias'] });
      toast.success('Categoria removida');
    },
    onError: () => toast.error('Erro ao remover categoria'),
  });
}

// =====================================================
// Transações
// =====================================================

export function useCaixaTransacoes(filters?: {
  tipo?: CaixaTipo;
  dataInicio?: string;
  dataFim?: string;
}) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['caixa-pj-transacoes', user?.id, filters],
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return [];

      let query = supabase
        .from('pj_caixa_transacoes')
        .select('*, categoria:pj_caixa_categorias(*)')
        .eq('workspace_id', wsId)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.dataInicio) query = query.gte('data', filters.dataInicio);
      if (filters?.dataFim) query = query.lte('data', filters.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return data as CaixaTransacao[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTransacao() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (payload: {
      tipo: CaixaTipo;
      descricao: string;
      valor: number;
      data: string;
      origem_destino?: string;
      categoria_id?: string;
      forma_pagamento?: CaixaFormaPagamento;
      observacoes?: string;
      referencia?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const wsId = await getWorkspaceId();
      if (!wsId) throw new Error('Workspace não encontrado');

      const { data, error } = await supabase
        .from('pj_caixa_transacoes')
        .insert({ workspace_id: wsId, created_by: user.id, ...payload })
        .select('*, categoria:pj_caixa_categorias(*)')
        .single();

      if (error) throw error;
      return data as CaixaTransacao;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-transacoes'] });
      toast.success('Transação registrada!');
    },
    onError: (e: any) => toast.error(`Erro ao registrar transação: ${e?.message ?? 'Verifique o console'}`),
  });
}

export function useUpdateTransacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<CaixaTransacao> & { id: string }) => {
      const { data, error } = await supabase
        .from('pj_caixa_transacoes')
        .update(payload)
        .eq('id', id)
        .select('*, categoria:pj_caixa_categorias(*)')
        .single();
      if (error) throw error;
      return data as CaixaTransacao;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-transacoes'] });
      toast.success('Transação atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar transação'),
  });
}

export function useDeleteTransacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pj_caixa_transacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-transacoes'] });
      toast.success('Transação removida');
    },
    onError: () => toast.error('Erro ao remover transação'),
  });
}

// =====================================================
// Contas a Pagar
// =====================================================

export function useContasPagar(filtroStatus?: ContaPagarStatus | 'todos') {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['caixa-pj-contas-pagar', user?.id, filtroStatus],
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return [];

      let query = supabase
        .from('pj_contas_pagar')
        .select('*, categoria:pj_caixa_categorias(*)')
        .eq('workspace_id', wsId)
        .order('data_vencimento', { ascending: true });

      if (filtroStatus && filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContaPagar[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateContaPagar() {
  const qc = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (payload: {
      descricao: string;
      fornecedor?: string;
      valor: number;
      data_vencimento: string;
      categoria_id?: string;
      forma_pagamento?: CaixaFormaPagamento;
      recorrente?: boolean;
      frequencia?: ContaPagarFrequencia;
      observacoes?: string;
    }) => {
      if (!user) throw new Error('Não autenticado');
      const wsId = await getWorkspaceId();
      if (!wsId) throw new Error('Workspace não encontrado');

      const { data, error } = await supabase
        .from('pj_contas_pagar')
        .insert({
          workspace_id: wsId,
          created_by: user.id,
          status: 'pendente',
          recorrente: false,
          ...payload,
        })
        .select('*, categoria:pj_caixa_categorias(*)')
        .single();

      if (error) throw error;
      return data as ContaPagar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-contas-pagar'] });
      toast.success('Conta a pagar registrada!');
    },
    onError: (e: any) => toast.error(`Erro ao registrar conta: ${e?.message ?? 'Verifique o console'}`),
  });
}

export function useUpdateContaPagar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<ContaPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from('pj_contas_pagar')
        .update(payload)
        .eq('id', id)
        .select('*, categoria:pj_caixa_categorias(*)')
        .single();
      if (error) throw error;
      return data as ContaPagar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-contas-pagar'] });
      toast.success('Conta atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar conta'),
  });
}

export function useMarcarContaPaga() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      forma_pagamento,
      data_pagamento,
    }: {
      id: string;
      forma_pagamento?: CaixaFormaPagamento;
      data_pagamento?: string;
    }) => {
      const { data, error } = await supabase
        .from('pj_contas_pagar')
        .update({
          status: 'pago',
          data_pagamento: data_pagamento ?? new Date().toISOString().split('T')[0],
          ...(forma_pagamento ? { forma_pagamento } : {}),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ContaPagar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-contas-pagar'] });
      toast.success('Conta marcada como paga!');
    },
    onError: () => toast.error('Erro ao marcar conta como paga'),
  });
}

export function useDeleteContaPagar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pj_contas_pagar').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caixa-pj-contas-pagar'] });
      toast.success('Conta removida');
    },
    onError: () => toast.error('Erro ao remover conta'),
  });
}
