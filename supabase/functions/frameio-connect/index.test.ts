import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  FRAMEIO_ACCOUNTS_URL,
  IMS_TOKEN_URL,
  buildExchangeBody,
  handleConnect,
  type ConnectDeps,
  type FrameioAccount,
  type FrameioWorkspace,
} from '../_shared/frameio/connect.ts';

const NOW = new Date('2026-11-18T12:00:00.000Z');

function makeDeps(overrides: Partial<ConnectDeps> = {}) {
  const calls = {
    exchange: [] as string[],
    listAccounts: [] as string[],
    listWorkspaces: [] as string[],
    saved: [] as Parameters<ConnectDeps['saveConnection']>[0][],
    isAdmin: [] as string[],
  };

  const env: Record<string, string | undefined> = {
    FRAMEIO_CLIENT_ID: 'client-id-123',
    FRAMEIO_CLIENT_SECRET: 'secret-abc',
    FRAMEIO_REDIRECT_URI: 'https://taskvisiovs.vercel.app/auth/frameio/callback',
    ...(overrides.env ? collectEnv(overrides.env) : {}),
  };

  // Os gravadores rodam SEMPRE, mesmo quando o teste troca o comportamento —
  // senão a asserção sobre `calls` enxerga um array vazio e mente.
  const deps: ConnectDeps = {
    env: overrides.env ?? ((name) => env[name]),
    now: overrides.now ?? (() => NOW),
    getUser: async (header) =>
      overrides.getUser ? await overrides.getUser(header) : { id: 'user-1' },
    isWorkspaceAdmin: async (workspaceId, userId) => {
      calls.isAdmin.push(workspaceId);
      return overrides.isWorkspaceAdmin
        ? await overrides.isWorkspaceAdmin(workspaceId, userId)
        : true;
    },
    exchange: async (body) => {
      calls.exchange.push(body);
      if (overrides.exchange) return overrides.exchange(body);
      return {
        ok: true,
        status: 200,
        payload: { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 },
      };
    },
    listAccounts: async (token) => {
      calls.listAccounts.push(token);
      if (overrides.listAccounts) return overrides.listAccounts(token);
      return [{ id: 'acc-1', display_name: 'Chapada' }] as FrameioAccount[];
    },
    listWorkspaces: async (token, accountId) => {
      calls.listWorkspaces.push(accountId);
      if (overrides.listWorkspaces) return overrides.listWorkspaces(token, accountId);
      return [{ id: 'ws-fi-1', name: 'Produção' }] as FrameioWorkspace[];
    },
    saveConnection: async (row) => {
      calls.saved.push(row);
      if (overrides.saveConnection) return overrides.saveConnection(row);
      return { error: null };
    },
  };

  return { deps, calls, setEnv: (name: string, value: string | undefined) => void (env[name] = value) };
}

/** Não usado hoje; mantido para o caso de um teste querer injetar env inteiro. */
function collectEnv(_env: ConnectDeps['env']): Record<string, string | undefined> {
  return {};
}

const validInput = { authHeader: 'Bearer x', code: 'the-code', workspaceId: 'ws-tv-1' };

describe('handleConnect — ordem das recusas (AUTH-03, AUTH-05)', () => {
  it('sem cabeçalho devolve 401 e não toca em nenhuma chamada', async () => {
    const { deps, calls } = makeDeps();
    const res = await handleConnect({ ...validInput, authHeader: null }, deps);

    expect(res.status).toBe(401);
    expect(calls.exchange).toEqual([]);
    expect(calls.listAccounts).toEqual([]);
    expect(calls.saved).toEqual([]);
  });

  it('cabeçalho inválido devolve 401 antes de qualquer chamada ao Frame.io', async () => {
    const { deps, calls } = makeDeps({ getUser: async () => null });
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(401);
    expect(calls.exchange).toEqual([]);
    expect(calls.listAccounts).toEqual([]);
  });

  it('campo ausente devolve 400 sem trocar o código', async () => {
    const { deps, calls } = makeDeps();
    const res = await handleConnect({ ...validInput, code: '' }, deps);

    expect(res.status).toBe(400);
    expect(calls.exchange).toEqual([]);
  });

  it('não-admin devolve 403 e não troca o código (AD-006)', async () => {
    const { deps, calls } = makeDeps({ isWorkspaceAdmin: async () => false });
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(403);
    expect(calls.isAdmin).toEqual(['ws-tv-1']);
    expect(calls.exchange).toEqual([]);
  });

  it('segredo ausente falha explícito antes da rede', async () => {
    const { deps, calls, setEnv } = makeDeps();
    setEnv('FRAMEIO_CLIENT_SECRET', undefined);
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(500);
    expect(String(res.body.error)).toContain('não configurada');
    expect(calls.exchange).toEqual([]);
  });
});

