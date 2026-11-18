/**
 * frameio-create-structure: lógica pura (AD-003).
 *
 * Aqui moram as decisões que o spec exige poder testar sem Deno e sem rede:
 * recusa do chamador antes de qualquer chamada externa, a trava de execução
 * única por cliente (EDGE-06), a renovação do token antes da primeira chamada
 * (AUTH-08), a reconexão quando o refresh é recusado (AUTH-09) e a recusa do
 * fluxo de vídeo quando o projeto do cliente ainda não existe (PROJ-10), sem
 * nenhuma escrita.
 *
 * `supabase/functions/frameio-create-structure/index.ts` só liga isto ao Deno.
 */

import { NO_PROJECT_ERROR, ensureStructure, type FrameioApi, type RunResult } from './runner.ts';
import { planClientStructure, planVideoProject, type FolderSpec } from './plan.ts';
import { needsRefresh, workspaceStillPresent } from './tokens.ts';

export const LOCK_BUSY_MESSAGE = 'Já existe uma criação em andamento para este cliente';
export const RECONNECT_MESSAGE = 'Conexão com o Frame.io expirada. Reconecte para continuar.';
export const NO_PROJECT_MESSAGE = NO_PROJECT_ERROR;

export type RunFlow = 'client_structure' | 'video_project';

export interface RunInput {
  authHeader: string | null;
  flow?: unknown;
  clientId?: unknown;
  dateISO?: unknown;
  tipo?: unknown;
  nomeProjeto?: unknown;
}

export interface RunConnection {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  requires_reconnect?: boolean | null;
  frameio_account_id: string;
  frameio_workspace_id: string;
}

export interface RefreshedTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

/**
 * O que o `FrameioApi` precisa para falar com o Frame.io e para se renovar
 * sozinho quando levar um 401 no meio da execução (RETY-01).
 */
export interface FrameioContext {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  frameioWorkspaceId: string;
  onRefreshed(tokens: RefreshedTokens): Promise<void>;
  onReconnect(): Promise<void>;
  /** Mesmo usada pela renovação proativa e pelo 401 no meio da execução. */
  refreshSession(refreshToken: string): Promise<RefreshedTokens | { invalid: true }>;
}

export interface RunDeps {
  getUser(authHeader: string): Promise<{ id: string } | null>;
  getClient(clientId: string): Promise<{ name: string; workspace_id: string } | null>;
  isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean>;
  now(): Date;
  /** Varre execuções travadas há mais de 10 minutos antes de reivindicar. */
  sweepStaleRuns(): Promise<void>;
  /** `null` = já há uma execução viva para este cliente (EDGE-06). */
  claimRun(args: {
    workspaceId: string;
    clientId: string;
    flow: RunFlow;
    params: Record<string, unknown>;
    startedBy: string;
  }): Promise<string | null>;
  finishRun(args: { runId: string; status: 'done' | 'failed'; result?: RunResult; error?: string }): Promise<void>;
  loadConnection(workspaceId: string): Promise<RunConnection | null>;
  refreshSession(refreshToken: string): Promise<RefreshedTokens | { invalid: true }>;
  saveRefreshed(workspaceId: string, tokens: RefreshedTokens): Promise<void>;
  markReconnect(workspaceId: string): Promise<void>;
  /** Workspaces visíveis na conta — é assim que se detecta que o gravado sumiu (EDGE-05). */
  listFrameioWorkspaces(accessToken: string, accountId: string): Promise<{ id: string }[]>;
  frameio(ctx: FrameioContext): FrameioApi;
  delay(ms: number): Promise<void>;
}

export interface RunOutcome {
  status: number;
  body: Record<string, unknown>;
}

const fail = (status: number, error: string): RunOutcome => ({ status, body: { error } });

export function parseFlow(flow: unknown): RunFlow | null {
  return flow === 'client_structure' || flow === 'video_project' ? flow : null;
}

/** Monta o plano. Valida os campos do vídeo ANTES de qualquer escrita. */
export function buildSpecs(flow: RunFlow, input: RunInput): FolderSpec[] | null {
  if (flow === 'client_structure') return planClientStructure();

  const dateISO = typeof input.dateISO === 'string' ? input.dateISO : '';
  const tipo = typeof input.tipo === 'string' ? input.tipo : '';
  const nomeProjeto = typeof input.nomeProjeto === 'string' ? input.nomeProjeto : '';
  if (!dateISO || !tipo || !nomeProjeto) return null;

  return planVideoProject({ dateISO, tipo, nomeProjeto });
}

