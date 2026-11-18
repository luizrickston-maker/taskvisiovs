/**
 * frameio-connect — troca o `code` do Adobe por tokens e grava a conexão do
 * workspace. A lógica (e a ordem das recusas) vive em
 * `_shared/frameio/connect.ts`; aqui só há I/O de Deno.
 *
 * A ordem importa e é testada: cabeçalho → usuário → campos → admin → segredo
 * → Frame.io. Nenhuma chamada externa acontece antes de todas as quatro
 * primeiras verificações (AUTH-03, AUTH-05).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  FRAMEIO_ACCOUNTS_URL,
  IMS_TOKEN_URL,
  handleConnect,
  type ConnectDeps,
} from '../_shared/frameio/connect.ts';

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

async function frameioJson(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Frame.io ${res.status}: ${JSON.stringify(payload)}`);
  return payload;
}

const list = (payload: unknown): Record<string, unknown>[] => {
  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : undefined;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const body = authHeader ? await req.json().catch(() => ({})) : {};
    const input = {
      authHeader,
      code: (body as { code?: unknown }).code,
      workspaceId: (body as { workspaceId?: unknown }).workspaceId,
    };

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const deps: ConnectDeps = {
      env: (name) => Deno.env.get(name),
      now: () => new Date(),
      getUser: async (header) => {
        const supabaseUser = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: header } } },
        );
        const { data, error } = await supabaseUser.auth.getUser();
        return error || !data.user ? null : { id: data.user.id };
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
      exchange: async (formBody) => {
        const res = await fetch(IMS_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody,
        });
        return { ok: res.ok, status: res.status, payload: await res.json().catch(() => ({})) };
      },
      listAccounts: async (token) => {
        const payload = await frameioJson(FRAMEIO_ACCOUNTS_URL, token);
        return list(payload).map((a) => ({
          id: String(a.id ?? ''),
          display_name: String(a.display_name ?? ''),
        }));
      },
      listWorkspaces: async (token, accountId) => {
        const payload = await frameioJson(`${FRAMEIO_ACCOUNTS_URL}/${accountId}/workspaces`, token);
        return list(payload).map((w) => ({ id: String(w.id ?? ''), name: String(w.name ?? '') }));
      },
      saveConnection: async (row) => {
        const { error } = await supabaseAdmin.from('frameio_connections').upsert(row, {
          onConflict: 'workspace_id',
        });
        return { error: error?.message ?? null };
      },
    };

    const result = await handleConnect(input, deps);
    return json(result.status, result.body);
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : 'Erro inesperado' });
  }
});
