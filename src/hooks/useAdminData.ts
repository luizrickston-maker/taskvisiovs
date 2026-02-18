import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Workspace, Client, ClientUser, CompanyUser } from '@/types/admin';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const adminQueryKeys = {
  workspaces: ['super-admin-workspaces'] as const,
  workspace: (id: string) => ['super-admin-workspace', id] as const,
  clients: (workspaceId: string) => ['super-admin-ws-clients', workspaceId] as const,
  clientUsers: (clientId: string) => ['super-admin-client-users', clientId] as const,
  companyUsers: (workspaceId: string) => ['super-admin-company-users', workspaceId] as const,
};

// ─── Workspace Hooks ──────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery({
    queryKey: adminQueryKeys.workspaces,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Workspace[];
    },
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: adminQueryKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!workspaceId,
  });
}

// ─── Client Hooks ─────────────────────────────────────────────────────────────

export function useClientsForWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: adminQueryKeys.clients(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, workspace_id, name, email, company_name, phone, notes, is_active, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!workspaceId,
  });
}

// ─── Client Users Hooks ───────────────────────────────────────────────────────

export function useClientUsersForClient(clientId: string) {
  return useQuery({
    queryKey: adminQueryKeys.clientUsers(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientUser[];
    },
    enabled: !!clientId,
  });
}

// ─── Company Users Hooks ──────────────────────────────────────────────────────

export function useCompanyUsersForWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: adminQueryKeys.companyUsers(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CompanyUser[];
    },
    enabled: !!workspaceId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workspace> }) => {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspace(id) });
      toast.success('Workspace atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar workspace'),
  });
}

export function useSuspendWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ status: suspend ? 'suspended' : 'active' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id, suspend }) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspace(id) });
      toast.success(suspend ? 'Workspace suspenso!' : 'Workspace reativado!');
    },
    onError: () => toast.error('Erro ao alterar status do workspace'),
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces });
      toast.success('Workspace deletado com sucesso!');
    },
    onError: () => toast.error('Erro ao deletar workspace'),
  });
}
