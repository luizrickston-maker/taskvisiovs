import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FrameioCallbackPage, { FRAMEIO_OAUTH_KEY } from './FrameioCallbackPage';

// vi.mock é içado para o topo do arquivo, antes das `const` — os spies têm de
// nascer em vi.hoisted, senão a fácrica lê `invoke` antes da inicialização.
const { invoke, rpc, navigate } = vi.hoisted(() => ({
  invoke: vi.fn(),
  rpc: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke }, rpc },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/frameio/callback${query}`]}>
      <Routes>
        <Route path="/auth/frameio/callback" element={<FrameioCallbackPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  invoke.mockReset().mockResolvedValue({ data: { ok: true, workspace_name: 'Produção' }, error: null });
  rpc.mockReset().mockResolvedValue({ data: 'ws-tv-1', error: null });
  navigate.mockReset();
  sessionStorage.clear();
});

describe('FrameioCallbackPage — estado do OAuth (AUTH-02)', () => {
  it('state diferente do guardado aborta antes de qualquer chamada', async () => {
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'esperado');
    renderAt('?code=abc&state=outro');

    await waitFor(() => expect(screen.getByText('Conexão cancelada')).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sem state guardado também aborta, não é só o valor que muda', async () => {
    renderAt('?code=abc&state=qualquer');

    await waitFor(() => expect(screen.getByText('Conexão cancelada')).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
  });

  it('apaga o state na primeira leitura, para o replay não reutilizar', async () => {
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'bom');
    renderAt('?code=abc&state=bom');

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(FRAMEIO_OAUTH_KEY)).toBeNull();
  });
});

describe('FrameioCallbackPage — entrega do código (AUTH-03)', () => {
  it('com state válido invoca frameio-connect uma única vez, com o code', async () => {
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'bom');
    renderAt('?code=CODIGO-123&state=bom');

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith('frameio-connect', {
      body: { code: 'CODIGO-123', workspaceId: 'ws-tv-1' },
    });
    expect(navigate).toHaveBeenCalledWith('/pj/automacoes', { replace: true });
  });

  it('sem workspace não chama a função', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'bom');
    renderAt('?code=abc&state=bom');

    await waitFor(() => expect(screen.getByText('Workspace não encontrado')).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
  });

  it('falha da função vira erro legível e não navega', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Function returned a non-2xx status code' } });
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'bom');
    renderAt('?code=abc&state=bom');

    await waitFor(() =>
      expect(screen.getByText('Function returned a non-2xx status code')).toBeInTheDocument(),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('FrameioCallbackPage — erros do Adobe', () => {
  it('mostra o error_description devolvido pelo Adobe', async () => {
    renderAt('?error=access_denied&error_description=O%20usu%C3%A1rio%20recusou');

    await waitFor(() => expect(screen.getByText('O usuário recusou')).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
  });

  it('remove HTML antes de exibir (AUTH-02 / sanitização)', async () => {
    renderAt('?error=access_denied&error_description=' + encodeURIComponent('<b>erro</b> grave'));

    await waitFor(() => expect(screen.getByText('erro grave')).toBeInTheDocument());
    expect(screen.queryByText(/<b>/)).toBeNull();
  });

  it('corta a mensagem em 200 caracteres', async () => {
    const long = 'x'.repeat(500);
    renderAt(`?error=access_denied&error_description=${encodeURIComponent(long)}`);

    await waitFor(() => expect(screen.getByText('x'.repeat(200))).toBeInTheDocument());
    expect(screen.queryByText(long)).toBeNull();
  });

  it('sem descrição usa a mensagem padrão em vez de vazio', async () => {
    renderAt('?error=access_denied');

    await waitFor(() =>
      expect(screen.getByText('Não foi possível conectar no Frame.io')).toBeInTheDocument(),
    );
  });
});
