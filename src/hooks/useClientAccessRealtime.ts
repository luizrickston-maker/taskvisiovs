import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export type AccessStatus = 'loading' | 'active' | 'inactive' | 'unknown';

/**
 * Subscribes in real-time to the client_users row for the current user.
 * Returns the current access status without requiring a page reload.
 */
export function useClientAccessRealtime(workspaceId?: string) {
  const { user } = useAuthContext();
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [clientUserId, setClientUserId] = useState<string | null>(null);

  // Initial fetch to get current status
  useEffect(() => {
    if (!user) {
      setStatus('unknown');
      return;
    }

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('id, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setStatus('unknown');
        return;
      }

      setClientUserId(data.id);
      setStatus(data.is_active ? 'active' : 'inactive');
    };

    fetchInitial();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !clientUserId) return;

    const channel = supabase
      .channel(`client-access-${clientUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_users',
          filter: `id=eq.${clientUserId}`,
        },
        (payload) => {
          const updated = payload.new as { is_active: boolean };
          setStatus(updated.is_active ? 'active' : 'inactive');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, clientUserId]);

  return status;
}
