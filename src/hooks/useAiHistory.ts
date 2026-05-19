import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIConversation, AIMessage } from '@/types/ai';

export const aiHistoryKeys = {
  all: ['ai-history'] as const,
  conversations: () => [...aiHistoryKeys.all, 'conversations'] as const,
  messages: (conversationId: string) => [...aiHistoryKeys.all, 'messages', conversationId] as const,
};

async function fetchConversations(): Promise<AIConversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as AIConversation[];
}

async function fetchMessages(conversationId: string): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as AIMessage[];
}

export function useAIConversations() {
  return useQuery({
    queryKey: aiHistoryKeys.conversations(),
    queryFn: fetchConversations,
  });
}

export function useAIMessages(conversationId: string | null) {
  return useQuery({
    queryKey: aiHistoryKeys.messages(conversationId ?? ''),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, title }: { agentId?: string; title?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          agent_id: agentId,
          title: title || 'Nova Conversa',
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiHistoryKeys.conversations() });
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, role, content }: { conversationId: string; role: string; content: string }) => {
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: aiHistoryKeys.messages(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: aiHistoryKeys.conversations() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiHistoryKeys.conversations() });
    },
  });
}
