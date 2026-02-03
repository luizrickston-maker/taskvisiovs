import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import type { UserIncomeCategory, UserDebtCategory } from '@/types/database';

// =====================================================
// Query Keys
// =====================================================

export const financeCategoryKeys = {
  all: ['finance-categories'] as const,
  incomeCategories: () => [...financeCategoryKeys.all, 'income'] as const,
  debtCategories: () => [...financeCategoryKeys.all, 'debt'] as const,
};

// =====================================================
// User Income Categories Hooks
// =====================================================

export function useUserIncomeCategories() {
  const { user } = useAuthContext();
  const { userIncomeCategories } = useAppStore();

  return useQuery({
    queryKey: financeCategoryKeys.incomeCategories(),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_income_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as UserIncomeCategory[];
    },
    enabled: !!user,
    initialData: userIncomeCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateUserIncomeCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { addUserIncomeCategory } = useAppStore();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const newCategory = {
        user_id: user.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      };

      const { data: result, error } = await supabase
        .from('user_income_categories')
        .insert(newCategory)
        .select()
        .single();

      if (error) throw error;
      return result as UserIncomeCategory;
    },
    onSuccess: (data) => {
      addUserIncomeCategory(data);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.incomeCategories() });
      toast.success('Categoria de ganho criada!');
    },
    onError: (error) => {
      console.error('Error creating income category:', error);
      toast.error('Erro ao criar categoria de ganho');
    },
  });
}

export function useUpdateUserIncomeCategory() {
  const queryClient = useQueryClient();
  const { updateUserIncomeCategory } = useAppStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string }) => {
      const updates: Partial<UserIncomeCategory> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.description !== undefined) updates.description = data.description?.trim() || undefined;

      const { data: result, error } = await supabase
        .from('user_income_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as UserIncomeCategory;
    },
    onSuccess: (data) => {
      updateUserIncomeCategory(data.id, data);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.incomeCategories() });
      toast.success('Categoria de ganho atualizada!');
    },
    onError: (error) => {
      console.error('Error updating income category:', error);
      toast.error('Erro ao atualizar categoria de ganho');
    },
  });
}

export function useDeleteUserIncomeCategory() {
  const queryClient = useQueryClient();
  const { deleteUserIncomeCategory } = useAppStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_income_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      deleteUserIncomeCategory(id);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.incomeCategories() });
      toast.success('Categoria de ganho removida!');
    },
    onError: (error) => {
      console.error('Error deleting income category:', error);
      toast.error('Erro ao remover categoria de ganho');
    },
  });
}

// =====================================================
// User Debt Categories Hooks
// =====================================================

export function useUserDebtCategories() {
  const { user } = useAuthContext();
  const { userDebtCategories } = useAppStore();

  return useQuery({
    queryKey: financeCategoryKeys.debtCategories(),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_debt_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as UserDebtCategory[];
    },
    enabled: !!user,
    initialData: userDebtCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateUserDebtCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { addUserDebtCategory } = useAppStore();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const newCategory = {
        user_id: user.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      };

      const { data: result, error } = await supabase
        .from('user_debt_categories')
        .insert(newCategory)
        .select()
        .single();

      if (error) throw error;
      return result as UserDebtCategory;
    },
    onSuccess: (data) => {
      addUserDebtCategory(data);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.debtCategories() });
      toast.success('Categoria de dívida criada!');
    },
    onError: (error) => {
      console.error('Error creating debt category:', error);
      toast.error('Erro ao criar categoria de dívida');
    },
  });
}

export function useUpdateUserDebtCategory() {
  const queryClient = useQueryClient();
  const { updateUserDebtCategory } = useAppStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string }) => {
      const updates: Partial<UserDebtCategory> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.description !== undefined) updates.description = data.description?.trim() || undefined;

      const { data: result, error } = await supabase
        .from('user_debt_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as UserDebtCategory;
    },
    onSuccess: (data) => {
      updateUserDebtCategory(data.id, data);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.debtCategories() });
      toast.success('Categoria de dívida atualizada!');
    },
    onError: (error) => {
      console.error('Error updating debt category:', error);
      toast.error('Erro ao atualizar categoria de dívida');
    },
  });
}

export function useDeleteUserDebtCategory() {
  const queryClient = useQueryClient();
  const { deleteUserDebtCategory } = useAppStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_debt_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      deleteUserDebtCategory(id);
      queryClient.invalidateQueries({ queryKey: financeCategoryKeys.debtCategories() });
      toast.success('Categoria de dívida removida!');
    },
    onError: (error) => {
      console.error('Error deleting debt category:', error);
      toast.error('Erro ao remover categoria de dívida');
    },
  });
}
