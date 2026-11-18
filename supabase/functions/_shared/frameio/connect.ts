/**
 * frameio-connect: lógica pura (AD-003).
 *
 * Todo I/O chega injetado — env, usuário, admin, troca de token, listagem e
 * gravação — para que o Vitest prove a ORDEM das recusas sem Deno e sem rede:
 * nenhuma chamada ao Frame.io acontece antes do chamador ser identificado,
 * autorizado e o segredo estar presente (AUTH-03, AUTH-04, AUTH-05).
 *
 * `supabase/functions/frameio-connect/index.ts` só liga isto ao Deno.
 */

export const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
export const FRAMEIO_ACCOUNTS_URL = 'https://api.frame.io/v4/accounts';

export type FrameioAccount = { id: string; display_name: string };
export type FrameioWorkspace = { id: string; name: string };

export interface ConnectDeps {
  env(name: string): string | undefined;
  getUser(authHeader: string): Promise<{ id: string } | null>;
  isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean>;
  /** Troca o `code` por tokens. `body` é `application/x-www-form-urlencoded`. */
  exchange(body: string): Promise<{ ok: boolean; status: number; payload: unknown }>;
  listAccounts(token: string): Promise<FrameioAccount[]>;
  listWorkspaces(token: string, accountId: string): Promise<FrameioWorkspace[]>;
  saveConnection(row: {
    workspace_id: string;
    frameio_account_id: string;
    frameio_account_name: string;
    frameio_workspace_id: string;
    frameio_workspace_name: string;
    access_token: string;
    access_token_expires_at: string;
    refresh_token: string;
    requires_reconnect: boolean;
    connected_by: string;
  }): Promise<{ error: string | null }>;
  now(): Date;
}

export interface ConnectResult {
  status: number;
  body: Record<string, unknown>;
}

const fail = (status: number, error: string): ConnectResult => ({ status, body: { error } });

/** AUTH-03: exatamente estes cinco campos, nada mais. */
export function buildExchangeBody(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): string {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
  }).toString();
}

function readPayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
}

function errorText(payload: unknown, fallback: string): string {
  const p = readPayload(payload);
  const description = p.error_description ?? p.error;
  return typeof description === 'string' && description ? description : fallback;
}

export async function handleConnect(
  input: { authHeader: string | null; code?: unknown; workspaceId?: unknown },
  deps: ConnectDeps,
): Promise<ConnectResult> {
  // 1. Sem cabeçalho não há nem quem perguntar — e nada é chamado antes daqui.
  if (!input.authHeader) return fail(401, 'Missing authorization header');

  const user = await deps.getUser(input.authHeader);
  if (!user) return fail(401, 'Unauthorized');

  const code = typeof input.code === 'string' ? input.code : '';
  const workspaceId = typeof input.workspaceId === 'string' ? input.workspaceId : '';
  if (!code || !workspaceId) return fail(400, 'Missing required fields');

  // 2. AD-006: dono/admin do workspace, nunca qualquer membro.
  if (!(await deps.isWorkspaceAdmin(workspaceId, user.id))) {
    return fail(403, 'Forbidden: must be workspace admin');
  }

  // 3. Falha explícita antes de qualquer rede, não um502 vago depois.
  const clientId = deps.env('FRAMEIO_CLIENT_ID');
  const clientSecret = deps.env('FRAMEIO_CLIENT_SECRET');
  const redirectUri = deps.env('FRAMEIO_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) {
    return fail(500, 'Integração Frame.io não configurada no servidor');
  }

  const exchanged = await deps.exchange(
    buildExchangeBody({ code, clientId, clientSecret, redirectUri }),
  );
  if (!exchanged.ok) return fail(502, errorText(exchanged.payload, 'Falha ao conectar no Frame.io'));

  const tokens = readPayload(exchanged.payload);
  const accessToken = typeof tokens.access_token === 'string' ? tokens.access_token : '';
  const refreshToken = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : '';
  const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600;
  if (!accessToken || !refreshToken) return fail(502, 'Frame.io não devolveu os tokens');

  // 4. context.md: primeiro account e primeiro workspace, gravados na conexão.
  const accounts = await deps.listAccounts(accessToken);
  const account = accounts[0];
  if (!account) return fail(502, 'Conta Frame.io não encontrada');

  const workspaces = await deps.listWorkspaces(accessToken, account.id);
  const workspace = workspaces[0];
  if (!workspace) return fail(502, 'Workspace do Frame.io não encontrado');

  // 5. Upsert em workspace_id: reconectar substitui a linha, não duplica (AUTH-04).
  const saved = await deps.saveConnection({
    workspace_id: workspaceId,
    frameio_account_id: account.id,
    frameio_account_name: account.display_name,
    frameio_workspace_id: workspace.id,
    frameio_workspace_name: workspace.name,
    access_token: accessToken,
    access_token_expires_at: new Date(deps.now().getTime() + expiresIn * 1000).toISOString(),
    refresh_token: refreshToken,
    requires_reconnect: false,
    connected_by: user.id,
  });
  if (saved.error) return fail(500, saved.error);

  return {
    status: 200,
    body: { ok: true, account_name: account.display_name, workspace_name: workspace.name },
  };
}
