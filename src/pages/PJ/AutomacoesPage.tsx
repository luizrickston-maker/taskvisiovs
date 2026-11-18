import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFrameioConnection } from '@/hooks/useFrameioConnection';
import {
  useFrameioCreateStructure,
  type CreateStructureInput,
} from '@/hooks/useFrameioCreateStructure';
import { FrameioConnectionCard } from '@/components/automacoes/FrameioConnectionCard';
import {
  ClientStructureForm,
  type ClientOption,
} from '@/components/automacoes/ClientStructureForm';
import {
  VideoProjectForm,
  type VideoRunInput,
} from '@/components/automacoes/VideoProjectForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Flow = 'client_structure' | 'video_project';

/**
 * MENU-03 exige que a página não mostre **nenhuma** ação de conexão ou de
 * criação para quem não é admin do workspace. O predicado é o da AD-006
 * (`workspace_members.role` em owner/admin), não a role global de `user_roles`.
 */
function useWorkspaceAdmin() {
  const { user } = useAuthContext();

  return useQuery({
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

export default function AutomacoesPage() {
  const admin = useWorkspaceAdmin();
  const connection = useFrameioConnection();
  const create = useFrameioCreateStructure();
  const [lastFlow, setLastFlow] = useState<Flow | null>(null);

  const canManage = admin.data === true;

  const clientsQuery = useQuery<ClientOption[]>({
    queryKey: ['automation-clients'],
    enabled: canManage,
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, is_active')
        .eq('is_active', true);
      return (data ?? []) as ClientOption[];
    },
  });

  const start = (flow: Flow) => (input: Omit<CreateStructureInput, 'flow'>) => {
    setLastFlow(flow);
    create.mutate({ flow, ...input } as CreateStructureInput);
  };

  const outcome = (flow: Flow) =>
    lastFlow === flow && create.data
      ? create.data.kind === 'run'
        ? { result: create.data.result, message: null }
        : { result: null, message: create.data.message }
      : { result: null, message: null };

  const pending = (flow: Flow) => create.isPending && lastFlow === flow;

  const runClient = start('client_structure');
  const runVideo = start('video_project');
  const clientOutcome = outcome('client_structure');
  const videoOutcome = outcome('video_project');

  const loading = admin.isLoading || connection.isLoading;
  const clients = clientsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
        <p className="text-sm text-muted-foreground">
          Estruturas de pasta criadas no Adobe Frame.io com um clique.
        </p>
      </div>

      {!admin.isLoading && !canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Sem acesso
            </CardTitle>
            <CardContent className="text-sm text-muted-foreground">
              Só administradores do workspace podem usar as automações.
            </CardContent>
          </CardHeader>
        </Card>
      )}

      {canManage && (
        <>
          {loading && (
            <Card>
              <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão com o Frame.io
              </CardContent>
            </Card>
          )}

          {!loading && (
            <FrameioConnectionCard
              connection={connection.connection}
              isLoading={false}
              error={connection.error}
            >
              {connection.connection?.status === 'connected' && (
                <div className="space-y-4">
                  <ClientStructureForm
                    clients={clients}
                    canManage
                    isPending={pending('client_structure')}
                    result={clientOutcome.result}
                    message={clientOutcome.message}
                    onRun={(clientId) => runClient({ clientId })}
                  />
                  <VideoProjectForm
                    clients={clients}
                    canManage
                    isPending={pending('video_project')}
                    result={videoOutcome.result}
                    message={videoOutcome.message}
                    onRun={(input: VideoRunInput) => runVideo(input)}
                  />
                </div>
              )}
            </FrameioConnectionCard>
          )}
        </>
      )}
    </div>
  );
}
