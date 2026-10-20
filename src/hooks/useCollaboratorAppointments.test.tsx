import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  ALREADY_ANSWERED_MESSAGE,
  formatConflictMessage,
  useCancelAppointment,
  useCollaboratorAppointments,
  useCreateAppointment,
  useRespondAppointment,
  useUpdateAppointment,
} from './useCollaboratorAppointments';
import type { CollaboratorAppointmentRow } from '@/components/agenda/CalendarEvent';

// ─────────────────────────────────────────────
// Supabase double. `from()` hands out one builder per call, each consuming the
// next queued result, so a chain of reads and writes can be scripted.
// ─────────────────────────────────────────────

const { supabase, calls, rpcMock, queueResult, toastMock } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown };
  const log: { table: string; method: string; args: unknown[] }[] = [];
  const queue: Result[] = [];
  const rpcResults: Result[] = [];

  function makeBuilder(table: string) {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: any = {};
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'lte', 'gte', 'order', 'single']) {
      builder[m] = (...args: unknown[]) => {
        log.push({ table, method: m, args });
        return builder;
      };
    }
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return builder;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => makeBuilder(table)),
      rpc: vi.fn(async (fn: string, args?: unknown) => {
        log.push({ table: fn, method: 'rpc', args: args ? [args] : [] });
        return rpcResults.shift() ?? { data: false, error: null };
      }),
    },
    calls: {
      log,
      of: (method: string) => log.filter(c => c.method === method),
      reset: () => { log.length = 0; queue.length = 0; rpcResults.length = 0; },
    },
    rpcMock: (_fn: string, _args?: unknown, result: Result = { data: false, error: null }) => {
      rpcResults.push(result);
    },
    queueResult: (result: Result) => { queue.push(result); },
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

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function appointment(overrides: Partial<CollaboratorAppointmentRow> = {}): CollaboratorAppointmentRow {
  return {
    id: 'ap-1',
    workspace_id: 'ws-1',
    member_user_id: 'member-1',
    created_by: 'manager-1',
    title: 'Reunião com cliente',
    notes: null,
    date: '2026-12-05',
    start_time: '09:00',
    end_time: '10:00',
    status: 'pending',
    decided_at: null,
    decided_by: null,
    notify_status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  calls.reset();
  vi.clearAllMocks();
});

describe('useCreateAppointment', () => {
  it('persists the appointment with member, workspace and creator after a clean pre-check', async () => {
    rpcMock('get_my_workspace_id', undefined, { data: 'ws-1', error: null });
    rpcMock('fn_collaborator_has_conflict', undefined, { data: false, error: null });
    queueResult({ data: appointment(), error: null });

    const { result } = renderHook(() => useCreateAppointment(), { wrapper: makeWrapper(freshClient()) });

    let created: CollaboratorAppointmentRow | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({
        member_user_id: 'member-1',
        title: 'Reunião com cliente',
        notes: 'Trazer o contrato',
        date: '2026-12-05',
        start_time: '09:00',
        end_time: '10:00',
      });
    });

    expect(created?.status).toBe('pending');
    expect(calls.of('insert')[0].args).toEqual([{
      workspace_id: 'ws-1',
      member_user_id: 'member-1',
      created_by: 'member-1',
      title: 'Reunião com cliente',
      notes: 'Trazer o contrato',
      date: '2026-12-05',
      start_time: '09:00',
      end_time: '10:00',
    }]);
    // The conflict algorithm runs once, in SQL (AD-002).
    const conflictCall = calls.log.find(c => c.table === 'fn_collaborator_has_conflict');
    expect(conflictCall?.args[0]).toEqual({
      p_member: 'member-1',
      p_date: '2026-12-05',
      p_end_date: '2026-12-05',
      p_start_time: '09:00',
      p_end_time: '10:00',
    });
  });

  it('refuses with the spec message and persists nothing when the RPC reports a conflict (MGR-04)', async () => {
    rpcMock('get_my_workspace_id', undefined, { data: 'ws-1', error: null });
    rpcMock('fn_collaborator_has_conflict', undefined, { data: true, error: null });
    queueResult({
      data: [{
        id: 'av-1',
        member_user_id: 'member-1',
        start_date: '2026-12-01',
        end_date: '2026-12-31',
        start_time: null,
        end_time: null,
        reason: null,
      }],
      error: null,
    });

    const { result } = renderHook(() => useCreateAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await expect(result.current.mutateAsync({
        member_user_id: 'member-1',
        collaboratorName: 'Maria',
        title: 'Reunião',
        date: '2026-12-05',
        start_time: '09:00',
        end_time: '10:00',
      })).rejects.toThrow('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.');
    });

    expect(calls.of('insert')).toHaveLength(0);
  });

  it('builds the refusal exactly as the spec writes it', () => {
    expect(formatConflictMessage('Maria', '01/12/2026', '31/12/2026'))
      .toBe('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.');
  });
});

