import { describe, expect, it } from 'vitest';
import {
  LOCK_BUSY_MESSAGE,
  NO_PROJECT_MESSAGE,
  RECONNECT_MESSAGE,
  buildSpecs,
  handleRun,
  parseFlow,
  type FrameioContext,
  type RunDeps,
  type RunInput,
} from '../_shared/frameio/run.ts';
import type { FrameioApi, RunResult } from '../_shared/frameio/runner.ts';
import type { ExistingChild } from '../_shared/frameio/plan.ts';

const NOW = new Date('2026-11-18T12:00:00.000Z');
const FUTURE = '2026-11-18T18:00:00.000Z';
const NEAR = '2026-11-18T12:04:00.000Z';

const ALL = ['Contratos', 'Artes', 'Textos e Roteiros', 'Relatórios', 'Vídeos'];

function makeDeps(overrides: Partial<RunDeps> = {}, state: {
  projects?: { id: string; name: string; root_folder_id: string }[];
  children?: Record<string, ExistingChild[]>;
  claimResult?: string | null;
} = {}) {
  const log = {
    frameioContexts: [] as FrameioContext[],
    claims: [] as { clientId: string; flow: string }[],
    finishes: [] as { runId: string; status: string; error?: string; result?: RunResult }[],
    sweeps: 0,
    refreshes: [] as string[],
    saved: [] as string[],
    marked: [] as string[],
    created: [] as string[],
    createdProject: [] as string[],
    refreshedCalls: 0,
  };

  const projects = state.projects ?? [
    { id: 'p1', name: 'Cliente Xyz', root_folder_id: 'root' },
  ];
  const children = state.children ?? {};
  let folderSeq = 0;

  const api: FrameioApi = {
    listProjects: async () => projects,
    createProject: async (name) => {
      log.createdProject.push(name);
      return { id: `p${log.createdProject.length}`, root_folder_id: 'root' };
    },
    listChildren: async (parentId) => children[parentId] ?? [],
    createFolder: async (_parentId, name) => {
      log.created.push(name);
      return { id: `f${++folderSeq}`, name };
    },
    refreshToken: async () => {
      log.refreshedCalls += 1;
    },
  };

  const deps: RunDeps = {
    getUser: async () => ({ id: 'user-1' }),
    getClient: async () => ({ name: 'Cliente Xyz', workspace_id: 'ws-tv-1' }),
    isWorkspaceAdmin: async () => true,
    now: () => NOW,
    sweepStaleRuns: async () => {
      log.sweeps += 1;
    },
    claimRun: async ({ clientId, flow }) => {
      log.claims.push({ clientId, flow });
      return state.claimResult === undefined ? 'run-1' : state.claimResult;
    },
    finishRun: async (args) => {
      log.finishes.push(args);
    },
    loadConnection: async () => ({
      access_token: 'at-valid',
      access_token_expires_at: FUTURE,
      refresh_token: 'rt-1',
      requires_reconnect: false,
      frameio_account_id: 'acc-1',
      frameio_workspace_id: 'fi-ws-1',
    }),
    refreshSession: async (refreshToken) => {
      log.refreshes.push(refreshToken);
      return { access_token: 'at-novo', refresh_token: 'rt-2', expires_in: 3600 };
    },
    saveRefreshed: async (_ws, tokens) => {
      log.saved.push(tokens.access_token);
    },
    markReconnect: async (workspaceId) => {
      log.marked.push(workspaceId);
    },
    listFrameioWorkspaces: async () => [{ id: 'fi-ws-1' }],
    frameio: (ctx) => {
      log.frameioContexts.push(ctx);
      return api;
    },
    delay: async () => {},
    ...overrides,
  };

  return { deps, log };
}

const clientInput: RunInput = { authHeader: 'Bearer x', flow: 'client_structure', clientId: 'cl-1' };
const videoInput: RunInput = {
  authHeader: 'Bearer x',
  flow: 'video_project',
  clientId: 'cl-1',
  dateISO: '2026-11-05',
  tipo: 'Video',
  nomeProjeto: 'Lancamento',
};

