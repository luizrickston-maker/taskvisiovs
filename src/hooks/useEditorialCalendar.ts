import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { 
  EditorialCalendarItem, 
  EditorialComment, 
  NewEditorialComment,
  EditorialCalendarItemUpdate,
  EditorialCalendarItemInput,
  ContentPlatform,
  ContentStatus
} from '@/types/editorial';

// Query keys
const EDITORIAL_ITEMS_KEY = 'editorial-calendar-items';
const EDITORIAL_COMMENTS_KEY = 'editorial-comments';

// Filters interface
interface EditorialCalendarFilters {
  platform?: ContentPlatform;
  status?: ContentStatus;
  assigned_to?: string;
  project_id?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * Hook para buscar itens do calendário editorial com filtros opcionais
 */
export function useEditorialCalendarItems(filters: EditorialCalendarFilters = {}) {
  const { user } = useAuthContext();
  const { editorialCalendarItems, setEditorialCalendarItems } = useAppStore();

  return useQuery({
    queryKey: [EDITORIAL_ITEMS_KEY, user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('editorial_calendar_items')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      // Apply filters
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.start_date) {
        query = query.gte('due_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('due_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sync with Zustand store
      if (data) {
        setEditorialCalendarItems(data as EditorialCalendarItem[]);
      }

      return (data || []) as EditorialCalendarItem[];
    },
    enabled: !!user?.id,
    initialData: editorialCalendarItems,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook de mutação para adicionar um novo item ao calendário
 */
export function useAddEditorialCalendarItem() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { addEditorialCalendarItem } = useAppStore();

  return useMutation({
    mutationFn: async (newItem: EditorialCalendarItemInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Fetch workspace_id if not provided
      let workspaceId = newItem.workspace_id ?? null;
      if (!workspaceId) {
        const { data: wsData } = await supabase.rpc('get_user_workspace_id');
        workspaceId = wsData ?? null;
      }

      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .insert({
          title: newItem.title,
          description: newItem.description,
          due_date: newItem.due_date,
          status: newItem.status,
          platform: newItem.platform,
          content_type: newItem.content_type,
          project_id: newItem.project_id,
          assigned_to: newItem.assigned_to,
          client_id: newItem.client_id ?? null,
          moodboard_refs: (newItem.moodboard_refs || []) as Json,
          ai_suggestions: (newItem.ai_suggestions || {}) as Json,
          user_id: user.id,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EditorialCalendarItem;
    },
    onSuccess: (data) => {
      // Optimistic update via Zustand
      addEditorialCalendarItem(data);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_ITEMS_KEY] });
      toast.success('Item adicionado ao calendário');
    },
    onError: (error) => {
      console.error('Error adding editorial item:', error);
      toast.error('Erro ao adicionar item');
    },
  });
}

/**
 * Hook de mutação para atualizar um item existente
 */
export function useUpdateEditorialCalendarItem() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { updateEditorialCalendarItem } = useAppStore();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EditorialCalendarItemUpdate }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Build update object with proper types
      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.platform !== undefined) updateData.platform = updates.platform;
      if (updates.content_type !== undefined) updateData.content_type = updates.content_type;
      if (updates.project_id !== undefined) updateData.project_id = updates.project_id;
      if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;
      if (updates.moodboard_refs !== undefined) updateData.moodboard_refs = updates.moodboard_refs;
      if (updates.ai_suggestions !== undefined) updateData.ai_suggestions = updates.ai_suggestions;

      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as EditorialCalendarItem;
    },
    onSuccess: (data) => {
      // Sync final data
      updateEditorialCalendarItem(data.id, data);
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_ITEMS_KEY] });
      toast.success('Item atualizado');
    },
    onError: (error, { id }, context) => {
      console.error('Error updating editorial item:', error);
      toast.error('Erro ao atualizar item');
      // Revert optimistic update by refetching
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_ITEMS_KEY] });
    },
  });
}

/**
 * Hook de mutação para remover um item
 */
export function useRemoveEditorialCalendarItem() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { deleteEditorialCalendarItem } = useAppStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('editorial_calendar_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Remove from Zustand store
      deleteEditorialCalendarItem(id);
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_ITEMS_KEY] });
      toast.success('Item removido');
    },
    onError: (error) => {
      console.error('Error removing editorial item:', error);
      toast.error('Erro ao remover item');
    },
  });
}

/**
 * Hook para buscar comentários de um item específico
 */
export function useEditorialComments(itemId: string | null) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: [EDITORIAL_COMMENTS_KEY, itemId],
    queryFn: async () => {
      if (!itemId || !user?.id) return [];

      const { data, error } = await supabase
        .from('editorial_comments')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as EditorialComment[];
    },
    enabled: !!itemId && !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook de mutação para adicionar um comentário
 */
export function useAddEditorialComment() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { addEditorialComment } = useAppStore();

  return useMutation({
    mutationFn: async (newComment: NewEditorialComment) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('editorial_comments')
        .insert({
          ...newComment,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EditorialComment;
    },
    onSuccess: (data) => {
      addEditorialComment(data);
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_COMMENTS_KEY, data.item_id] });
      toast.success('Comentário adicionado');
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    },
  });
}

/**
 * Hook de mutação para remover um comentário
 */
export function useRemoveEditorialComment() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { deleteEditorialComment } = useAppStore();

  return useMutation({
    mutationFn: async ({ id, itemId }: { id: string; itemId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('editorial_comments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return { id, itemId };
    },
    onSuccess: ({ id, itemId }) => {
      deleteEditorialComment(id);
      queryClient.invalidateQueries({ queryKey: [EDITORIAL_COMMENTS_KEY, itemId] });
      toast.success('Comentário removido');
    },
    onError: (error) => {
      console.error('Error removing comment:', error);
      toast.error('Erro ao remover comentário');
    },
  });
}

/**
 * Hook de mutação para atualizar status rapidamente (drag & drop, workflow)
 */
export function useUpdateEditorialItemStatus() {
  const { mutate, isPending } = useUpdateEditorialCalendarItem();

  const updateStatus = (id: string, status: ContentStatus) => {
    mutate({ id, updates: { status } });
  };

  return { updateStatus, isPending };
}

/**
 * Hook de mutação para mover item para outra data (drag & drop no calendário)
 */
export function useUpdateEditorialItemDate() {
  const { mutate, isPending } = useUpdateEditorialCalendarItem();

  const updateDate = (id: string, due_date: string) => {
    mutate({ id, updates: { due_date } });
  };

  return { updateDate, isPending };
}
