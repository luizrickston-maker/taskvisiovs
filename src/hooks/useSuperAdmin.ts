import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContextSafe } from '@/contexts/AuthContext';

export function useSuperAdmin() {
  const authContext = useAuthContextSafe();
  const userId = authContext?.user?.id;

  const { data: isSuperAdmin, isLoading } = useQuery({
    queryKey: ['super-admin-check', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('is_super_admin', { _user_id: userId });
      if (error) return false;
      return data === true;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return { isSuperAdmin: isSuperAdmin ?? false, isLoading };
}
