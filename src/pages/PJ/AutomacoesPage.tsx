import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceAdmin } from '@/hooks/useWorkspaceAdmin';
import { useFrameioConnection } from '@/hooks/useFrameioConnection';
import { useFrameioProjects } from '@/hooks/useFrameioProjects';
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

export default function AutomacoesPage() {
  const admin = useWorkspaceAdmin();
  const connection = useFrameioConnection();
  const create = useFrameioCreateStructure();
  const [lastFlow, setLastFlow] = useState<Flow | null>(null);

  const canManage = admin.data === true;

  const clientsQuery = useQuery<ClientOption[]>({
    queryKey: ['automation-clients'],
    enabled: canManage,
    // Cliente criado em outra aba tem que aparecer aqui sem recarregar à mão.
    refetchOnMount: 'always',
    queryFn: async () => {
      // Sem filtro de is_active: esconder cliente foi o que deixou a lista
      // vazia para quem tem cadastro. O seletor marca o inativo em vez de
      // omiti-lo (o flag continua sendo gerido em Comercial -> Clientes).
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, is_active');
      // Sem isto a query falha silenciosamente: devolveria [] e a tela não
      // teria como distinguir "sem clientes" de "não consegui ler".
      if (error) throw error;
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

  // Prévia de correspondência: busca só quando há conexão ativa.
  const projectsQuery = useFrameioProjects(
    canManage && connection.connection?.status === 'connected',
  );
  const frameioProjectNames = (projectsQuery.data ?? []).map((project) => project.name);

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
                  {/* Uma query que falha parecia idêntica à lista vazia: o usuário
                      via "nenhum cliente" e não tinha como saber se era dado ou
                      defeito. Agora os dois casos se distinguem. */}
                  {clientsQuery.isError && (
                    <p role="alert" className="text-sm text-destructive">
                      Não foi possível carregar os clientes. Recarregue a página.
                    </p>
                  )}

                  {!clientsQuery.isLoading && !clientsQuery.isError && clients.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum cliente ativo no cadastro.{' '}
                      <Link
                        to="/comercial/clientes"
                        className="font-medium underline underline-offset-2"
                      >
                        Cadastre em Comercial → Clientes
                      </Link>
                    </p>
                  )}

                  {/* A lista já vem da mesma chamada da prévia — renderizar é
                      de graça e responde "o que eu já tenho no Frame.io". */}
                  {frameioProjectNames.length > 0 && (
                    <div
                      className="rounded-md border p-3 text-sm"
                      data-testid="frameio-projects"
                    >
                      <p className="font-medium">
                        Projetos existentes no Frame.io ({frameioProjectNames.length})
                      </p>
                      <ul className="mt-1 space-y-0.5 text-muted-foreground">
                        {frameioProjectNames.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {projectsQuery.isError && (
                    <p role="alert" className="text-sm text-destructive">
                      Não foi possível listar os projetos do Frame.io.{' '}
                      {(projectsQuery.error as Error | null)?.message}
                    </p>
                  )}

                  <ClientStructureForm
                    clients={clients}
                    canManage
                    isPending={pending('client_structure')}
                    result={clientOutcome.result}
                    message={clientOutcome.message}
                    frameioProjectNames={frameioProjectNames}
                    onRun={(clientId) => runClient({ clientId })}
                  />
                  <VideoProjectForm
                    clients={clients}
                    canManage
                    isPending={pending('video_project')}
                    result={videoOutcome.result}
                    message={videoOutcome.message}
                    frameioProjectNames={frameioProjectNames}
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
