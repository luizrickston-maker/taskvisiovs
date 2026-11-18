import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContextSafe } from '@/contexts/AuthContext';

/**
 * O usuário é admin (owner/admin) do seu workspace?
 *
 * O predicado é o da AD-006 — `workspace_members.role`. `user_roles` não serve
 * aqui: ele só carrega `collaborator` e `super_admin`, então um dono de
 * workspace apareceria como `user` e perderia o menu.
 *
 * Uma só queryKey para a página e o sidebar compartilharem o cache.
 */
export function useWorkspaceAdmin() {
  const auth = useAuthContextSafe();
  const user = auth?.user ?? null;

  return useQuery<boolean>({
    queryKey: ['workspace-admin', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: workspaceId } = await supabase.rpc('get_my_workspace_id');
      if (!workspaceId) return false;

      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user!.id)
        .maybeSingle();

      return !!data && ['owner', 'admin'].includes(data.role);
    },
  });
}
