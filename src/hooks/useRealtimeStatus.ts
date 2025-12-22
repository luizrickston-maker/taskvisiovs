import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

export function useRealtimeStatus(userId: string | undefined) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');

  useEffect(() => {
    if (!userId) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    const channel = supabase
      .channel('realtime-status-check')
      .on('presence', { event: 'sync' }, () => {
        setStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        } else if (status === 'TIMED_OUT') {
          setStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return status;
}
