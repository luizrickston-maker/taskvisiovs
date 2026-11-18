import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FrameioConnectionStatus = 'disconnected' | 'connected' | 'requires_reconnect';

export interface FrameioConnection {
  status: FrameioConnectionStatus;
  workspaceName: string | null;
  accountName: string | null;
}

interface ConnectionRow {
  requires_reconnect?: boolean | null;
  frameio_workspace_name?: string | null;
  frameio_account_name?: string | null;
}

/**
 * Puro, para o teste não precisar de render: a RPC devolve um conjunto vazio
 * quando não há linha (ou o chamador não é admin), e é isso que vira
 * `disconnected` — nunca o carregamento nem o erro (AUTH-06, AUTH-07).
 */
export function toConnection(rows: ConnectionRow[] | null | undefined): FrameioConnection {
  const row = rows && rows.length > 0 ? rows[0] : null;
  if (!row) return { status: 'disconnected', workspaceName: null, accountName: null };

  return {
    status: row.requires_reconnect ? 'requires_reconnect' : 'connected',
    workspaceName: row.frameio_workspace_name ?? null,
    accountName: row.frameio_account_name ?? null,
  };
}

export function useFrameioConnection() {
  const query = useQuery<FrameioConnection>({
    queryKey: ['frameio-connection'],
    queryFn: async () => {
      // types.ts é gerado e ainda não conhece esta RPC — a migração que a
      // criou é nova. `never` é o escape até o types ser regenerado.
      const { data, error } = await supabase.rpc('frameio_connection_status' as never);
      if (error) throw error;
      return toConnection(data as ConnectionRow[] | null);
    },
  });

  return {
    /** `undefined` enquanto carrega ou falha — o chamador trata cada caso à parte. */
    connection: query.data,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
