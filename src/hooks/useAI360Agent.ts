import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  AI360ContextSummary, 
  AIAgent, 
  AIAgentCreate, 
  AIAgentUpdate,
  ChatMessage,
  ChatError 
} from '@/types/ai';

// =====================================================
// Query Keys
// =====================================================

export const ai360Keys = {
  all: ['ai-360'] as const,
  context: () => [...ai360Keys.all, 'context'] as const,
  agents: () => [...ai360Keys.all, 'agents'] as const,
  agent: (id: string) => [...ai360Keys.agents(), id] as const,
  defaultAgent: () => [...ai360Keys.agents(), 'default'] as const,
};

// =====================================================
// Fetch AI 360° Context
// =====================================================

async function fetchAI360Context(): Promise<AI360ContextSummary | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_user_360_summary', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('[useAI360Agent] Error fetching context:', error);
    throw new Error('Erro ao buscar contexto operacional');
  }

  return data as unknown as AI360ContextSummary;
}

/**
 * Hook to fetch the user's 360° operational context
 */
export function useAI360Context() {
  return useQuery({
    queryKey: ai360Keys.context(),
    queryFn: fetchAI360Context,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// AI Agents CRUD
// =====================================================

async function fetchAIAgents(): Promise<AIAgent[]> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[useAI360Agent] Error fetching agents:', error);
    throw new Error('Erro ao buscar agentes de IA');
  }

  return data as AIAgent[];
}

async function fetchDefaultAgent(): Promise<AIAgent | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[useAI360Agent] Error fetching default agent:', error);
    throw new Error('Erro ao buscar agente padrão');
  }

  return data as AIAgent | null;
}

async function fetchAgentById(id: string): Promise<AIAgent | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[useAI360Agent] Error fetching agent:', error);
    throw new Error('Erro ao buscar agente de IA');
  }

  return data as AIAgent | null;
}

/**
 * Hook to fetch all active AI agents for the current user
 */
export function useAIAgents() {
  return useQuery({
    queryKey: ai360Keys.agents(),
    queryFn: fetchAIAgents,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch the default AI agent
 */
export function useDefaultAIAgent() {
  return useQuery({
    queryKey: ai360Keys.defaultAgent(),
    queryFn: fetchDefaultAgent,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a specific AI agent by ID
 */
export function useAIAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: ai360Keys.agent(agentId ?? ''),
    queryFn: () => fetchAgentById(agentId!),
    enabled: !!agentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// AI Agent Mutations
// =====================================================

async function createAIAgent(agent: AIAgentCreate): Promise<AIAgent> {
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
    console.error('[useAI360Agent] Error creating agent:', error);
    throw new Error('Erro ao criar agente de IA');
  }

  return data as AIAgent;
}

async function updateAIAgent({ id, ...updates }: AIAgentUpdate): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAI360Agent] Error updating agent:', error);
    throw new Error('Erro ao atualizar agente de IA');
  }

  return data as AIAgent;
}

async function deleteAIAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[useAI360Agent] Error deleting agent:', error);
    throw new Error('Erro ao excluir agente de IA');
  }
}

async function setDefaultAgent(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // First, unset all defaults for this user
  await supabase
    .from('ai_agents')
    .update({ is_default: false })
    .eq('user_id', user.id);

  // Then set the new default
  const { error } = await supabase
    .from('ai_agents')
    .update({ is_default: true })
    .eq('id', id);

  if (error) {
    console.error('[useAI360Agent] Error setting default agent:', error);
    throw new Error('Erro ao definir agente padrão');
  }
}

/**
 * Hook to create a new AI agent
 */
export function useCreateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAIAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ai360Keys.agents() });
    },
  });
}

/**
 * Hook to update an existing AI agent
 */
export function useUpdateAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAIAgent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ai360Keys.agents() });
      queryClient.invalidateQueries({ queryKey: ai360Keys.agent(data.id) });
      if (data.is_default) {
        queryClient.invalidateQueries({ queryKey: ai360Keys.defaultAgent() });
      }
    },
  });
}

/**
 * Hook to delete an AI agent
 */
export function useDeleteAIAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAIAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ai360Keys.agents() });
      queryClient.invalidateQueries({ queryKey: ai360Keys.defaultAgent() });
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
      queryClient.invalidateQueries({ queryKey: ai360Keys.agents() });
      queryClient.invalidateQueries({ queryKey: ai360Keys.defaultAgent() });
    },
  });
}

// =====================================================
// Chat with AI Agent (Streaming)
// =====================================================

interface AskAI360Params {
  messages: ChatMessage[];
  agentId?: string;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * Sends a chat request to the AI 360 Agent with streaming support
 */
async function askAI360Agent({
  messages,
  agentId,
  onChunk,
  signal,
}: AskAI360Params): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-360-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      messages,
      agent_id: agentId,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ChatError;
    
    if (response.status === 429) {
      throw new Error(errorData.error || 'Limite de requisições excedido. Aguarde alguns minutos.');
    }
    if (response.status === 402) {
      throw new Error(errorData.error || 'Créditos de IA esgotados.');
    }
    if (response.status === 401) {
      throw new Error(errorData.error || 'Sessão expirada. Faça login novamente.');
    }
    
    throw new Error(errorData.error || 'Erro ao processar solicitação de IA');
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Resposta inválida do servidor');
  }

  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullContent += content;
              onChunk?.(content);
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

/**
 * Hook for sending messages to the AI 360 Agent with streaming
 */
export function useAskAI360Agent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: askAI360Agent,
    onSuccess: () => {
      // Optionally invalidate context after successful chat
      // to refresh data if AI made suggestions
      queryClient.invalidateQueries({ queryKey: ai360Keys.context() });
    },
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Returns the current agent configuration or default values
 */
export function useCurrentAgentConfig() {
  const { data: defaultAgent, isLoading } = useDefaultAIAgent();
  
  return {
    agent: defaultAgent,
    isLoading,
    modelName: defaultAgent?.model_name ?? 'google/gemini-3-flash-preview',
    temperature: defaultAgent?.temperature ?? 0.7,
    maxTokens: defaultAgent?.max_tokens ?? 4096,
    contextPriority: defaultAgent?.context_priority ?? [
      'tasks',
      'projects',
      'sales_pipeline',
      'schedule',
      'editorial',
      'team',
    ],
  };
}