describe('handleConnect — troca de código (AUTH-03)', () => {
  it('envia exatamente grant_type, code, client_id, client_secret e redirect_uri', async () => {
    const { deps, calls } = makeDeps();
    await handleConnect(validInput, deps);

    expect(calls.exchange).toHaveLength(1);
    const params = new URLSearchParams(calls.exchange[0]);
    expect([...params.keys()].sort()).toEqual([
      'client_id',
      'client_secret',
      'code',
      'grant_type',
      'redirect_uri',
    ]);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code')).toBe('the-code');
    expect(params.get('client_id')).toBe('client-id-123');
    expect(params.get('client_secret')).toBe('secret-abc');
    expect(params.get('redirect_uri')).toBe('https://taskvisiovs.vercel.app/auth/frameio/callback');
  });

  it('propaga a razão do Adobe quando a troca falha', async () => {
    const { deps } = makeDeps({
      exchange: async () => ({ ok: false, status: 400, payload: { error: 'invalid_grant' } }),
    });
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('rejeita resposta sem tokens em vez de gravar linha vazia', async () => {
    const { deps, calls } = makeDeps({ exchange: async () => ({ ok: true, status: 200, payload: {} }) });
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(502);
    expect(calls.saved).toEqual([]);
  });
});

describe('handleConnect — gravação da conexão (AUTH-04)', () => {
  it('guarda o primeiro account e o primeiro workspace devolvidos', async () => {
    const { deps, calls } = makeDeps({
      listAccounts: async () => [
        { id: 'acc-1', display_name: 'Primeira' },
        { id: 'acc-2', display_name: 'Segunda' },
      ],
      listWorkspaces: async () => [
        { id: 'ws-fi-1', name: 'Um' },
        { id: 'ws-fi-2', name: 'Dois' },
      ],
    });
    const res = await handleConnect(validInput, deps);

    expect(res.status).toBe(200);
    expect(calls.saved).toHaveLength(1);
    expect(calls.saved[0].frameio_account_id).toBe('acc-1');
    expect(calls.saved[0].frameio_account_name).toBe('Primeira');
    expect(calls.saved[0].frameio_workspace_id).toBe('ws-fi-1');
    expect(calls.saved[0].frameio_workspace_name).toBe('Um');
  });

  it('liga a linha ao workspace do TaskVisio e ao usuário que conectou', async () => {
    const { deps, calls } = makeDeps({ getUser: async () => ({ id: 'user-9' }) });
    await handleConnect(validInput, deps);

    expect(calls.saved[0].workspace_id).toBe('ws-tv-1');
    expect(calls.saved[0].connected_by).toBe('user-9');
    expect(calls.saved[0].requires_reconnect).toBe(false);
  });

  it('calcula o vencimento a partir de expires_in, com o relógio injetado', async () => {
    const { deps, calls } = makeDeps({
      exchange: async () => ({
        ok: true,
        status: 200,
        payload: { access_token: 'at', refresh_token: 'rt', expires_in: 1800 },
      }),
    });
    await handleConnect(validInput, deps);

    expect(calls.saved[0].access_token_expires_at).toBe('2026-11-18T12:30:00.000Z');
  });

  it('sem conta ou sem workspace, devolve erro e não grava nada', async () => {
    const noAccounts = makeDeps({ listAccounts: async () => [] });
    expect((await handleConnect(validInput, noAccounts.deps)).status).toBe(502);
    expect(noAccounts.calls.saved).toEqual([]);

    const noWorkspaces = makeDeps({ listWorkspaces: async () => [] });
    expect((await handleConnect(validInput, noWorkspaces.deps)).status).toBe(502);
    expect(noWorkspaces.calls.saved).toEqual([]);
  });
});

describe('buildExchangeBody (AUTH-03)', () => {
  it('aponta para os endpoints verificados do Adobe e do Frame.io', () => {
    // Sondados em 2026-11-18: /ims/authorize/v2 responde 200 e /ims/token/v3 é
    // POST-only e reconhece grant_type/client_id/refresh_token.
    expect(IMS_TOKEN_URL).toBe('https://ims-na1.adobelogin.com/ims/token/v3');
    expect(FRAMEIO_ACCOUNTS_URL).toBe('https://api.frame.io/v4/accounts');
    const indexSource = sourceOf('supabase/functions/frameio-connect/index.ts');
    expect(indexSource).toContain('IMS_TOKEN_URL');
  });

  it('serializa como formulário, não como JSON', () => {
    const body = buildExchangeBody({
      code: 'c',
      clientId: 'i',
      clientSecret: 's',
      redirectUri: 'https://r',
    });
    expect(body).toBe(
      'grant_type=authorization_code&code=c&client_id=i&client_secret=s&redirect_uri=https%3A%2F%2Fr',
    );
  });
});

// ---------------------------------------------------------------------------
// AUTH-05: o segredo só existe do lado do servidor. O bundle é o artefato que
// vaza, então varremos o código do cliente e a configuração do Vite.
// ---------------------------------------------------------------------------

const sourceOf = (relative: string) =>
  readFileSync(path.resolve(process.cwd(), relative), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('segredos fora do cliente (AUTH-05)', () => {
  it('nenhum arquivo sob src/ menciona o segredo do Frame.io', () => {
    const offenders = walk(path.resolve(process.cwd(), 'src')).filter((file) =>
      readFileSync(file, 'utf8').includes('FRAMEIO_CLIENT_SECRET'),
    );
    expect(offenders).toEqual([]);
  });

  it('nenhuma variável VITE_ carrega o segredo', () => {
    const offenders = walk(path.resolve(process.cwd(), 'src')).filter((file) =>
      /VITE_[A-Z_]*FRAMEIO/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
    expect(sourceOf('vite.config.ts')).not.toMatch(/VITE_[A-Z_]*FRAMEIO/);
  });

  it('o ponto de entrada lê o segredo só de Deno.env, sem VITE_ no arquivo', () => {
    const indexSource = sourceOf('supabase/functions/frameio-connect/index.ts');
    expect(indexSource).toContain("env: (name) => Deno.env.get(name)");
    expect(indexSource).not.toContain('VITE_');
    expect(indexSource).toContain('../_shared/frameio/connect.ts');
  });

  it('grava por workspace_id, para a reconexão substituir a linha (AUTH-04)', () => {
    const indexSource = sourceOf('supabase/functions/frameio-connect/index.ts');
    expect(indexSource).toContain(".from('frameio_connections')");
    expect(indexSource).toContain("onConflict: 'workspace_id'");
  });
});
