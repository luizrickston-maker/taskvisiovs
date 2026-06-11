import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

// ─── Feature keys disponíveis ────────────────────────────────────────────────

export type FeatureKey =
  | 'agenda'          // Acesso à Agenda PJ
  | 'briefings'       // Ver briefings vinculados a tarefas
  | 'commercial'      // Ver tela de Comercial/Prospects
  | 'financial_view'  // Ver resumo financeiro próprio
  | 'projects_full';  // Ver todos os projetos (não só os atribuídos)

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const FEATURE_DEFINITIONS: FeatureMeta[] = [
  {
    key: 'agenda',
    label: 'Agenda',
    description: 'Permite visualizar e gerenciar compromissos no calendário.',
    defaultEnabled: true,
  },
  {
    key: 'briefings',
    label: 'Briefings',
    description: 'Permite acessar briefings de vídeo vinculados às tarefas.',
    defaultEnabled: true,
  },
  {
    key: 'commercial',
    label: 'Comercial',
    description: 'Permite visualizar a tela de prospects e clientes comerciais.',
    defaultEnabled: false,
  },
  {
    key: 'financial_view',
    label: 'Financeiro (leitura)',
    description: 'Permite visualizar um resumo financeiro próprio do colaborador.',
    defaultEnabled: false,
  },
  {
    key: 'projects_full',
    label: 'Todos os Projetos',
    description: 'Permite ver todos os projetos do workspace, não só os atribuídos.',
    defaultEnabled: false,
  },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CollaboratorPermissionRow {
  feature_key: string;
  enabled: boolean;
}

// ─── Hook para o próprio colaborador (usa user.id) ────────────────────────────

export function useCollaboratorPermissions(targetUserId?: string) {
  const { user } = useAuthContext();
  const userId = targetUserId ?? user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['collaborator-permissions', userId],
    queryFn: async (): Promise<Map<string, boolean>> => {
      if (!userId) return new Map();

      const { data: rows, error } = await supabase
        .from('collaborator_permissions')
        .select('feature_key, enabled')
        .eq('member_user_id', userId);

      if (error) {
        console.error('useCollaboratorPermissions:', error.message);
        return new Map();
      }

      const map = new Map<string, boolean>();
      (rows as CollaboratorPermissionRow[]).forEach((r) =>
        map.set(r.feature_key, r.enabled),
      );
      return map;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Verifica se uma feature está habilitada.
   * Fallback seguro: usa o `defaultEnabled` da definição enquanto carrega.
   */
  const can = (key: FeatureKey): boolean => {
    if (isLoading || !data) {
      const def = FEATURE_DEFINITIONS.find((f) => f.key === key);
      return def?.defaultEnabled ?? false;
    }
    if (!data.has(key)) {
      const def = FEATURE_DEFINITIONS.find((f) => f.key === key);
      return def?.defaultEnabled ?? false;
    }
    return data.get(key) ?? false;
  };

  return { can, isLoading, permissions: data ?? new Map() };
}

// ─── Hook para o gestor (lê e escreve permissões de um colaborador) ───────────

export function useManageCollaboratorPermissions(
  memberUserId: string | null | undefined,
  workspaceId: string | null | undefined,
) {
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['collaborator-permissions', memberUserId],
    queryFn: async (): Promise<CollaboratorPermissionRow[]> => {
      if (!memberUserId) return [];

      const { data, error } = await supabase
        .from('collaborator_permissions')
        .select('feature_key, enabled')
        .eq('member_user_id', memberUserId);

      if (error) {
        console.error('useManageCollaboratorPermissions:', error.message);
        return [];
      }
      return (data ?? []) as CollaboratorPermissionRow[];
    },
    enabled: !!memberUserId,
    staleTime: 30 * 1000,
  });

  // Retorna um Map para lookup O(1)
  const permissionsMap = new Map<string, boolean>(
    (rows ?? []).map((r) => [r.feature_key, r.enabled]),
  );

  const isEnabled = (key: FeatureKey): boolean => {
    if (!permissionsMap.has(key)) {
      const def = FEATURE_DEFINITIONS.find((f) => f.key === key);
      return def?.defaultEnabled ?? false;
    }
    return permissionsMap.get(key) ?? false;
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: FeatureKey; enabled: boolean }) => {
      if (!memberUserId || !workspaceId) throw new Error('memberUserId e workspaceId são obrigatórios');

      const { error } = await supabase
        .from('collaborator_permissions')
        .upsert(
          {
            workspace_id: workspaceId,
            member_user_id: memberUserId,
            feature_key: key,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id,member_user_id,feature_key' },
        );

      if (error) throw error;
    },
    onMutate: async ({ key, enabled }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['collaborator-permissions', memberUserId] });
      const prev = queryClient.getQueryData<CollaboratorPermissionRow[]>([
        'collaborator-permissions', memberUserId,
      ]);
      queryClient.setQueryData<CollaboratorPermissionRow[]>(
        ['collaborator-permissions', memberUserId],
        (old) => {
          const list = old ? [...old] : [];
          const idx = list.findIndex((r) => r.feature_key === key);
          if (idx >= 0) list[idx] = { ...list[idx], enabled };
          else list.push({ feature_key: key, enabled });
          return list;
        },
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(['collaborator-permissions', memberUserId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-permissions', memberUserId] });
    },
  });

  return { isEnabled, isLoading, toggle: toggleMutation.mutate, isToggling: toggleMutation.isPending };
}