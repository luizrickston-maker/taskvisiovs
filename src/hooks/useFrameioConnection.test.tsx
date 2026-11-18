import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toConnection, useFrameioConnection } from './useFrameioConnection';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => rpc.mockReset());

describe('toConnection (AUTH-06, AUTH-07)', () => {
  it('conjunto vazio é desconectado', () => {
    expect(toConnection([]).status).toBe('disconnected');
    expect(toConnection(null).status).toBe('disconnected');
    expect(toConnection(undefined).status).toBe('disconnected');
  });

  it('linha sem reconexão pendente é conectado', () => {
    const result = toConnection([
      { requires_reconnect: false, frameio_workspace_name: 'Produção', frameio_account_name: 'Chapada' },
    ]);
    expect(result.status).toBe('connected');
    expect(result.workspaceName).toBe('Produção');
    expect(result.accountName).toBe('Chapada');
  });

  it('linha com reconexão pendente é requires_reconnect', () => {
    expect(toConnection([{ requires_reconnect: true }]).status).toBe('requires_reconnect');
  });

  it('reconexão ausente ou nula conta como conectado, não como quebrado', () => {
    expect(toConnection([{}]).status).toBe('connected');
    expect(toConnection([{ requires_reconnect: null }]).status).toBe('connected');
  });
});

describe('useFrameioConnection — estados não colapsados', () => {
  it('carregando: connection indefinido e isLoading verdadeiro, nunca disconnected', async () => {
    // Deferred em vez de `new Promise(() => {})`: uma promessa que nunca
    // assenta deixa o QueryClient buscando para sempre e o worker do Vitest
    // não consegue encerrar. Libera no fim do teste.
    let release!: (value: unknown) => void;
    rpc.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    const { result, unmount } = renderHook(() => useFrameioConnection(), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.connection).toBeUndefined();
    expect(result.current.error).toBeNull();

    unmount();
    release({ data: [], error: null });
    await Promise.resolve();
  });

  it('sucesso com linha: connected e isLoading falso', async () => {
    rpc.mockResolvedValue({
      data: [{ requires_reconnect: false, frameio_workspace_name: 'Produção' }],
      error: null,
    });
    const { result } = renderHook(() => useFrameioConnection(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.connection).toBeDefined());
    expect(result.current.connection?.status).toBe('connected');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sucesso sem linha: disconnected, não erro', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useFrameioConnection(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.connection).toBeDefined());
    expect(result.current.connection?.status).toBe('disconnected');
    expect(result.current.error).toBeNull();
  });

  it('falha da RPC: error preenchido e connection indefinido, não disconnected', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const { result } = renderHook(() => useFrameioConnection(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.connection).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('pergunta pela RPC de status, não por uma leitura direta da tabela', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderHook(() => useFrameioConnection(), { wrapper: wrapper() });

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('frameio_connection_status'));
  });
});
