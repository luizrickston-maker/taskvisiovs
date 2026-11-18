import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { listFrameioProjects, useFrameioProjects } from './useFrameioProjects';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => invoke.mockReset());

describe('listFrameioProjects', () => {
  it('pede a lista com mode: list_projects', async () => {
    invoke.mockResolvedValue({ data: { projects: [{ id: 'p1', name: 'Xyz' }] }, error: null, response: null });

    expect(await listFrameioProjects()).toEqual([{ id: 'p1', name: 'Xyz' }]);
    expect(invoke).toHaveBeenCalledWith('frameio-create-structure', {
      body: { mode: 'list_projects' },
    });
  });

  it('resposta sem projetos vira lista vazia, não erro', async () => {
    invoke.mockResolvedValue({ data: {}, error: null, response: null });
    expect(await listFrameioProjects()).toEqual([]);
  });

  it('corpo do erro vira mensagem legível', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'non-2xx' },
      response: { json: async () => ({ error: 'Conexão com o Frame.io expirada. Reconecte para continuar.' }) },
    });
    await expect(listFrameioProjects()).rejects.toThrow('Reconecte para continuar');
  });
});

describe('useFrameioProjects', () => {
  it('desabilitado não busca nada', () => {
    const { result } = renderHook(() => useFrameioProjects(false), { wrapper: wrapper() });
    expect(result.current.data).toBeUndefined();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('habilitado devolve os nomes', async () => {
    invoke.mockResolvedValue({ data: { projects: [{ id: 'p1', name: 'Xyz' }] }, error: null, response: null });

    const { result } = renderHook(() => useFrameioProjects(true), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([{ id: 'p1', name: 'Xyz' }]);
  });
});
