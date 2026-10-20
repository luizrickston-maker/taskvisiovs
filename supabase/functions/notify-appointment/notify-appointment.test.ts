import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  SEND_TIMEOUT_MS,
  handleNotifyAppointment,
  type AppointmentRow,
  type CollaboratorRow,
  type FetchInitLike,
  type FetchResponseLike,
  type NotifyDeps,
  type NotifyStatus,
  type NotifyStore,
} from '../_shared/notify-appointment.ts';

const AGZAP_URL = 'https://app.agzap.com.br/send';
const DEEP_LINK = 'https://taskvisiovs.vercel.app/colaborador/agenda';

const sourceOf = (relative: string): string =>
  readFileSync(path.resolve(process.cwd(), relative), 'utf8');

const coreSource = sourceOf('supabase/functions/_shared/notify-appointment.ts');
const indexSource = sourceOf('supabase/functions/notify-appointment/index.ts');

const baseAppointment: AppointmentRow = {
  id: 'appointment-1',
  member_user_id: 'member-1',
  title: 'Reunião de alinhamento',
  notes: null,
  date: '2026-11-05',
  start_time: '14:00',
  end_time: '16:00',
  status: 'pending',
  notify_status: 'pending',
};

type FakeState = {
  appointment: AppointmentRow | null;
  collaborator: CollaboratorRow | null;
  attempts: Array<{ attempt: number; status: NotifyStatus | null; providerResponse: string | null }>;
  notifyStatus: string | null;
};

function makeStore(options: {
  appointment?: AppointmentRow | null;
  collaborator?: CollaboratorRow | null;
  nextAttempt?: number;
} = {}): { store: NotifyStore; state: FakeState } {
  const state: FakeState = {
    appointment: options.appointment === undefined ? { ...baseAppointment } : options.appointment,
    collaborator:
      options.collaborator === undefined
        ? { name: 'Maria Silva', whatsapp: '5511999990001' }
        : options.collaborator,
    attempts: [],
    notifyStatus: 'pending',
  };

  const store: NotifyStore = {
    getAppointment: async () => state.appointment,
    getCollaborator: async () => state.collaborator,
    // Fixed value when given, so two invocations race for the same attempt.
    nextAttempt: async () => options.nextAttempt ?? state.attempts.length + 1,
    claimAttempt: async (_id, attempt) => {
      if (state.attempts.some((row) => row.attempt === attempt)) return false;
      state.attempts.push({ attempt, status: null, providerResponse: null });
      return true;
    },
    recordAttempt: async (_id, attempt, status, providerResponse) => {
      const row = state.attempts.find((candidate) => candidate.attempt === attempt);
      if (row) {
        row.status = status;
        row.providerResponse = providerResponse;
      }
    },
    setNotifyStatus: async (_id, status) => {
      state.notifyStatus = status;
      if (state.appointment) state.appointment.notify_status = status;
    },
  };

  return { store, state };
}

function makeFetch(
  handler: (init: FetchInitLike) => Promise<FetchResponseLike> | FetchResponseLike
): { calls: Array<{ url: string; init: FetchInitLike }>; fetchImpl: NotifyDeps['fetchImpl'] } {
  const calls: Array<{ url: string; init: FetchInitLike }> = [];
  const fetchImpl: NotifyDeps['fetchImpl'] = async (url, init) => {
    calls.push({ url, init });
    return handler(init);
  };
  return { calls, fetchImpl };
}

const okFetch = (): FetchResponseLike => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => 'ok',
});

const env = (overrides: Record<string, string | undefined> = {}): NotifyDeps['env'] => (name) =>
  name in overrides ? overrides[name] : name === 'AGZAP_TOKEN' ? 'token-abc' : AGZAP_URL;

function deps(overrides: Partial<NotifyDeps> & { store: NotifyStore }): NotifyDeps {
  return {
    env: env(),
    fetchImpl: makeFetch(() => okFetch()).fetchImpl,
    ...overrides,
  };
}