export async function handleRun(input: RunInput, deps: RunDeps): Promise<RunOutcome> {
  if (!input.authHeader) return fail(401, 'Missing authorization header');

  const user = await deps.getUser(input.authHeader);
  if (!user) return fail(401, 'Unauthorized');

  const flow = parseFlow(input.flow);
  const clientId = typeof input.clientId === 'string' ? input.clientId : '';
  if (!flow || !clientId) return fail(400, 'Missing required fields');

  const client = await deps.getClient(clientId);
  if (!client) return fail(404, 'Cliente não encontrado');

  // AD-006: dono/admin do workspace dono do cliente.
  if (!(await deps.isWorkspaceAdmin(client.workspace_id, user.id))) {
    return fail(403, 'Forbidden: must be workspace admin');
  }

  const specs = buildSpecs(flow, input);
  if (!specs) return fail(400, 'Missing required fields');

  const params =
    flow === 'video_project'
      ? { dateISO: input.dateISO, tipo: input.tipo, nomeProjeto: input.nomeProjeto }
      : {};

  await deps.sweepStaleRuns();
  const runId = await deps.claimRun({
    workspaceId: client.workspace_id,
    clientId,
    flow,
    params,
    startedBy: user.id,
  });
  if (!runId) return fail(409, LOCK_BUSY_MESSAGE);

  const finish = async (status: 'done' | 'failed', result?: RunResult, error?: string) =>
    deps.finishRun({ runId, status, result, error });

  const conn = await deps.loadConnection(client.workspace_id);
  if (!conn || conn.requires_reconnect) {
    await finish('failed', undefined, RECONNECT_MESSAGE);
    return fail(409, RECONNECT_MESSAGE);
  }

  let accessToken = conn.access_token;
  if (needsRefresh(new Date(conn.access_token_expires_at), undefined, deps.now())) {
    const refreshed = await deps.refreshSession(conn.refresh_token);
    if ('invalid' in refreshed) {
      await deps.markReconnect(client.workspace_id);
      await finish('failed', undefined, RECONNECT_MESSAGE);
      return fail(409, RECONNECT_MESSAGE);
    }
    accessToken = refreshed.access_token;
    await deps.saveRefreshed(client.workspace_id, refreshed);
  }

  // EDGE-05: o workspace gravado pode ter sumido da conta. Sem isto o fluxo
  // só levaria 404 do Frame.io e reportaria falha genérica em vez de pedir
  // reconexão.
  const available = await deps.listFrameioWorkspaces(accessToken, conn.frameio_account_id);
  if (!workspaceStillPresent(available, conn.frameio_workspace_id)) {
    await deps.markReconnect(client.workspace_id);
    await finish('failed', undefined, RECONNECT_MESSAGE);
    return fail(409, RECONNECT_MESSAGE);
  }

  const result = await ensureStructure({
    api: deps.frameio({
      accessToken,
      refreshToken: conn.refresh_token,
      accountId: conn.frameio_account_id,
      frameioWorkspaceId: conn.frameio_workspace_id,
      onRefreshed: (tokens) => deps.saveRefreshed(client.workspace_id, tokens),
      onReconnect: () => deps.markReconnect(client.workspace_id),
      refreshSession: deps.refreshSession,
    }),
    specs,
    projectName: client.name,
    options: { delay: deps.delay },
    // O fluxo de vídeo só escreve onde o projeto do cliente já existe (PROJ-10);
    // o de cliente novo cria o projeto se faltar (STRU-01).
    createProjectIfMissing: flow === 'client_structure',
  });

  if (result.status === 'failed') {
    await finish('failed', result, result.error);
    // O corpo carrega o resultado inteiro: PART-01 exige mostrar o que foi
    // criado e o que não foi, e isso não sobreviveria num `fail()` de texto só.
    if (result.error === NO_PROJECT_MESSAGE) {
      return { status: 409, body: { error: NO_PROJECT_MESSAGE, failed: result } };
    }
    return {
      status: 502,
      body: { error: result.error ?? 'Falha ao criar a estrutura no Frame.io', failed: result },
    };
  }

  await finish('done', result);
  return { status: 200, body: { ok: true, ...result } };
}
