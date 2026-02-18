import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ClientPortalInfo {
  client_id: string;
  workspace_id: string;
  client_name: string;
  client_company: string | null;
  email: string;
  is_active: boolean;
}

export function useClientPortalInfo() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['client-portal-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_portal_info');
      if (error) throw error;
      return data as unknown as ClientPortalInfo | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Check if the current user is ONLY a client portal user (not a workspace member).
 */
export function useIsClientPortalUser() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ['is-client-portal-user', user?.id],
    queryFn: async () => {
      // Check workspace membership
      const { data: membership } = await supabase.rpc('get_my_workspace_id');

      if (membership) {
        // Has a workspace → regular app user
        return false;
      }

      // No workspace → check if they're a client user
      const { data: clientUserData } = await supabase
        .from('client_users')
        .select('id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      return !!clientUserData;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
