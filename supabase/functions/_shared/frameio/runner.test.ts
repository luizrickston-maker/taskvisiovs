import { describe, expect, it } from 'vitest';
import { FrameioHttpError, ensureStructure, type FrameioApi } from './runner';
import { planClientStructure, type ExistingChild } from './plan';

const ALL = ['Contratos', 'Artes', 'Textos e Roteiros', 'Relatórios', 'Vídeos'];

/** Falso FrameioApi com árvore em memória, instrumentação e injeção de falha. */
function makeFake(spec: {
  existingFolders?: string[];
  projectExists?: boolean;
  fail?: (method: string, arg: string) => Error | undefined;
} = {}) {
  const root = 'root-id';
  const children = new Map<string, ExistingChild[]>([
    [root, (spec.existingFolders ?? []).map((name) => ({ name, id: `id:${name}` }))],
  ]);
  const state = {
    delays: [] as number[],
    refreshes: 0,
    creates: [] as string[],
    createsProject: 0,
    listedParents: [] as string[],
  };
  let seq = 0;

  const api: FrameioApi = {
    async listProjects() {
      const err = spec.fail?.('listProjects', '');
      if (err) throw err;
      return spec.projectExists === false
        ? []
        : [{ id: 'p1', name: 'Cliente', root_folder_id: root }];
    },
    async createProject() {
      const err = spec.fail?.('createProject', '');
      if (err) throw err;
      state.createsProject += 1;
      return { id: 'p1', root_folder_id: root };
    },
    async listChildren(parentId) {
      state.listedParents.push(parentId);
      const err = spec.fail?.('listChildren', parentId);
      if (err) throw err;
      return children.get(parentId) ?? [];
    },
    async createFolder(parentId, name) {
      const err = spec.fail?.('createFolder', name);
      if (err) throw err;
      const id = `id:${++seq}`;
      children.set(parentId, [...(children.get(parentId) ?? []), { name, id }]);
      state.creates.push(name);
      return { id, name };
    },
    async refreshToken() {
      state.refreshes += 1;
    },
  };

  return { api, state, options: { delay: async (ms: number) => void state.delays.push(ms) } };
}

const run = (fake: ReturnType<typeof makeFake>, specs = planClientStructure()) =>
  ensureStructure({ api: fake.api, specs, projectName: 'Cliente', options: fake.options });

describe('ensureStructure — execução do plano', () => {
  it('cria as cinco pastas fixas com a ordem do plano (STRU-02)', async () => {
    const fake = makeFake();
    const res = await run(fake);

    expect(res.status).toBe('ok');
    expect(res.created).toEqual(ALL);
    expect(res.existing).toEqual([]);
  });

  it('espaça toda criação em pelo menos 350 ms (STRU-06)', async () => {
    const fake = makeFake();
    await run(fake);

    expect(fake.state.delays).toHaveLength(5);
    expect(fake.state.delays.every((ms) => ms >= 350)).toBe(true);
  });

  it('reexecução contra a árvore completa não cria nada e reporta tudo como existente (STRU-04, STRU-07)', async () => {
    const fake = makeFake({ existingFolders: ALL });
    const res = await run(fake);

    expect(res.status).toBe('ok');
    expect(res.created).toEqual([]);
    expect(res.existing).toEqual(ALL);
    expect(fake.state.creates).toEqual([]);
    expect(fake.state.delays).toEqual([]);
  });

  it('reexecução parcial cria só o que falta e reaproveita o resto (STRU-04)', async () => {
    const fake = makeFake({ existingFolders: ['Contratos'] });
    const res = await run(fake);

    expect(res.created).toEqual(['Artes', 'Textos e Roteiros', 'Relatórios', 'Vídeos']);
    expect(res.existing).toEqual(['Contratos']);
  });

  it('cria o projeto quando ele ainda não existe e lista só os pais planejados', async () => {
    const fake = makeFake({ projectExists: false });
    const res = await run(fake);

    expect(res.status).toBe('ok');
    expect(fake.state.createsProject).toBe(1);
    expect(fake.state.listedParents).toEqual(['root-id']);
  });
});

