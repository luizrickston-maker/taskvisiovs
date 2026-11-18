import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FrameioProject {
  id: string;
  name: string;
}

/**
 * Projetos que já existem no Frame.io para o workspace conectado.
 *
 * É o que permite a tela dizer "esse projeto já existe — só as pastas serão
 * criadas" antes de o usuário clicar, em vez de descobrir depois.
 *
 * `mode: 'list_projects'` é leitura pura: não reivindica a trava de execução
 * nem escreve nada.
 */
export async function listFrameioProjects(): Promise<FrameioProject[]> {
  const { data, error, response } = await supabase.functions.invoke('frameio-create-structure', {
    body: { mode: 'list_projects' },
  });

  if (!error) return (data as { projects?: FrameioProject[] } | null)?.projects ?? [];

  // Fora de 2xx o corpo da resposta diz o que houve — o erro genérico do
  // Supabase não distingue reconexão pendente de indisponibilidade.
  if (response && typeof response.json === 'function') {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? error.message);
  }
  throw new Error(error.message);
}

export function useFrameioProjects(enabled: boolean) {
  return useQuery<FrameioProject[]>({
    queryKey: ['frameio-projects'],
    enabled,
    refetchOnMount: 'always',
    queryFn: listFrameioProjects,
  });
}