describe('useRespondAppointment', () => {
  it('confirms a pending appointment, recording decided_at and decided_by (COLAB-02)', async () => {
    queueResult({ data: appointment({ status: 'confirmed' }), error: null });

    const { result } = renderHook(() => useRespondAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await result.current.mutateAsync({ appointment: appointment(), action: 'confirm' });
    });

    expect(calls.of('update')[0].args).toEqual([{
      status: 'confirmed',
      decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      decided_by: 'member-1',
    }]);
  });

  it('cancels a pending appointment, recording decided_at and decided_by (COLAB-03)', async () => {
    queueResult({ data: appointment({ status: 'cancelled' }), error: null });

    const { result } = renderHook(() => useRespondAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await result.current.mutateAsync({ appointment: appointment(), action: 'cancel' });
    });

    expect(calls.of('update')[0].args).toEqual([{
      status: 'cancelled',
      decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      decided_by: 'member-1',
    }]);
  });

  it('refuses a terminal row before any write (COLAB-04)', async () => {
    for (const status of ['confirmed', 'cancelled'] as const) {
      const { result } = renderHook(() => useRespondAppointment(), { wrapper: makeWrapper(freshClient()) });

      await act(async () => {
        await expect(result.current.mutateAsync({
          appointment: appointment({ status }),
          action: 'cancel',
        })).rejects.toThrow(ALREADY_ANSWERED_MESSAGE);
      });
    }

    expect(calls.of('update')).toHaveLength(0);
  });

  it('refuses an appointment that belongs to someone else (COLAB-05)', async () => {
    const { result } = renderHook(() => useRespondAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await expect(result.current.mutateAsync({
        appointment: appointment({ member_user_id: 'someone-else' }),
        action: 'confirm',
      })).rejects.toThrow('Sem permissão para responder este compromisso.');
    });

    expect(calls.of('update')).toHaveLength(0);
  });

  it('surfaces the database refusal when the trigger rejects the transition', async () => {
    queueResult({ data: null, error: { message: ALREADY_ANSWERED_MESSAGE } });

    const { result } = renderHook(() => useRespondAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await expect(result.current.mutateAsync({
        appointment: appointment(),
        action: 'confirm',
      })).rejects.toThrow(ALREADY_ANSWERED_MESSAGE);
    });
  });
});

describe('useUpdateAppointment (MGR-09)', () => {
  it('persists the manager edit without touching status or the answer', async () => {
    queueResult({ data: appointment({ title: 'Reunião reagendada' }), error: null });

    const { result } = renderHook(() => useUpdateAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'ap-1',
        title: 'Reunião reagendada',
        notes: 'Confirmado por telefone',
      });
    });

    expect(calls.of('update')[0].args).toEqual([{
      title: 'Reunião reagendada',
      notes: 'Confirmado por telefone',
    }]);
    const payload = calls.of('update')[0].args[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('decided_at');
    expect(payload).not.toHaveProperty('decided_by');
  });

  it('sends no notification on any path (MGR-09)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'useCollaboratorAppointments.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/functions\.invoke|notify-appointment|AGZAP/i);
  });
});

describe('useCancelAppointment (MGR-09, AD-007)', () => {
  it('withdraws from a pending row and records who ended it', async () => {
    queueResult({ data: appointment({ status: 'cancelled' }), error: null });

    const { result } = renderHook(() => useCancelAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      await result.current.mutateAsync({ id: 'ap-1' });
    });

    expect(calls.of('update')[0].args).toEqual([{
      status: 'cancelled',
      decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      decided_by: 'member-1',
    }]);
  });

  it('reads nothing but the id, so a caller can never smuggle `confirmed`', async () => {
    queueResult({ data: appointment({ status: 'cancelled' }), error: null });

    const { result } = renderHook(() => useCancelAppointment(), { wrapper: makeWrapper(freshClient()) });

    await act(async () => {
      // The payload type rejects this at compile time; the body drops it too.
      await result.current.mutateAsync({ id: 'ap-1', status: 'confirmed' } as { id: string });
    });

    const payload = calls.of('update')[0].args[0] as Record<string, unknown>;
    expect(payload.status).toBe('cancelled');
  });
});

describe('useCollaboratorAppointments', () => {
  it('reads only the session user rows inside the period', async () => {
    queueResult({ data: [appointment()], error: null });

    const { result } = renderHook(
      () => useCollaboratorAppointments('2026-12-01', '2026-12-31'),
      { wrapper: makeWrapper(freshClient()) },
    );

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(calls.of('eq')[0].args).toEqual(['member_user_id', 'member-1']);
    expect(calls.of('gte')[0].args).toEqual(['date', '2026-12-01']);
    expect(calls.of('lte')[0].args).toEqual(['date', '2026-12-31']);
  });
});
