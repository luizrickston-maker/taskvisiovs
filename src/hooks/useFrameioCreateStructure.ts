import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FrameioRunResult } from '@/components/automacoes/RunResult';
// Fonte única da mensagem: o módulo é puro (AD-003), então o cliente pode
// importá-lo; o Rollup deita o resto e o texto nunca diverge entre os lados.
import { LOCK_BUSY_MESSAGE } from '../../supabase/functions/_shared/frameio/run';

/**
 * Os quatro desfechos possíveis de uma tentativa de criação.
 *
 * `run` é o único que vira `RunResult` na tela. Um erro de rede nunca chega
 * aqui como se fosse uma execução concluída — é `error` (FAIL-01).
 */
export type RunInvocation =
  | { kind: 'run'; result: FrameioRunResult }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

export type ClientStructureInput = {
  flow: 'client_structure';
  clientId: string;
  /** Projeto do Frame.io a criar; quando ausente, usa o nome do cliente. */
  projectName?: string;
};
export type VideoProjectInput = {
  flow: 'video_project';
  clientId: string;
  dateISO: string;
  tipo: string;
  nomeProjeto: string;
  /** Projeto do Frame.io escolhido; quando ausente, busca por nome. */
  frameioProjectId?: string;
};
export type CreateStructureInput = ClientStructureInput | VideoProjectInput;

interface FailureBody {
  error?: string;
  failed?: FrameioRunResult;
}

/**
 * `functions.invoke` devolve `data` só em 2xx; fora disso devolve `error` com
 * `response` apontando para a resposta cru. O corpo é quem diz o que houve,
 * então é lido antes de classificar — nunca se classifica pelo texto do erro
 * genérico do Supabase.
 */
export async function invokeCreateStructure(body: CreateStructureInput): Promise<RunInvocation> {
  const { data, error, response } = await supabase.functions.invoke('frameio-create-structure', {
    body,
  });

  if (!error) {
    return { kind: 'run', result: data as FrameioRunResult };
  }

  if (response && typeof response.json === 'function') {
    const payload = (await response.json().catch(() => null)) as FailureBody | null;

    // A execução aconteceu e falhou: leva o resultado para a tela (PART-01).
    if (payload?.failed) return { kind: 'run', result: payload.failed };
    if (response.status === 409) {
      return { kind: 'conflict', message: payload?.error ?? LOCK_BUSY_MESSAGE };
    }
    return { kind: 'error', message: payload?.error ?? error.message };
  }

  // Sem response = rede fora ou relay: nenhuma execução aconteceu.
  return { kind: 'error', message: error.message };
}

export function useFrameioCreateStructure() {
  return useMutation<RunInvocation, Error, CreateStructureInput>({
    mutationFn: invokeCreateStructure,
  });
}