describe('handleRun — recusas antes de qualquer chamada externa', () => {
  it('sem cabeçalho: 401 e nada de Frame.io nem de trava', async () => {
    const { deps, log } = makeDeps();
    const res = await handleRun({ ...clientInput, authHeader: null }, deps);

    expect(res.status).toBe(401);
    expect(log.frameioContexts).toEqual([]);
    expect(log.claims).toEqual([]);
  });

  it('usuário inválido: 401 sem tocar na trava', async () => {
    const { deps, log } = makeDeps({ getUser: async () => null });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(401);
    expect(log.claims).toEqual([]);
    expect(log.frameioContexts).toEqual([]);
  });

  it('fluxo desconhecido ou cliente ausente: 400 antes de tudo', async () => {
    for (const input of [
      { ...clientInput, flow: 'qualquer' },
      { ...clientInput, clientId: '' },
    ]) {
      const { deps, log } = makeDeps();
      const res = await handleRun(input as RunInput, deps);
      expect(res.status).toBe(400);
      expect(log.claims).toEqual([]);
      expect(log.frameioContexts).toEqual([]);
    }
  });

  it('cliente inexistente: 404', async () => {
    const { deps, log } = makeDeps({ getClient: async () => null });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(404);
    expect(log.claims).toEqual([]);
  });

  it('não-admin: 403, sem reivindicar execução e sem chamada ao Frame.io (AD-006)', async () => {
    const { deps, log } = makeDeps({ isWorkspaceAdmin: async () => false });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(403);
    expect(log.claims).toEqual([]);
    expect(log.frameioContexts).toEqual([]);
    expect(log.sweeps).toBe(0);
  });

  it('vídeo sem data/tipo/nome: 400 e nenhuma escrita', async () => {
    const { deps, log } = makeDeps();
    const res = await handleRun({ ...videoInput, nomeProjeto: '' }, deps);

    expect(res.status).toBe(400);
    expect(log.claims).toEqual([]);
    expect(log.created).toEqual([]);
  });
});

describe('handleRun — trava de execução única (EDGE-06)', () => {
  it('já havendo execução viva devolve 409 com a mensagem certa e nada de Frame.io', async () => {
    const { deps, log } = makeDeps({}, { claimResult: null });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(LOCK_BUSY_MESSAGE);
    expect(log.frameioContexts).toEqual([]);
    expect(log.finishes).toEqual([]);
  });

  it('varre as travadas antes de reivindicar, senão o resgate nunca acontece', async () => {
    const { deps, log } = makeDeps();
    await handleRun(clientInput, deps);

    expect(log.sweeps).toBe(1);
    expect(log.claims[0]).toEqual({ clientId: 'cl-1', flow: 'client_structure' });
  });
});

