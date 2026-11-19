// Execução do plano de pastas — puro de I/O: a rede e o sono chegam injetados
// (AD-003), então o Vitest exercita a orquestração de verdade com um falso
// FrameioApi enquanto a edge function fornece fetch/setTimeout.
//
// Cobre STRU-04/06/07, RETY-01, FAIL-01, RATE-01, PART-01/02 e EDGE-02.

import { planSteps, type ExistingChild, type FolderSpec } from './plan.ts';

export interface FrameioApi {
  listProjects(): Promise<{ id: string; name: string; root_folder_id: string; view_url?: string }[]>;
  createProject(name: string): Promise<{ id: string; root_folder_id: string; view_url?: string }>;
  listChildren(parentId: string): Promise<ExistingChild[]>;
  createFolder(parentId: string, name: string): Promise<{ id: string; name: string; view_url?: string }>;
  /** Troca o access token vencido. Uma vez por chamada, no máximo (RETY-01). */
  refreshToken(): Promise<void>;
}

export interface RunnerOptions {
  delay(ms: number): Promise<void>;
  /** Padrão 350 ms — o limite do Frame.io é 3 criações/s (STRU-06). */
  folderIntervalMs?: number;
}

export interface RunResult {
  status: 'ok' | 'failed';
  /** Nomes criados nesta execução, na ordem. */
  created: string[];
  /** Nomes que já existiam e foram reaproveitados. */
  existing: string[];
  /** Falha: a etapa que parou — a pasta, ou a fase se nem chegou nela. */
  failedAt?: string;
  /** Falha: o que não foi criado, incluindo a etapa que falhou (PART-01). */
  remaining?: string[];
  /** Falha: a razão original, sem ser engolida (EDGE-02). */
  error?: string;
  /** Link para o projeto no Frame.io — o que se abre depois de criar. */
  projectViewUrl?: string;
  /** Link da pasta-alvo, quando o plano define uma (só o fluxo de vídeo). */
  folderViewUrl?: string;
}

/** Erro com status HTTP. Sem status, é falha de rede — instável por definição. */
export class FrameioHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'FrameioHttpError';
  }
}

const FOLDER_INTERVAL_MS = 350;
const MAX_RETRIES = 3;
const RETRY_WAIT_MS = 1000;

/** PROJ-10: o projeto do cliente não existe e este fluxo não pode criá-lo. */
export const NO_PROJECT_ERROR = 'Crie primeiro a estrutura do cliente';

/**
 * Repetir só o que pode se recuperar sozinho: rede fora, 5xx e 429. Um 400/422
 * é recusa do Frame.io (nome rejeitado) e chega intacto ao chamador.
 */
async function call<T>(
  op: () => Promise<T>,
  refresh: () => Promise<void>,
  delay: (ms: number) => Promise<void>,
): Promise<T> {
  let retries = 0;
  let refreshed = false;
  for (;;) {
    try {
      return await op();
    } catch (err) {
      const status = err instanceof FrameioHttpError ? err.status : undefined;

      if (status === 401 && !refreshed) {
        refreshed = true;
        await refresh();
        continue;
      }

      const transient = status === undefined || status === 429 || status >= 500;
      if (!transient || retries >= MAX_RETRIES) throw err;

      retries += 1;
      const wait =
        status === 429 && err instanceof FrameioHttpError && err.retryAfterMs != null
          ? err.retryAfterMs
          : RETRY_WAIT_MS;
      await delay(wait);
    }
  }
}

const label = (path: string[], name: string) => [...path, name].join(' / ');
// JSON.stringify como chave: nomes de pasta têm espaço (`Textos e Roteiros`) e
// um join com separador simples faria `['a b']` e `['a','b']` colidirem.
const key = (path: string[]) => JSON.stringify(path);

export async function ensureStructure(args: {
  api: FrameioApi;
  specs: FolderSpec[];
  projectName: string;
  options: RunnerOptions;
  /** Padrão `true` (STRU-01). `false` = recusa com NO_PROJECT_ERROR (PROJ-10). */
  createProjectIfMissing?: boolean;
  /**
   * Projeto escolhido pelo usuário. Quando presente, pula a busca por nome e a
   * criação — é o que permite montar as pastas dentro de um projeto que já
   * existe, mesmo que o nome não bata com o do cliente.
   */
  project?: { id: string; name: string; root_folder_id: string; view_url?: string };
  /** Pasta cujo link interessa devolver — no fluxo de vídeo, a do projeto. */
  linkTargetPath?: string[];
}): Promise<RunResult> {
  const { api, specs, projectName, options } = args;
  const delay = options.delay;
  const interval = options.folderIntervalMs ?? FOLDER_INTERVAL_MS;
  const hit = <T>(op: () => Promise<T>) => call(op, () => api.refreshToken(), delay);

  const labels = specs.map((s) => label(s.path, s.name));
  const created: string[] = [];
  const existing: string[] = [];

  let stage = 'projeto';
  let index = -1;

  try {
    let project = args.project;
    if (!project) {
      const projects = await hit(() => api.listProjects());
      project = projects.find((p) => p.name === projectName);
      if (!project) {
        if (args.createProjectIfMissing === false) throw new Error(NO_PROJECT_ERROR);
        const created = await hit(() => api.createProject(projectName));
        project = { name: projectName, ...created };
      }
    }
    const rootId = project.root_folder_id;
    const projectViewUrl = project.view_url;

    // Pré-carrega os filhos de cada pai planejado, do mais raso ao mais fundo.
    // Um pai que ainda não existe devolve `[]`, e é isso que faz o filho ser
    // criado — a árvore inteira se resolve sem segundas voltas.
    stage = 'pastas existentes';
    const idByPath = new Map<string, string>([[key([]), rootId]]);
    const urlByPath = new Map<string, string>(project?.view_url ? [[key([]), project.view_url]] : []);
    const childrenByPath = new Map<string, ExistingChild[]>();
    const paths = [...new Map(specs.map((s) => [key(s.path), s.path])).values()]
      .sort((a, b) => a.length - b.length);

    for (const path of paths) {
      const parentId = idByPath.get(key(path));
      childrenByPath.set(key(path), parentId ? await hit(() => api.listChildren(parentId)) : []);
    }

    const steps = planSteps(specs, (path) => childrenByPath.get(key(path)) ?? []);

    for (let i = 0; i < steps.length; i += 1) {
      index = i;
      const step = steps[i];
      const parentId = idByPath.get(key(step.path));
      if (parentId === undefined) throw new Error(`pasta pai inexistente: ${step.path.join(' / ')}`);

      if (step.kind === 'reuse') {
        existing.push(step.name);
        idByPath.set(key([...step.path, step.name]), step.id);
        if (step.view_url) urlByPath.set(key([...step.path, step.name]), step.view_url);
        continue;
      }

      await delay(interval);
      const folder = await hit(() => api.createFolder(parentId, step.name));
      created.push(step.name);
      idByPath.set(key([...step.path, step.name]), folder.id);
      if (folder.view_url) urlByPath.set(key([...step.path, step.name]), folder.view_url);
    }

    return {
      status: 'ok',
      created,
      existing,
      projectViewUrl,
      ...(args.linkTargetPath ? { folderViewUrl: urlByPath.get(key(args.linkTargetPath)) } : {}),
    };
  } catch (err) {
    const failedAt = index >= 0 ? labels[index] : stage;
    return {
      status: 'failed',
      created,
      existing,
      failedAt,
      remaining: index >= 0 ? labels.slice(index) : labels,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
