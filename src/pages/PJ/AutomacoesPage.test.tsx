import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import AutomacoesPage from './AutomacoesPage';

type Conn = { connection?: unknown; isLoading?: boolean; error?: unknown };
type Mutation = { isPending?: boolean; data?: unknown; mutate: ReturnType<typeof vi.fn> };

const { state, rpc, from, connectionHook, mutationHook, projectsHook } = vi.hoisted(() => {
  const state = {
    admin: true,
    clients: [{ id: 'cl-1', name: 'Cliente Xyz', isActive: true }],
    clientsError: false,
    connection: {
      connection: { status: 'connected', workspaceName: 'Produção', accountName: 'Chapada' },
      isLoading: false,
      error: null,
    } as Conn,
    mutation: { isPending: false, data: undefined, mutate: vi.fn() } as Mutation,
    frameioProjects: [] as { id: string; name: string }[],
    frameioProjectsError: false,
  };

  return {
    state,
    rpc: vi.fn(),
    from: vi.fn(),
    connectionHook: vi.fn(() => state.connection),
    mutationHook: vi.fn(() => state.mutation),
    projectsHook: vi.fn(),
  };
});

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => result;
  b.then = (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc, from, functions: { invoke: vi.fn() } },
}));
vi.mock('@/hooks/useFrameioProjects', () => ({
  useFrameioProjects: projectsHook,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-1' } }),
  useAuthContextSafe: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/hooks/useFrameioConnection', () => ({
  useFrameioConnection: connectionHook,
}));
vi.mock('@/hooks/useFrameioCreateStructure', () => ({
  useFrameioCreateStructure: mutationHook,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AutomacoesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const hasConnect = () => !!screen.queryByRole('button', { name: 'Conectar Frame.io' });
const hasClientForm = () => !!screen.queryByRole('button', { name: /Criar estrutura/ });
const hasVideoForm = () => !!screen.queryByRole('button', { name: /Criar projeto de vídeo/ });

beforeEach(() => {
  state.admin = true;
  state.clients = [{ id: 'cl-1', name: 'Cliente Xyz', isActive: true }];
  state.clientsError = false;
  state.connection = {
    connection: { status: 'connected', workspaceName: 'Produção', accountName: 'Chapada' },
    isLoading: false,
    error: null,
  };
  state.mutation = { isPending: false, data: undefined, mutate: vi.fn() };
  state.frameioProjects = [];
  state.frameioProjectsError = false;
  projectsHook.mockImplementation(() => ({
    data: state.frameioProjects,
    isError: state.frameioProjectsError,
    isLoading: false,
  }));
  rpc.mockReset().mockResolvedValue({ data: 'ws-1', error: null });
  from.mockReset().mockImplementation((table: string) =>
    table === 'workspace_members'
      ? builder({ data: { role: state.admin ? 'admin' : 'member' }, error: null })
      : builder(
          state.clientsError
            ? { data: null, error: { message: 'permission denied' } }
            : { data: state.clients, error: null },
        ),
  );
  connectionHook.mockImplementation(() => state.connection);
  mutationHook.mockImplementation(() => state.mutation);
});

describe('AutomacoesPage — carregando (AUTH-06)', () => {
  it('enquanto verifica, não mostra nenhuma ação de criação nem de conexão', () => {
    state.connection = { connection: undefined, isLoading: true, error: null };
    renderPage();

    expect(hasConnect()).toBe(false);
    expect(hasClientForm()).toBe(false);
    expect(hasVideoForm()).toBe(false);
  });
});

describe('AutomacoesPage — desconectado (AUTH-06)', () => {
  it('mostra só o card de conexão, sem os formulários', async () => {
    state.connection = {
      connection: { status: 'disconnected', workspaceName: null, accountName: null },
      isLoading: false,
      error: null,
    };
    renderPage();

    await screen.findByRole('button', { name: 'Conectar Frame.io' });
    expect(hasClientForm()).toBe(false);
    expect(hasVideoForm()).toBe(false);
  });
});

describe('AutomacoesPage — conectado (AUTH-07)', () => {
  it('mostra o card e os dois formulários, sem botão de conectar', async () => {
    renderPage();

    await screen.findByRole('button', { name: 'Criar estrutura' });
    expect(hasConnect()).toBe(false);
    expect(hasClientForm()).toBe(true);
    expect(hasVideoForm()).toBe(true);
    expect(screen.getByText('Produção')).toBeInTheDocument();
  });

  it('o formulário recebe o onRun desta página — sem isso o envio não chega à função', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Criar estrutura' });

    const trigger = screen.getAllByRole('combobox')[0];
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Cliente Xyz' }));

    fireEvent.click(screen.getByRole('button', { name: 'Criar estrutura' }));

    expect(state.mutation.mutate).toHaveBeenCalledWith({
      flow: 'client_structure',
      clientId: 'cl-1',
    });
  });

  it('o segundo formulário envia como video_project', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Criar projeto de vídeo' });

    const trigger = screen.getAllByRole('combobox')[1];
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Cliente Xyz' }));
    fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'Lancamento' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-05' } });

    fireEvent.click(screen.getByRole('button', { name: 'Criar projeto de vídeo' }));

    expect(state.mutation.mutate).toHaveBeenCalledWith({
      flow: 'video_project',
      clientId: 'cl-1',
      dateISO: '2026-11-05',
      tipo: 'Video',
      nomeProjeto: 'Lancamento',
    });
  });
});

describe('AutomacoesPage — conflito (do próprio hook)', () => {
  it('mensagem de trava aparece como alerta ao lado da ação', async () => {
    // O resultado é atribuído ao formulário que disparou (`lastFlow`), então o
    // teste percorre o caminho real — enviar — em vez de injetar dados soltos.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <AutomacoesPage />
      </QueryClientProvider>,
    );
    await screen.findByRole('button', { name: 'Criar estrutura' });

    const trigger = screen.getAllByRole('combobox')[0];
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Cliente Xyz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar estrutura' }));
    expect(state.mutation.mutate).toHaveBeenCalled();

    // A função responde 409 e o hook devolve o conflito.
    state.mutation = {
      isPending: false,
      data: { kind: 'conflict', message: 'Já existe uma criação em andamento para este cliente' },
      mutate: vi.fn(),
    };
    // Elemento NOVO a cada rerender: React faz bailout com a mesma referência.
    view.rerender(
      <QueryClientProvider client={client}>
        <AutomacoesPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Já existe uma criação em andamento para este cliente'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('AutomacoesPage — sem permissão (MENU-03)', () => {
  it('não-admin não vê conexão nem nenhuma ação de criação', async () => {
    state.admin = false;
    renderPage();

    await screen.findByText('Sem acesso');
    expect(hasConnect()).toBe(false);
    expect(hasClientForm()).toBe(false);
    expect(hasVideoForm()).toBe(false);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('nem o card de conexão é montado para não-admin', async () => {
    state.admin = false;
    renderPage();

    await screen.findByText('Sem acesso');
    expect(screen.queryByText('Produção')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});


describe('AutomacoesPage — lista de clientes', () => {
  it('sem clientes ativos, aponta onde cadastrar em vez de deixar mudo', async () => {
    state.clients = [];
    renderPage();

    const link = await screen.findByRole('link', { name: /Cadastre em Comercial/ });
    expect(link).toHaveAttribute('href', '/comercial/clientes');
  });

  it('query que falha é distinta da lista vazia, não some como "nenhum cliente"', async () => {
    state.clientsError = true;
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os clientes',
    );
    expect(screen.queryByRole('link', { name: /Cadastre em Comercial/ })).toBeNull();
  });
});

describe('AutomacoesPage — projetos do Frame.io', () => {
  it('lista os projetos que já existem no Frame.io, ao lado dos clientes', async () => {
    state.frameioProjects = [
      { id: 'p1', name: 'Xyz Ltda' },
      { id: 'p2', name: 'Abc Films' },
    ];
    renderPage();

    const panel = await screen.findByTestId('frameio-projects');
    expect(panel).toHaveTextContent('Projetos existentes no Frame.io (2)');
    expect(panel).toHaveTextContent('Xyz Ltda');
    expect(panel).toHaveTextContent('Abc Films');
    // Os clientes continuam vindo do TaskVisio, numa lista separada.
    expect(await screen.findByRole('button', { name: 'Criar estrutura' })).toBeInTheDocument();
  });

  it('sem projetos no Frame.io não mostra o painel vazio', async () => {
    state.frameioProjects = [];
    renderPage();

    await screen.findByRole('button', { name: 'Criar estrutura' });
    expect(screen.queryByTestId('frameio-projects')).toBeNull();
  });

  it('falha ao listar vira alerta, não silêncio', async () => {
    state.frameioProjectsError = true;
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível listar os projetos do Frame.io',
    );
  });
});