describe('notify-appointment happy path (NOTIF-01)', () => {
  it('sends exactly one message and marks notify_status as sent', async () => {
    const { store, state } = makeStore();
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl, env: env({ AGZAP_URL, AGZAP_TOKEN: 'token-abc' }) })
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(AGZAP_URL);

    const body = JSON.parse(calls[0].init.body) as Record<string, unknown>;
    expect(body.token).toBe('token-abc');
    expect(body.number).toBe('5511999990001');
    expect(body.type).toBe('text');
    expect(body.message).toContain('Reunião de alinhamento');
    expect(body.message).toContain('05/11/2026');
    expect(body.message).toContain('14:00–16:00');
    expect(body.message).toContain(DEEP_LINK);

    expect(state.notifyStatus).toBe('sent');
    expect(state.appointment?.notify_status).toBe('sent');
    expect(state.attempts).toEqual([{ attempt: 1, status: 'sent', providerResponse: null }]);
    expect(result.body.notify_status).toBe('sent');
    expect(result.body.attempt).toBe(1);
  });

  it('keeps the appointment in its original pending state after a successful send', async () => {
    const { store, state } = makeStore();
    await handleNotifyAppointment('appointment-1', deps({ store }));

    expect(state.appointment?.status).toBe('pending');
    expect(state.appointment?.title).toBe('Reunião de alinhamento');
  });
});

describe('delivery failures (NOTIF-02, NOTIF-06)', () => {
  it('logs a non-2xx answer as failed and leaves the appointment intact', async () => {
    const { store, state } = makeStore();
    const { fetchImpl } = makeFetch(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    }));

    const result = await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));

    expect(state.notifyStatus).toBe('failed');
    expect(state.appointment?.notify_status).toBe('failed');
    expect(state.appointment?.status).toBe('pending');
    expect(state.attempts).toEqual([
      { attempt: 1, status: 'failed', providerResponse: expect.stringContaining('agzap_500') },
    ]);
    expect(result.body.notify_status).toBe('failed');
  });

  it('logs a thrown error as failed and leaves the appointment intact', async () => {
    const { store, state } = makeStore();
    const { fetchImpl } = makeFetch(() => Promise.reject(new Error('conexão recusada')));

    const result = await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));

    expect(state.notifyStatus).toBe('failed');
    expect(state.appointment?.status).toBe('pending');
    expect(state.attempts).toEqual([
      { attempt: 1, status: 'failed', providerResponse: 'conexão recusada' },
    ]);
    expect(result.body.notify_status).toBe('failed');
  });

  it('aborts after 10 seconds and records the attempt as timeout', async () => {
    const { store, state } = makeStore();
    const { fetchImpl } = makeFetch(
      (init) =>
        new Promise<FetchResponseLike>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        })
    );

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl, timeoutMs: 10 })
    );

    expect(state.notifyStatus).toBe('timeout');
    expect(state.appointment?.notify_status).toBe('timeout');
    expect(state.appointment?.status).toBe('pending');
    expect(state.attempts).toEqual([
      { attempt: 1, status: 'timeout', providerResponse: null },
    ]);
    expect(result.body.notify_status).toBe('timeout');
  });

  it('arms the abort from the 10-second default itself, with nothing injected (NOTIF-06)', async () => {
    // The case above injects its own timeout, which proves the abort path but
    // not the number. The spec says 10 seconds, so the default is the value.
    expect(SEND_TIMEOUT_MS).toBe(10_000);

    vi.useFakeTimers();
    try {
      const { store, state } = makeStore();
      const { fetchImpl } = makeFetch(
        (init) =>
          new Promise<FetchResponseLike>((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const abortError = new Error('aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          })
      );

      // No timeoutMs: the send hangs until the default fires.
      const pending = handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);

      const result = await pending;
      expect(result.body.notify_status).toBe('timeout');
      expect(state.attempts).toEqual([{ attempt: 1, status: 'timeout', providerResponse: null }]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('attempt deduplication (NOTIF-04)', () => {
  it('sends nothing when another invocation already claimed the attempt', async () => {
    // Both invocations compute the same attempt number, as in a race.
    const { store, state } = makeStore({ nextAttempt: 1 });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const first = await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));
    const second = await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));

    expect(first.body.notify_status).toBe('sent');
    expect(second.body.skipped).toBe('attempt already claimed');
    expect(calls).toHaveLength(1);
    // The first attempt keeps its outcome; the second wrote nothing.
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0].status).toBe('sent');
  });
});

