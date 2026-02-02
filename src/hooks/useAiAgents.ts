import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIAgent, AIAgentCreate, AIAgentUpdate } from '@/types/ai';

// =====================================================
// Query Keys
// =====================================================

export const aiAgentsKeys = {
  all: ['ai-agents'] as const,
  list: () => [...aiAgentsKeys.all, 'list'] as const,
  detail: (id: string) => [...aiAgentsKeys.all, 'detail', id] as const,
  default: () => [...aiAgentsKeys.all, 'default'] as const,
};

// =====================================================
// Fetch Functions
// =====================================================

async function fetchAiAgents(): Promise<AIAgent[]> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useAiAgents] Error fetching agents:', error);
    throw new Error('Erro ao buscar agentes de IA');
  }

  return data as AIAgent[];
}

async function fetchAiAgentById(id: string): Promise<AIAgent | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[useAiAgents] Error fetching agent:', error);
    throw new Error('Erro ao buscar agente de IA');
  }

  return data as AIAgent | null;
}

async function fetchDefaultAiAgent(): Promise<AIAgent | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_default', true)
    .maybeSingle();

  if (error) {
    console.error('[useAiAgents] Error fetching default agent:', error);
    throw new Error('Erro ao buscar agente padrão');
  }

  return data as AIAgent | null;
}

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to fetch all AI agents for the current user
 */
export function useAiAgents() {
  return useQuery({
    queryKey: aiAgentsKeys.list(),
    queryFn: fetchAiAgents,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a specific AI agent by ID
 */
export function useAiAgent(id: string | undefined) {
  return useQuery({
    queryKey: aiAgentsKeys.detail(id ?? ''),
    queryFn: () => fetchAiAgentById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch the default AI agent
 */
export function useDefaultAiAgent() {
  return useQuery({
    queryKey: aiAgentsKeys.default(),
    queryFn: fetchDefaultAiAgent,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// Mutation Functions
// =====================================================

async function createAiAgent(agent: AIAgentCreate): Promise<AIAgent> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('ai_agents')
    .insert({
      ...agent,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[useAiAgents] Error creating agent:', error);
    throw new Error('Erro ao criar agente de IA');
  }

  return data as AIAgent;
}

async function updateAiAgent({ id, ...updates }: AIAgentUpdate): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAiAgents] Error updating agent:', error);
    throw new Error('Erro ao atualizar agente de IA');
  }

  return data as AIAgent;
}

async function deleteAiAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[useAiAgents] Error deleting agent:', error);
    throw new Error('Erro ao excluir agente de IA');
  }
}

async function setDefaultAgent(id: string): Promise<AIAgent> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // First, unset all other agents as default
  await supabase
    .from('ai_agents')
    .update({ is_default: false })
    .eq('user_id', user.id);

  // Then, set the selected agent as default
  const { data, error } = await supabase
    .from('ai_agents')
    .update({ is_default: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAiAgents] Error setting default agent:', error);
    throw new Error('Erro ao definir agente padrão');
  }

  return data as AIAgent;
}

async function toggleAgentActive(id: string, isActive: boolean): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAiAgents] Error toggling agent status:', error);
    throw new Error('Erro ao alterar status do agente');
  }

  return data as AIAgent;
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to create a new AI agent
 */
export function useCreateAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAiAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.all });
    },
  });
}

/**
 * Hook to update an existing AI agent
 */
export function useUpdateAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAiAgent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.all });
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete an AI agent
 */
export function useDeleteAiAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAiAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.all });
    },
  });
}

/**
 * Hook to set an agent as the default
 */
export function useSetDefaultAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setDefaultAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.all });
    },
  });
}

/**
 * Hook to toggle the active status of an AI agent
 */
export function useToggleAgentActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      toggleAgentActive(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.all });
      queryClient.invalidateQueries({ queryKey: aiAgentsKeys.detail(data.id) });
    },
  });
}
