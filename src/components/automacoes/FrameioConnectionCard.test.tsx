import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  FRAMEIO_AUTHORIZE_URL,
  FRAMEIO_CALLBACK_URL,
  FRAMEIO_CLIENT_ID,
  FRAMEIO_OAUTH_KEY,
  FRAMEIO_SCOPE,
  FrameioConnectionCard,
  buildAuthorizeUrl,
} from './FrameioConnectionCard';
import type { FrameioConnection } from '@/hooks/useFrameioConnection';

const connected: FrameioConnection = {
  status: 'connected',
  workspaceName: 'Produção',
  accountName: 'Chapada',
};
const disconnected: FrameioConnection = { status: 'disconnected', workspaceName: null, accountName: null };
const reconnect: FrameioConnection = {
  status: 'requires_reconnect',
  workspaceName: 'Produção',
  accountName: null,
};

const renderCard = (props: Partial<Parameters<typeof FrameioConnectionCard>[0]> = {}) =>
  render(
    <FrameioConnectionCard
      connection={connected}
      isLoading={false}
      onRedirect={vi.fn()}
      {...props}
    />,
  );

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('FrameioConnectionCard — estados da conexão (AUTH-06, AUTH-07, AUTH-09)', () => {
  it('desconectado: mostra conectar e esconde as ações de criação', () => {
    renderCard({ connection: disconnected, children: <button>Criar estrutura</button> });

    expect(screen.getByRole('button', { name: 'Conectar Frame.io' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar estrutura' })).toBeNull();
  });

  it('conectado: mostra o estado e revela as ações de criação', () => {
    renderCard({ connection: connected, children: <button>Criar estrutura</button> });

    expect(screen.getByText('Produção')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar Frame.io' })).toBeNull();
  });

  it('reconexão pendente: exige Reconectar Frameio e esconde as ações de criação', () => {
    renderCard({ connection: reconnect, children: <button>Criar estrutura</button> });

    expect(screen.getByRole('button', { name: 'Reconectar Frameio' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar estrutura' })).toBeNull();
    expect(screen.getByText(/expirou/)).toBeInTheDocument();
  });

  it('carregando não é desconectado: não oferece o botão de conectar', () => {
    renderCard({ connection: undefined, isLoading: true });

    expect(screen.getByText(/Verificando conexão/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar Frame.io' })).toBeNull();
  });

  it('erro de leitura também não vira desconectado', () => {
    renderCard({ connection: undefined, isLoading: false, error: new Error('boom') });

    expect(screen.getByText(/Não foi possível verificar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conectar Frame.io' })).toBeNull();
  });
});

describe('buildAuthorizeUrl (AUTH-01)', () => {
  it('aponta para o endpoint de authorize do Adobe', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'cid', state: 'st' }));
    expect(url.origin + url.pathname).toBe('https://ims-na1.adobelogin.com/ims/authorize/v2');
  });

  it('carrega response_type, client_id, redirect_uri, scope e state', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'cid-9', state: 'state-7' }));

    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('cid-9');
    expect(url.searchParams.get('redirect_uri')).toBe(FRAMEIO_CALLBACK_URL);
    expect(url.searchParams.get('scope')).toBe(FRAMEIO_SCOPE);
    expect(url.searchParams.get('state')).toBe('state-7');
    expect([...url.searchParams.keys()].sort()).toEqual([
      'client_id',
      'redirect_uri',
      'response_type',
      'scope',
      'state',
    ]);
  });

  it('o escopo contém offline_access, sem o qual não há refresh token', () => {
    expect(FRAMEIO_SCOPE.split(' ')).toContain('offline_access');
    expect(FRAMEIO_SCOPE).toBe('openid email profile offline_access additional_info.roles');
  });

  it('usa o client_id público do app e a callback registrada', () => {
    expect(FRAMEIO_CLIENT_ID).toBe('8717b56f92364731b69740a921db140e');
    expect(FRAMEIO_CALLBACK_URL).toBe('https://taskvisiovs.vercel.app/auth/frameio/callback');
    expect(FRAMEIO_AUTHORIZE_URL).toBe('https://ims-na1.adobelogin.com/ims/authorize/v2');
  });
});

describe('FrameioConnectionCard — início do fluxo', () => {
  it('guarda um state novo e redireciona com ele (AUTH-01)', async () => {
    const onRedirect = vi.fn();
    renderCard({ connection: disconnected, onRedirect });

    fireEvent.click(screen.getByRole('button', { name: 'Conectar Frame.io' }));

    expect(onRedirect).toHaveBeenCalledTimes(1);
    const url = new URL(onRedirect.mock.calls[0][0]);
    const stored = sessionStorage.getItem(FRAMEIO_OAUTH_KEY);

    expect(stored).toBeTruthy();
    expect(url.searchParams.get('state')).toBe(stored);
    expect(url.searchParams.get('client_id')).toBe(FRAMEIO_CLIENT_ID);
  });

  it('apaga o state anterior ANTES de gravar o novo, para o retry não reutilizar', async () => {
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, 'state-antigo');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderCard({ connection: disconnected, onRedirect: vi.fn() });

    fireEvent.click(screen.getByRole('button', { name: 'Conectar Frame.io' }));

    expect(removeItem).toHaveBeenCalledWith(FRAMEIO_OAUTH_KEY);
    expect(setItem).toHaveBeenCalledWith(FRAMEIO_OAUTH_KEY, expect.any(String));
    expect(removeItem.mock.invocationCallOrder[0]).toBeLessThan(setItem.mock.invocationCallOrder[0]);
    expect(sessionStorage.getItem(FRAMEIO_OAUTH_KEY)).not.toBe('state-antigo');
  });

  it('gera um state diferente a cada clique', async () => {
    const onRedirect = vi.fn();
    renderCard({ connection: disconnected, onRedirect });

    fireEvent.click(screen.getByRole('button', { name: 'Conectar Frame.io' }));
    const first = sessionStorage.getItem(FRAMEIO_OAUTH_KEY);
    fireEvent.click(screen.getByRole('button', { name: 'Conectar Frame.io' }));
    const second = sessionStorage.getItem(FRAMEIO_OAUTH_KEY);

    expect(first).not.toBe(second);
    expect(onRedirect).toHaveBeenCalledTimes(2);
  });
});