describe('resend history (NOTIF-03)', () => {
  it('appends the next attempt and leaves the previous one untouched', async () => {
    const { store, state } = makeStore();

    const first = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl: makeFetch(() => okFetch()).fetchImpl })
    );

    // A resend reaches the same appointment and fails; the earlier attempt
    // keeps its own outcome instead of being overwritten.
    const second = await handleNotifyAppointment(
      'appointment-1',
      deps({
        store,
        fetchImpl: makeFetch(() => ({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          text: async () => 'boom',
        })).fetchImpl,
      })
    );

    expect(first.body.attempt).toBe(1);
    expect(second.body.attempt).toBe(2);
    expect(state.attempts).toHaveLength(2);
    expect(state.attempts[0]).toEqual({
      attempt: 1,
      status: 'sent',
      providerResponse: null,
    });
    expect(state.attempts[1].attempt).toBe(2);
    expect(state.attempts[1].status).toBe('failed');
    // NOTIF-08: `notify_status` carries the latest verdict of that history.
    expect(state.appointment?.notify_status).toBe('failed');
  });
});

describe('missing whatsapp (MGR-07)', () => {
  const cases: Array<[label: string, whatsapp: string | null]> = [
    ['null', null],
    ['empty', ''],
    ['non-digits', '+55 11 99999-0001'],
  ];

  for (const [label, whatsapp] of cases) {
    it(`records ${label} number as no_whatsapp without calling agzap`, async () => {
      const { store, state } = makeStore({ collaborator: { name: 'Maria Silva', whatsapp } });
      const { calls, fetchImpl } = makeFetch(() => okFetch());

      const result = await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));

      expect(calls).toHaveLength(0);
      expect(state.notifyStatus).toBe('no_whatsapp');
      expect(state.appointment?.notify_status).toBe('no_whatsapp');
      expect(state.appointment?.status).toBe('pending');
      expect(state.attempts).toEqual([
        { attempt: 1, status: 'no_whatsapp', providerResponse: null },
      ]);
      expect(result.body.notify_status).toBe('no_whatsapp');
    });
  }
});

describe('server-side credentials (NOTIF-05)', () => {
  it('takes url and token only from the injected environment', async () => {
    const { store, state } = makeStore();
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl, env: () => undefined })
    );

    expect(calls).toHaveLength(0);
    expect(result.body.notify_status).toBe('failed');
    expect(state.notifyStatus).toBe('failed');
  });

  it('keeps the credential path free of VITE_ variables', () => {
    expect(coreSource).not.toContain('VITE_');
    expect(indexSource).not.toContain('VITE_');
  });
});

describe('no edit or cancellation path (NOTIF-07)', () => {
  it('exposes exactly one operation and accepts nothing but POST', async () => {
    const shared = await import('../_shared/notify-appointment.ts');

    // The runtime surface is one handler: there is no edit, cancel or status
    // operation to call, and every verb but POST is refused with 405.
    expect(Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS', 'handleNotifyAppointment']);
    expect(indexSource).toContain('req.method !== "POST"');
  });
});

describe('wiring', () => {
  it('imports the same shared module this suite tests', () => {
    expect(indexSource).toContain('../_shared/notify-appointment.ts');
  });

  it('never touches the real network', async () => {
    const { store } = makeStore();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('a real network call was made');
    }) as unknown as typeof fetch;

    try {
      const result = await handleNotifyAppointment('appointment-1', deps({ store }));
      expect(result.body.notify_status).toBe('sent');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('keeps notify-appointment out of the verify_jwt = false list', () => {
    // config.toml only ever lists functions that were switched to
    // verify_jwt = false; this one must keep the default (true), so it must
    // not be added to the file at all.
    const config = sourceOf('supabase/config.toml');
    expect(config).not.toContain('[functions.notify-appointment]');
    expect(config).not.toMatch(/verify_jwt\s*=\s*false[\s\S]{0,200}notify-appointment/);
  });
});
