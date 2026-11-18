import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './App';

const { authState, rpc, from, invoke } = vi.hoisted(() => ({
  authState: {
    loading: false,
    user: { id: 'user-1' } as { id: string } | null,
  },
  rpc: vi.fn(),
  from: vi.fn(),
  invoke: vi.fn(),
}));

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => result;
  b.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(ok, err);
  return b;
}

// O layout não é objeto deste teste — ele é quem monta o sidebar, não a rota.
vi.mock('@/components/layout/AppLayout', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    AppLayout: () => (
      <div data-testid="layout">
        <Outlet />
      </div>
    ),
  };
});

// O bootstrap real sobe realtime e carrega dados do Supabase; não é objeto
// deste teste, que pergunta se a ROTA responde.
vi.mock('@/components/bootstrap/AppBootstrap', () => ({
  AppBootstrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContextSafe: () => authState,
  useAuthContext: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    rpc,
    from,
    functions: { invoke },
  },
}));

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <AppRoutes />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.loading = false;
  authState.user = { id: 'user-1' };
  rpc.mockReset().mockResolvedValue({ data: 'ws-1', error: null });
  from.mockReset().mockImplementation(() => builder({ data: [], error: null }));
  invoke.mockReset().mockResolvedValue({ data: null, error: null, response: undefined });
  sessionStorage.clear();
});

describe('AppRoutes — /pj/automacoes (MENU-01)', () => {
  it('a rota monta a página de Automações', async () => {
    renderAt('/pj/automacoes');

    expect(await screen.findByRole('heading', { name: 'Automações' })).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('fica sob o mesmo ProtectedRoute das outras rotas /pj', async () => {
    // Sem usuário o guard redireciona para /auth: a página nunca chega a montar.
    authState.user = null;
    renderAt('/pj/automacoes');

    await waitFor(() =>
      expect(screen.queryByText('Verificando acesso...')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('layout')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Automações' })).not.toBeInTheDocument();
  });

  it('rota irmã /pj/projetos continua respondendo, nada foi deslocado', async () => {
    renderAt('/pj/projetos');

    expect(await screen.findByTestId('layout')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Automações' })).not.toBeInTheDocument();
  });
});

describe('AppRoutes — /auth/frameio/callback', () => {
  it('a rota monta a página de callback do Frame.io', async () => {
    renderAt('/auth/frameio/callback');

    expect(await screen.findByText('Conexão com o Frame.io')).toBeInTheDocument();
    // Fora do layout protegido, como as outras rotas de /auth.
    expect(screen.queryByTestId('layout')).toBeNull();
  });

  it('sem state guardado a página acusa cancelamento em vez de pedir token', async () => {
    renderAt('/auth/frameio/callback?code=abc&state=outro');

    expect(await screen.findByText('Conexão cancelada')).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });
});
