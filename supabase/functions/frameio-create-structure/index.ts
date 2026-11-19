/**
 * frameio-create-structure — executa um fluxo de criação de estrutura.
 *
 * A recusa do chamador, a trava por cliente, a renovação do token e o plano de
 * pastas vivem em `_shared/frameio/*`; aqui só há I/O de Deno: Supabase e
 * fetch do Frame.io.
 *
 * O caminho do Frame.io é emprestado para o runner, que é quem decide repetir
 * (429/5xx), renovar (401) e onde parar.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  handleListProjects,
  handleRun,
  type FrameioContext,
  type RefreshedTokens,
  type RunConnection,
  type RunDeps,
  type RunInput,
} from '../_shared/frameio/run.ts';
import { FrameioHttpError, type FrameioApi } from '../_shared/frameio/runner.ts';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const FRAMEIO_API = 'https://api.frame.io/v4';

function messageOf(payload: unknown, status: number): string {
  const p = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const text = p.message ?? p.error_description ?? p.error;
  return typeof text === 'string' && text ? text : `Frame.io ${status}`;
}

async function frameioFetch(url: string, token: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const retryAfter = res.headers.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    throw new FrameioHttpError(
      res.status,
      messageOf(payload, res.status),
      Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined,
    );
  }
  return payload;
}

const rows = (payload: unknown): Record<string, unknown>[] => {
  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : undefined;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

const text = (value: unknown) => String(value ?? '');

/** Compra o token mutável: é ele que o runner troca ao levar um 401 (RETY-01). */
function makeFrameio(ctx: FrameioContext): FrameioApi {
  let token = ctx.accessToken;
  const base = `${FRAMEIO_API}/accounts/${ctx.accountId}`;
  const get = (url: string) => frameioFetch(url, token);
  const post = (url: string, body: unknown) =>
    frameioFetch(url, token, { method: 'POST', body: JSON.stringify(body) });

  return {
    listProjects: async () =>
      rows(await get(`${base}/workspaces/${ctx.frameioWorkspaceId}/projects`)).map((p) => ({
        id: text(p.id),
        name: text(p.name),
        root_folder_id: text(p.root_folder_id),
        view_url: text(p.view_url) || undefined,
      })),

    createProject: async (name) => {
      const project = await post(`${base}/workspaces/${ctx.frameioWorkspaceId}/projects`, {
        data: { name },
      });
      const p = (project as { data?: Record<string, unknown> })?.data ?? {};
      return {
        id: text(p.id),
        root_folder_id: text(p.root_folder_id),
        view_url: text(p.view_url) || undefined,
      };
    },

    listChildren: async (parentId) =>
      rows(await get(`${base}/folders/${parentId}/folders`)).map((f) => ({
        name: text(f.name),
        id: text(f.id),
        view_url: text(f.view_url) || undefined,
      })),

    createFolder: async (parentId, name) => {
      const folder = await post(`${base}/folders/${parentId}/folders`, { data: { name } });
      const f = (folder as { data?: Record<string, unknown> })?.data ?? {};
      return { id: text(f.id), name: text(f.name), view_url: text(f.view_url) || undefined };
    },

    refreshToken: async () => {
      const refreshed = await ctx.refreshSession(ctx.refreshToken);
      if ('invalid' in refreshed) {
        await ctx.onReconnect();
        throw new FrameioHttpError(401, 'Sessão do Frame.io expirada');
      }
      token = refreshed.access_token;
      if (refreshed.refresh_token) ctx.refreshToken = refreshed.refresh_token;
      await ctx.onRefreshed(refreshed);
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const body = authHeader ? await req.json().catch(() => ({})) : {};
    const input: RunInput = {
      authHeader,
      flow: (body as { flow?: unknown }).flow,
      clientId: (body as { clientId?: unknown }).clientId,
      frameioProjectId: (body as { frameioProjectId?: unknown }).frameioProjectId,
      projectName: (body as { projectName?: unknown }).projectName,
      dateISO: (body as { dateISO?: unknown }).dateISO,
      tipo: (body as { tipo?: unknown }).tipo,
      nomeProjeto: (body as { nomeProjeto?: unknown }).nomeProjeto,
    };

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const mode = (body as { mode?: unknown }).mode;

    const deps: RunDeps = {
      now: () => new Date(),
      delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

      getMyWorkspaceId: async () => {
        // get_my_workspace_id lê auth.uid(). Sob service_role não existe `sub`
        // nas claims, então auth.uid() é NULL, a RPC devolve NULL e a listagem
        // morria em 404. Tem de rodar com o JWT de quem pediu — igual ao getUser.
        const userClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader ?? '' } } },
        );
        const { data } = await userClient.rpc('get_my_workspace_id');
        return (data as string | null) ?? null;
      },

      getUser: async (header) => {
        const client = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: header } } },
        );
        const { data, error } = await client.auth.getUser();
        return error || !data.user ? null : { id: data.user.id };
      },

      getClient: async (clientId) => {
        const { data } = await supabaseAdmin
          .from('clients')
          .select('name, workspace_id')
          .eq('id', clientId)
          .maybeSingle();
        return data ?? null;
      },

      isWorkspaceAdmin: async (workspaceId, userId) => {
        const { data } = await supabaseAdmin
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle();
        return !!data && ['owner', 'admin'].includes(data.role);
      },

      sweepStaleRuns: async () => {
        await supabaseAdmin
          .from('frameio_runs')
          .update({ status: 'failed', finished_at: new Date().toISOString() })
          .eq('status', 'running')
          .lt('started_at', new Date(Date.now() - 10 * 60_000).toISOString());
      },

      claimRun: async ({ workspaceId, clientId, flow, params, startedBy }) => {
        const { data, error } = await supabaseAdmin
          .from('frameio_runs')
          .insert({
            workspace_id: workspaceId,
            client_id: clientId,
            flow,
            params,
            started_by: startedBy,
            status: 'running',
          })
          .select('id')
          .single();
        if (error || !data) return null;
        return data.id as string;
      },

      finishRun: async ({ runId, status, result, error }) => {
        await supabaseAdmin
          .from('frameio_runs')
          .update({ status, result: result ?? null, error: error ?? null, finished_at: new Date().toISOString() })
          .eq('id', runId);
      },

      loadConnection: async (workspaceId) => {
        const { data } = await supabaseAdmin
          .from('frameio_connections')
          .select(
            'access_token, access_token_expires_at, refresh_token, requires_reconnect, frameio_account_id, frameio_workspace_id',
          )
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        return (data as RunConnection | null) ?? null;
      },

      refreshSession: async (refreshToken): Promise<RefreshedTokens | { invalid: true }> => {
        const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: Deno.env.get('FRAMEIO_CLIENT_ID') ?? '',
            client_secret: Deno.env.get('FRAMEIO_CLIENT_SECRET') ?? '',
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) return { invalid: true };
        return {
          access_token: text(payload.access_token),
          refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
          expires_in: typeof payload.expires_in === 'number' ? payload.expires_in : 3600,
        };
      },

      saveRefreshed: async (workspaceId, tokens) => {
        await supabaseAdmin
          .from('frameio_connections')
          .update({
            access_token: tokens.access_token,
            access_token_expires_at: new Date(
              Date.now() + tokens.expires_in * 1000,
            ).toISOString(),
            ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          })
          .eq('workspace_id', workspaceId);
      },

      markReconnect: async (workspaceId) => {
        await supabaseAdmin
          .from('frameio_connections')
          .update({ requires_reconnect: true })
          .eq('workspace_id', workspaceId);
      },

      listFrameioWorkspaces: async (token, accountId) => {
        const payload = await frameioFetch(
          `${FRAMEIO_API}/accounts/${accountId}/workspaces`,
          token,
        );
        return rows(payload).map((w) => ({ id: text(w.id) }));
      },

      frameio: makeFrameio,
    };

    // `mode: 'list_projects'` é a prévia de correspondência: leitura pura,
    // sem travar execução. O padrão executa o fluxo de criação.
    const result =
      mode === 'list_projects'
        ? await handleListProjects({ authHeader }, deps)
        : await handleRun(input, deps);
    return json(result.status, result.body);
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : 'Erro inesperado' });
  }
});
