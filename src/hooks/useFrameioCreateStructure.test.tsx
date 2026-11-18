import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { invokeCreateStructure, useFrameioCreateStructure, type CreateStructureInput } from './useFrameioCreateStructure';
import type { FrameioRunResult } from '@/components/automacoes/RunResult';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

const input: CreateStructureInput = { flow: 'client_structure', clientId: 'cl-1' };

const okResult = { ok: true, status: 'ok', created: ['Contratos'], existing: ['Artes'] };
const failedRun: FrameioRunResult = {
  status: 'failed',
  created: ['Contratos'],
  existing: [],
  failedAt: 'Artes',
  remaining: ['Artes', 'Vídeos'],
  error: 'Frame.io 503: indisponível',
};

/** Uma `Response` de verdade: o corpo é lido uma vez na classificação. */
const respond = (status: number, body: unknown) =>
  ({ status, json: async () => body }) as unknown as Response;

beforeEach(() => invoke.mockReset());

describe('invokeCreateStructure — classificação dos desfechos', () => {
  it('2xx vira resultado de execução', async () => {
    invoke.mockResolvedValue({ data: okResult, error: null, response: null });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('run');
    expect(out.kind === 'run' && out.result.created).toEqual(['Contratos']);
    expect(invoke).toHaveBeenCalledWith('frameio-create-structure', { body: input });
  });

  it('502 com corpo de execução falhada vira resultado de execução, com o resto para mostrar', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      response: respond(502, { error: failedRun.error, failed: failedRun }),
    });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('run');
    if (out.kind !== 'run') return;
    expect(out.result.status).toBe('failed');
    expect(out.result.created).toEqual(['Contratos']);
    expect(out.result.remaining).toEqual(['Artes', 'Vídeos']);
    expect(out.result.error).toBe('Frame.io 503: indisponível');
  });

  it('409 da trava vira conflict com a mensagem do servidor, não erro genérico', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      response: respond(409, { error: 'Já existe uma criação em andamento para este cliente' }),
    });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('conflict');
    expect(out.kind === 'conflict' && out.message).toBe(
      'Já existe uma criação em andamento para este cliente',
    );
    expect(out.kind).not.toBe('run');
  });

  it('409 sem corpo cai no texto padrão, nunca num resultado de execução', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      response: respond(409, {}),
    });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('conflict');
    expect(out.kind === 'conflict' && out.message).toBe(
      'Já existe uma criação em andamento para este cliente',
    );
  });

  it('erro de rede (sem response) é error e nunca um resultado de execução', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function' },
      response: undefined,
    });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message).toContain('Failed to send');
    expect(out.kind).not.toBe('run');
  });

  it('500 da função vira error com a razão do servidor', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code' },
      response: respond(500, { error: 'Integração Frame.io não configurada no servidor' }),
    });

    const out = await invokeCreateStructure(input);

    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message).toBe(
      'Integração Frame.io não configurada no servidor',
    );
  });
});

describe('useFrameioCreateStructure — isPending (STRU-05, PROJ-11)', () => {
  function wrapper() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  it('isPending fica verdadeiro até a promessa assentar', async () => {
    let release!: (v: unknown) => void;
    invoke.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    const { result, unmount } = renderHook(() => useFrameioCreateStructure(), {
      wrapper: wrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();

    result.current.mutate(input);

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();

    release({ data: okResult, error: null, response: null });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.kind).toBe('run');

    unmount();
  });

  it('resultado de execução fica disponível depois de settles, não durante', async () => {
    invoke.mockResolvedValue({ data: okResult, error: null, response: null });

    const { result } = renderHook(() => useFrameioCreateStructure(), { wrapper: wrapper() });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.isPending).toBe(false);
    expect(result.current.data?.kind).toBe('run');
  });
});