describe('handleRun — ciclo de vida do token (AUTH-08, AUTH-09)', () => {
  it('token válido não dispara renovação', async () => {
    const { deps, log } = makeDeps();
    await handleRun(clientInput, deps);

    expect(log.refreshes).toEqual([]);
    expect(log.frameioContexts[0].accessToken).toBe('at-valid');
  });

  it('token a 4 minutos é renovado ANTES da primeira chamada ao Frame.io', async () => {
    const { deps, log } = makeDeps({
      loadConnection: async () => ({
        access_token: 'at-velho',
        access_token_expires_at: NEAR,
        refresh_token: 'rt-velho',
        frameio_account_id: 'acc-1',
        frameio_workspace_id: 'fi-ws-1',
      }),
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(200);
    expect(log.refreshes).toEqual(['rt-velho']);
    expect(log.saved).toEqual(['at-novo']);
    expect(log.frameioContexts[0].accessToken).toBe('at-novo');
    // A renovação aconteceu antes de o Frame.io ser tocado.
    expect(log.created.length).toBeGreaterThan(0);
  });

  it('refresh recusado: marca reconexão, encerra a execução e não repete', async () => {
    // O token precisa estar perto do vencimento, senão nem se tenta renovar.
    const { deps, log } = makeDeps({
      loadConnection: async () => ({
        access_token: 'at-velho',
        access_token_expires_at: NEAR,
        refresh_token: 'rt-velho',
        frameio_account_id: 'acc-1',
        frameio_workspace_id: 'fi-ws-1',
      }),
      refreshSession: async () => ({ invalid: true }),
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(RECONNECT_MESSAGE);
    expect(log.marked).toEqual(['ws-tv-1']);
    expect(log.frameioContexts).toEqual([]);
    expect(log.finishes).toHaveLength(1);
    expect(log.finishes[0].status).toBe('failed');
    expect(log.finishes[0].error).toBe(RECONNECT_MESSAGE);
  });

  it('conexão marcada como reconectar não executa nada', async () => {
    const { deps, log } = makeDeps({
      loadConnection: async () => ({
        access_token: 'at',
        access_token_expires_at: FUTURE,
        refresh_token: 'rt',
        requires_reconnect: true,
        frameio_account_id: 'acc-1',
        frameio_workspace_id: 'fi-ws-1',
      }),
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(RECONNECT_MESSAGE);
    expect(log.frameioContexts).toEqual([]);
  });

  it('sem linha de conexão: 409, não um sucesso silencioso', async () => {
    const { deps, log } = makeDeps({ loadConnection: async () => null });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(409);
    expect(log.frameioContexts).toEqual([]);
  });
});

describe('handleRun — workspace sumido (EDGE-05)', () => {
  it('pedido reconexão em vez de falhar genérica, e não toca no Frame.io', async () => {
    const { deps, log } = makeDeps({
      listFrameioWorkspaces: async () => [{ id: 'outro-workspace' }],
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(RECONNECT_MESSAGE);
    expect(log.marked).toEqual(['ws-tv-1']);
    expect(log.frameioContexts).toEqual([]);
    expect(log.created).toEqual([]);
    expect(log.finishes[0].status).toBe('failed');
  });

  it('workspace ainda presente executa normalmente', async () => {
    const { deps, log } = makeDeps({
      listFrameioWorkspaces: async () => [{ id: 'fi-ws-1' }],
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(200);
    expect(log.marked).toEqual([]);
    expect(log.created).toEqual(ALL);
  });
});

describe('handleRun — projeto do cliente (PROJ-10, EDGE-04, STRU-01)', () => {
  it('vídeo sem projeto do cliente: recusa e nenhuma pasta criada', async () => {
    const { deps, log } = makeDeps({}, { projects: [] });
    const res = await handleRun(videoInput, deps);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(NO_PROJECT_MESSAGE);
    expect(log.createdProject).toEqual([]);
    expect(log.created).toEqual([]);
    expect(log.finishes[0].status).toBe('failed');
    expect(log.finishes[0].error).toBe(NO_PROJECT_MESSAGE);
  });

  it('cliente novo cria o projeto exatamente com o nome do cliente (EDGE-04)', async () => {
    const { deps, log } = makeDeps({}, { projects: [] });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(200);
    expect(log.createdProject).toEqual(['Cliente Xyz']);
    expect(log.created).toEqual(ALL);
  });

  it('projeto já existente não é recriado — o nome é a única chave (EDGE-04)', async () => {
    const { deps, log } = makeDeps({}, {
      projects: [{ id: 'p9', name: 'Cliente Xyz', root_folder_id: 'root' }],
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(200);
    expect(log.createdProject).toEqual([]);
    expect(log.created).toEqual(ALL);
  });
});

describe('handleRun — fechamento da execução', () => {
  it('sucesso encerra como done e devolve o resultado', async () => {
    const { deps, log } = makeDeps();
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.created).toEqual(ALL);
    expect(log.finishes).toHaveLength(1);
    expect(log.finishes[0]).toMatchObject({ runId: 'run-1', status: 'done' });
    expect((log.finishes[0].result as RunResult).created).toEqual(ALL);
  });

  it('falha do Frame.io encerra como failed com a razão, nunca deixando running', async () => {
    const { deps, log } = makeDeps({
      frameio: (ctx) => {
        log.frameioContexts.push(ctx);
        return {
          listProjects: async () => [{ id: 'p1', name: 'Cliente Xyz', root_folder_id: 'root' }],
          createProject: async () => ({ id: 'p', root_folder_id: 'root' }),
          listChildren: async () => [],
          createFolder: async () => {
            throw new Error('Frame.io 503: indisponível');
          },
          refreshToken: async () => {},
        };
      },
    });
    const res = await handleRun(clientInput, deps);

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('indisponível');
    expect(log.finishes).toHaveLength(1);
    expect(log.finishes[0].status).toBe('failed');
    expect(log.finishes[0].error).toContain('indisponível');
  });
});

describe('puras (buildSpecs, parseFlow)', () => {
  it('só aceita os dois fluxos previstos', () => {
    expect(parseFlow('client_structure')).toBe('client_structure');
    expect(parseFlow('video_project')).toBe('video_project');
    expect(parseFlow('outra')).toBeNull();
    expect(parseFlow(undefined)).toBeNull();
  });

  it('vídeo monta a árvore Vídeos → mês → projeto → material', () => {
    const specs = buildSpecs('video_project', videoInput);
    expect(specs).not.toBeNull();
    expect(specs!.map((s) => s.name)).toEqual([
      'Vídeos',
      '2026-11-Novembro',
      '2026-11-05_Quinta-Video-Lancamento',
      'Brutos',
      'Cenas de Apoio',
      'Editados',
    ]);
  });

  it('cliente novo monta as cinco pastas fixas', () => {
    expect(buildSpecs('client_structure', clientInput)!.map((s) => s.name)).toEqual(ALL);
  });

  it('vídeo com campo vazio devolve null, sinalizando 400', () => {
    expect(buildSpecs('video_project', { ...videoInput, tipo: '' })).toBeNull();
  });
});
