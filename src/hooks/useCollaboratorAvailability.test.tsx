import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCollaboratorAvailability,
  useCreateAvailability,
  useDeleteAvailability,
} from './useCollaboratorAvailability';

// ─────────────────────────────────────────────
// Supabase client double: every builder call is recorded so the tests can
// assert the exact row the hook sends and the exact filters it applies.
// ─────────────────────────────────────────────

const { supabase, fromMock, rpcMock, toastMock } = vi.hoisted(() => {
  const steps: string[] = [];
  const args: unknown[][] = [];
  let pendingResult: { data?: unknown; error?: unknown } = { data: null, error: null };

  const builder: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'lte', 'gte', 'order', 'single']) {
    builder[m] = (...a: unknown[]) => {
      steps.push(m);
      args.push(a);
      return builder;
    };
  }
  builder.then = (resolve: any, reject: any) => Promise.resolve(pendingResult).then(resolve, reject);

  const rpcMock = vi.fn();

  return {
    supabase: {
      from: vi.fn(() => builder),
      rpc: rpcMock,
    },
    fromMock: {
      steps,
      args,
      setResult: (r: { data?: unknown; error?: unknown }) => { pendingResult = r; },
      reset: () => {
        steps.length = 0;
        args.length = 0;
        pendingResult = { data: null, error: null };
      },
      callsFor: (method: string) => args.filter((_, i) => steps[i] === method),
    },
    rpcMock,
    toastMock: { success: vi.fn(), error: vi.fn() },
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'member-1' } }),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  fromMock.reset();
  vi.clearAllMocks();
});

describe('useCollaboratorAvailability', () => {
  it('reads only the session user rows that overlap the requested period', async () => {
    const row = { id: 'av-1', member_user_id: 'member-1', start_date: '2026-11-05' };
    fromMock.setResult({ data: [row], error: null });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useCollaboratorAvailability('2026-11-01', '2026-11-30'),
      { wrapper: makeWrapper(qc) },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));

    expect(fromMock.callsFor('eq')[0]).toEqual(['member_user_id', 'member-1']);
    expect(fromMock.callsFor('lte')[0]).toEqual(['start_date', '2026-11-30']);
    expect(fromMock.callsFor('gte')[0]).toEqual(['end_date', '2026-11-01']);
  });
});

describe('useCreateAvailability — the five granularities (AVAIL-01, AVAIL-02, AVAIL-03)', () => {
  it.each([
    {
      name: 'hour range 14:00–16:00 on a single day (AVAIL-01)',
      input: { start_date: '2026-11-05', end_date: '2026-11-05', start_time: '14:00', end_time: '16:00' },
      expected: {
        workspace_id: 'ws-1',
        member_user_id: 'member-1',
        start_date: '2026-11-05',
        end_date: '2026-11-05',
        start_time: '14:00',
        end_time: '16:00',
        reason: null,
      },
    },
    {
      name: 'half day 13:00–18:00 on a single day',
      input: { start_date: '2026-11-05', end_date: '2026-11-05', start_time: '13:00', end_time: '18:00', reason: 'Consulta' },
      expected: {
        workspace_id: 'ws-1',
        member_user_id: 'member-1',
        start_date: '2026-11-05',
        end_date: '2026-11-05',
        start_time: '13:00',
        end_time: '18:00',
        reason: 'Consulta',
      },
    },
    {
      name: 'full day with no times',
      input: { start_date: '2026-11-06', end_date: '2026-11-06' },
      expected: {
        workspace_id: 'ws-1',
        member_user_id: 'member-1',
        start_date: '2026-11-06',
        end_date: '2026-11-06',
        start_time: null,
        end_time: null,
        reason: null,
      },
    },
    {
      name: 'multi-day range 2026-11-10 to 2026-11-14 (AVAIL-03)',
      input: { start_date: '2026-11-10', end_date: '2026-11-14' },
      expected: {
        workspace_id: 'ws-1',
        member_user_id: 'member-1',
        start_date: '2026-11-10',
        end_date: '2026-11-14',
        start_time: null,
        end_time: null,
        reason: null,
      },
    },
    {
      name: 'full month 2026-12-01 to 2026-12-31 (AVAIL-02)',
      input: { start_date: '2026-12-01', end_date: '2026-12-31' },
      expected: {
        workspace_id: 'ws-1',
        member_user_id: 'member-1',
        start_date: '2026-12-01',
        end_date: '2026-12-31',
        start_time: null,
        end_time: null,
        reason: null,
      },
    },
  ])('persists the $name row with the session user and workspace (AVAIL-08)', async ({ input, expected }) => {
    rpcMock.mockResolvedValue({ data: 'ws-1', error: null });
    fromMock.setResult({ data: expected, error: null });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAvailability(), { wrapper: makeWrapper(qc) });

    await act(async () => { await result.current.mutateAsync(input); });

    expect(supabase.rpc).toHaveBeenCalledWith('get_my_workspace_id');
    expect(fromMock.callsFor('insert')[0]).toEqual([expected]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['collab-availability'] });
  });
});

describe('useDeleteAvailability (AVAIL-09)', () => {
  it('removes the row and invalidates the availability cache without a reload', async () => {
    fromMock.setResult({ error: null });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAvailability(), { wrapper: makeWrapper(qc) });

    await act(async () => { await result.current.mutateAsync('av-1'); });

    expect(fromMock.steps).toContain('delete');
    expect(fromMock.callsFor('eq')[0]).toEqual(['id', 'av-1']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['collab-availability'] });
  });
});