describe('ensureStructure — renovação de token (RETY-01)', () => {
  it('renova uma vez e repete a chamada que falhou com 401', async () => {
    let fired = false;
    const fake = makeFake({
      fail: (m, arg) => {
        if (m === 'createFolder' && arg === 'Artes' && !fired) {
          fired = true;
          return new FrameioHttpError(401, 'token expirado');
        }
        return undefined;
      },
    });
    const res = await run(fake);

    expect(res.status).toBe('ok');
    expect(res.created).toEqual(ALL);
    expect(fake.state.refreshes).toBe(1);
  });

  it('não renova uma segunda vez para a mesma chamada', async () => {
    const fake = makeFake({
      fail: (m, arg) =>
        m === 'createFolder' && arg === 'Artes'
          ? new FrameioHttpError(401, 'token expirado')
          : undefined,
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    expect(fake.state.refreshes).toBe(1);
    expect(res.created).toEqual(['Contratos']);
    expect(res.failedAt).toBe('Artes');
  });
});

describe('ensureStructure — rate limit (RATE-01)', () => {
  it('respeita Retry-After no 429 e desiste após três repetições', async () => {
    const fake = makeFake({
      fail: (m, arg) =>
        m === 'createFolder' && arg === 'Contratos'
          ? new FrameioHttpError(429, 'lento', 250)
          : undefined,
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    // 350 ms do intervalo de pasta + as três esperas de 250 ms do Retry-After.
    expect(fake.state.delays).toEqual([350, 250, 250, 250]);
    expect(res.created).toEqual([]);
    expect(res.failedAt).toBe('Contratos');
  });

  it('espera 1 s quando o 429 vem sem Retry-After', async () => {
    const fake = makeFake({
      fail: (m, arg) =>
        m === 'createFolder' && arg === 'Contratos' ? new FrameioHttpError(429, 'lento') : undefined,
    });
    await run(fake);

    expect(fake.state.delays).toEqual([350, 1000, 1000, 1000]);
  });
});

describe('ensureStructure — falha honesta (FAIL-01, PART-01, PART-02, EDGE-02)', () => {
  it('para no 5xx depois das repetições, listando o que foi criado e o que falta', async () => {
    const fake = makeFake({
      fail: (m, arg) =>
        m === 'createFolder' && arg === 'Artes' ? new FrameioHttpError(503, 'indisponível') : undefined,
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    expect(res.created).toEqual(['Contratos']);
    expect(res.existing).toEqual([]);
    expect(res.failedAt).toBe('Artes');
    expect(res.remaining).toEqual(['Artes', 'Textos e Roteiros', 'Relatórios', 'Vídeos']);
    expect(res.error).toBe('indisponível');
  });

  it('falha no primeiro item relata nada criado (PART-02)', async () => {
    const fake = makeFake({
      fail: (m) => (m === 'createFolder' ? new FrameioHttpError(500, 'cortou') : undefined),
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    expect(res.created).toEqual([]);
    expect(res.failedAt).toBe('Contratos');
    expect(res.remaining).toEqual(ALL);
  });

  it('devolve a razão do Frame.io ao recusar um nome, sem engolir (EDGE-02)', async () => {
    const fake = makeFake({
      fail: (m, arg) =>
        m === 'createFolder' && arg === 'Artes'
          ? new FrameioHttpError(422, 'nome de pasta inválido')
          : undefined,
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    expect(res.error).toBe('nome de pasta inválido');
    expect(res.created).toEqual(['Contratos']);
    // Recusa não é transitória: nenhuma espera de repetição.
    expect(fake.state.delays).toEqual([350, 350]);
  });

  it('falha antes das etapas nomeia a fase e mantém todo o plano como restante', async () => {
    const fake = makeFake({
      fail: (m) => (m === 'listProjects' ? new FrameioHttpError(500, 'fora do ar') : undefined),
    });
    const res = await run(fake);

    expect(res.status).toBe('failed');
    expect(res.failedAt).toBe('projeto');
    expect(res.remaining).toEqual(ALL);
    expect(res.created).toEqual([]);
    expect(res.error).toBe('fora do ar');
  });
});
