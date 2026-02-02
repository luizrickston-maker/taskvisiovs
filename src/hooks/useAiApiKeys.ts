import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AiApiKey, AiApiKeyCreate, AiApiKeyUpdate } from '@/types/ai';

// =====================================================
// Query Keys
// =====================================================

export const aiApiKeysKeys = {
  all: ['ai-api-keys'] as const,
  list: () => [...aiApiKeysKeys.all, 'list'] as const,
  detail: (id: string) => [...aiApiKeysKeys.all, 'detail', id] as const,
  byProvider: (provider: string) => [...aiApiKeysKeys.all, 'provider', provider] as const,
};

// =====================================================
// Fetch Functions
// =====================================================

async function fetchAiApiKeys(): Promise<AiApiKey[]> {
  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useAiApiKeys] Error fetching API keys:', error);
    throw new Error('Erro ao buscar chaves de API');
  }

  return data as AiApiKey[];
}

async function fetchActiveAiApiKeys(): Promise<AiApiKey[]> {
  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useAiApiKeys] Error fetching active API keys:', error);
    throw new Error('Erro ao buscar chaves de API ativas');
  }

  return data as AiApiKey[];
}

async function fetchAiApiKeyById(id: string): Promise<AiApiKey | null> {
  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[useAiApiKeys] Error fetching API key:', error);
    throw new Error('Erro ao buscar chave de API');
  }

  return data as AiApiKey | null;
}

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to fetch all AI API keys for the current user
 */
export function useAiApiKeys() {
  return useQuery({
    queryKey: aiApiKeysKeys.list(),
    queryFn: fetchAiApiKeys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch only active AI API keys
 */
export function useActiveAiApiKeys() {
  return useQuery({
    queryKey: [...aiApiKeysKeys.list(), 'active'],
    queryFn: fetchActiveAiApiKeys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a specific AI API key by ID
 */
export function useAiApiKey(id: string | undefined) {
  return useQuery({
    queryKey: aiApiKeysKeys.detail(id ?? ''),
    queryFn: () => fetchAiApiKeyById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// Mutation Functions
// =====================================================

async function createAiApiKey(apiKey: AiApiKeyCreate): Promise<AiApiKey> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('ai_api_keys')
    .insert({
      ...apiKey,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[useAiApiKeys] Error creating API key:', error);
    throw new Error('Erro ao criar chave de API');
  }

  return data as AiApiKey;
}

async function updateAiApiKey({ id, ...updates }: AiApiKeyUpdate): Promise<AiApiKey> {
  const { data, error } = await supabase
    .from('ai_api_keys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAiApiKeys] Error updating API key:', error);
    throw new Error('Erro ao atualizar chave de API');
  }

  return data as AiApiKey;
}

async function deleteAiApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_api_keys')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[useAiApiKeys] Error deleting API key:', error);
    throw new Error('Erro ao excluir chave de API');
  }
}

async function toggleAiApiKeyStatus(id: string, isActive: boolean): Promise<AiApiKey> {
  const { data, error } = await supabase
    .from('ai_api_keys')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[useAiApiKeys] Error toggling API key status:', error);
    throw new Error('Erro ao alterar status da chave de API');
  }

  return data as AiApiKey;
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to create a new AI API key
 */
export function useCreateAiApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAiApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.all });
    },
  });
}

/**
 * Hook to update an existing AI API key
 */
export function useUpdateAiApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAiApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.all });
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete an AI API key
 */
export function useDeleteAiApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAiApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.all });
    },
  });
}

/**
 * Hook to toggle the active status of an AI API key
 */
export function useToggleAiApiKeyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      toggleAiApiKeyStatus(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.all });
      queryClient.invalidateQueries({ queryKey: aiApiKeysKeys.detail(data.id) });
    },
  });
}

// =====================================================
// Utility: Mask API Key for Display
// =====================================================

/**
 * Masks an API key for secure display (shows first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '••••••••';
  }
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
}

/**
 * Provider display names
 */
export const AI_PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google AI' },
  { value: 'anthropic', label: 'Anthropic' },
] as const;

export type AiProvider = typeof AI_PROVIDER_OPTIONS[number]['value'];
