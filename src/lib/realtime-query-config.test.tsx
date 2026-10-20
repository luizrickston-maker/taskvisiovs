import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { REALTIME_QUERY_BINDINGS } from './realtime-query-config';
import { useCollaboratorAppointments } from '@/hooks/useCollaboratorAppointments';
import { useCollaboratorAvailability } from '@/hooks/useCollaboratorAvailability';

// ─────────────────────────────────────────────
// SYNC-01, SYNC-02 and SYNC-04 are about propagation, not about the table
// names: an event on a table has to invalidate the *other party's* open view.
// So the assertions below build the real caches through the real hooks and
// then replay exactly what `useRealtimeQueryInvalidation` does with an event.
// ─────────────────────────────────────────────

const { authUser, supabase } = vi.hoisted(() => ({
  authUser: { current: { id: 'collab-self' } as { id: string } | null },
  supabase: {
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'lte', 'gte', 'order', 'single']) {
        builder[method] = () => builder;
      }
      builder.then = (resolve: unknown, reject: unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve as never, reject as never);
      return builder;
    }),
    rpc: vi.fn(async () => ({ data: false, error: null })),
    functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ({ user: authUser.current }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PERIOD = ['2026-12-01', '2026-12-31'] as const;

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function bindingKeysFor(table: string) {
  const binding = REALTIME_QUERY_BINDINGS.find(entry => entry.table === table);
  expect(binding, `no realtime binding for ${table}`).toBeTruthy();
  return binding!.queryKeys;
}

/** What `useRealtimeQueryInvalidation` does when one event arrives. */
function replayEvent(client: QueryClient, table: string) {
  for (const key of bindingKeysFor(table)) {
    client.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Builds the two caches the feature keeps open: the collaborator reading their
 * own rows, and a manager of another workspace reading that same collaborator.
 */
async function buildBothViews(
  query: 'appointments' | 'availability',
  client: QueryClient,
) {
  authUser.current = { id: 'collab-self' };
  renderHook(
    () => (query === 'appointments'
      ? useCollaboratorAppointments(...PERIOD)
      : useCollaboratorAvailability(...PERIOD)),
    { wrapper: makeWrapper(client) },
  );

  authUser.current = { id: 'manager-a' };
  renderHook(
    () => (query === 'appointments'
      ? useCollaboratorAppointments(...PERIOD, 'collab-self')
      : useCollaboratorAvailability(...PERIOD, 'collab-self')),
    { wrapper: makeWrapper(client) },
  );

  await waitFor(() => {
    const all = client.getQueryCache().getAll();
    expect(all).toHaveLength(2);
    expect(all.every(entry => entry.state.status === 'success')).toBe(true);
  });

  return client.getQueryCache().getAll();
}

describe('realtime bindings for the collaborator agenda', () => {
  it('maps each table to the query key both agendas share', () => {
    expect(bindingKeysFor('collaborator_appointments')).toEqual(['collab-appointments']);
    expect(bindingKeysFor('collaborator_availability')).toEqual(['collab-availability']);
  });

  it('keeps exactly one binding for time_blocks', () => {
    expect(REALTIME_QUERY_BINDINGS.filter(entry => entry.table === 'time_blocks')).toHaveLength(1);
  });
});

describe('SYNC-01 / SYNC-02 — an appointment change reaches both parties', () => {
  it('invalidates the collaborator confirming and the manager watching, from one event', async () => {
    const client = makeClient();
    const entries = await buildBothViews('appointments', client);

    // The two caches really are separate views of the same rows.
    expect(new Set(entries.map(entry => entry.queryKey)).size).toBe(2);

    replayEvent(client, 'collaborator_appointments');

    // SYNC-01: the manager's open /pj/agenda view refetches.
    // SYNC-02: the collaborator's open /colaborador/agenda view refetches.
    expect(entries.every(entry => entry.state.isInvalidated)).toBe(true);
  });

  it('leaves an unrelated cache alone', async () => {
    const client = makeClient();
    const entries = await buildBothViews('appointments', client);

    replayEvent(client, 'collaborator_availability');

    expect(entries.some(entry => entry.state.isInvalidated)).toBe(false);
  });
});

describe('SYNC-04 — an unavailability change reaches both parties', () => {
  it('invalidates both availability caches from one event', async () => {
    const client = makeClient();
    const entries = await buildBothViews('availability', client);

    replayEvent(client, 'collaborator_availability');

    expect(entries.every(entry => entry.state.isInvalidated)).toBe(true);
  });
});
