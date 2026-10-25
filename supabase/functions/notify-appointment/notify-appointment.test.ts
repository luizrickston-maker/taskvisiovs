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
  workspace_id: 'workspace-1',
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
  /** ACK-03 — the `agenda` recipients the fake hands back, and the legacy one. */
  agendaRecipients: string[];
  workspaceNotifyWhatsapp: string | null;
  /** Which workspace each recipient lookup asked about (ACK-03). */
  recipientLookups: string[];
  attempts: Array<{ attempt: number; status: NotifyStatus | null; providerResponse: string | null }>;
  /** Every argument the module handed to the log write (NOTIF-08). */
  logged: Array<{
    appointmentId: string;
    attempt: number;
    status: NotifyStatus;
    providerResponse: string | null;
  }>;
  notifyStatus: string | null;
};

function makeStore(options: {
  appointment?: AppointmentRow | null;
  collaborator?: CollaboratorRow | null;
  agendaRecipients?: string[];
  workspaceNotifyWhatsapp?: string | null;
  nextAttempt?: number;
} = {}): { store: NotifyStore; state: FakeState } {
  const state: FakeState = {
    appointment: options.appointment === undefined ? { ...baseAppointment } : options.appointment,
    collaborator:
      options.collaborator === undefined
        ? { name: 'Maria Silva', whatsapp: '5511999990001' }
        : options.collaborator,
    agendaRecipients: options.agendaRecipients ?? [],
    workspaceNotifyWhatsapp: options.workspaceNotifyWhatsapp ?? null,
    recipientLookups: [],
    attempts: [],
    logged: [],
    notifyStatus: 'pending',
  };

  const store: NotifyStore = {
    getAppointment: async () => state.appointment,
    getCollaborator: async () => state.collaborator,
    getAgendaRecipients: async (workspaceId) => {
      state.recipientLookups.push(workspaceId);
      return state.agendaRecipients;
    },
    getWorkspaceNotifyWhatsapp: async () => state.workspaceNotifyWhatsapp,
    // Fixed value when given, so two invocations race for the same attempt.
    nextAttempt: async () => options.nextAttempt ?? state.attempts.length + 1,
    claimAttempt: async (_id, attempt) => {
      if (state.attempts.some((row) => row.attempt === attempt)) return false;
      state.attempts.push({ attempt, status: null, providerResponse: null });
      return true;
    },
    recordAttempt: async (appointmentId, attempt, status, providerResponse) => {
      state.logged.push({ appointmentId, attempt, status, providerResponse });
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

describe('log row per send attempt (NOTIF-08)', () => {
  it('hands the appointment id to the log write along with attempt, status and provider response', async () => {
    const { store, state } = makeStore();
    const { fetchImpl } = makeFetch(() => ({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => 'indisponível',
    }));

    await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl }));

    // The spec names one row per attempt carrying appointment_id, attempt,
    // status and provider_response; created_at is the database default and is
    // asserted against the real table in
    // tests/db/schema-collaborator-agenda.test.ts.
    expect(state.logged).toEqual([
      {
        appointmentId: 'appointment-1',
        attempt: 1,
        status: 'failed',
        providerResponse: expect.stringContaining('agzap_503'),
      },
    ]);
  });

  it('keeps the attempt history one row per attempt, never an update of an earlier one', async () => {
    const { store, state } = makeStore();
    await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl: makeFetch(() => okFetch()).fetchImpl }));
    await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl: makeFetch(() => okFetch()).fetchImpl }));

    expect(state.logged.map((row) => row.attempt)).toEqual([1, 2]);
    expect(state.logged.map((row) => row.appointmentId)).toEqual(['appointment-1', 'appointment-1']);
  });

  it('writes those columns against appointment_notification_log in the Deno entry point', () => {
    // SPEC_PRECISION_GAP: Deno is not installed on this machine (AD-003), so
    // index.ts's real INSERT/UPDATE never executes here. The write is pinned
    // at the only boundary this suite can reach - the table name and the
    // column names in the source - while the row the database actually
    // produces, including created_at, is asserted in
    // tests/db/schema-collaborator-agenda.test.ts.
    expect(indexSource).toContain('.from("appointment_notification_log")');
    expect(indexSource).toContain('appointment_id: id');
    expect(indexSource).toContain('provider_response: providerResponse');
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

describe('one operation, three reasons (NOTIF-07)', () => {
  it('exposes exactly one handler and accepts nothing but POST', async () => {
    const shared = await import('../_shared/notify-appointment.ts');

    // The runtime surface is one handler wearing a `kind`. There is no edit,
    // cancel or status operation to call, and every verb but POST is refused
    // with 405.
    expect(Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS', 'handleNotifyAppointment']);
    expect(indexSource).toContain('req.method !== "POST"');
  });

  it('knows exactly three reasons to send, none of them an edit (NOTIF-07)', () => {
    const declared = /const KINDS[^=]*=\s*\[([\s\S]*?)\]/.exec(indexSource)?.[1] ?? '';
    expect(declared.match(/"[a-z_]+"/g)).toEqual([
      '"created"',
      '"cancelled_by_collaborator"',
      '"cancelled_by_manager"',
    ]);
  });
});

// ACK-02..ACK-05 — a cancellation reaches the other party in both directions,
// and a failure to deliver it changes nothing about the cancellation itself.
describe('cancellation notifications (ACK-02..ACK-05)', () => {
  const cancelledAppointment: AppointmentRow = { ...baseAppointment, status: 'cancelled' };
  const PJ_DEEP_LINK = 'https://taskvisiovs.vercel.app/pj/agenda';

  const messageOf = (call: { init: FetchInitLike }): string =>
    (JSON.parse(call.init.body) as { message: string }).message;
  const numberOn = (call: { init: FetchInitLike }): string =>
    (JSON.parse(call.init.body) as { number: string }).number;

  it('tells the collaborator, on their own number, when the manager cancels (ACK-04)', async () => {
    const { store, state } = makeStore({ appointment: { ...cancelledAppointment } });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_manager'
    );

    expect(calls).toHaveLength(1);
    expect(numberOn(calls[0])).toBe('5511999990001');
    const message = messageOf(calls[0]);
    expect(message).toContain('Olá Maria,');
    expect(message).toContain('seu gestor cancelou');
    expect(message).toContain('Reunião de alinhamento');
    expect(message).toContain('05/11/2026');
    expect(message).toContain('14:00–16:00');
    expect(message).toContain(DEEP_LINK);

    expect(result.body.notify_status).toBe('sent');
    expect(state.attempts).toEqual([{ attempt: 1, status: 'sent', providerResponse: null }]);
  });

  it('tells the workspace agenda recipients when the collaborator cancels (ACK-03)', async () => {
    const { store, state } = makeStore({
      appointment: { ...cancelledAppointment },
      agendaRecipients: ['5511888880002', '5511888880003'],
    });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_collaborator'
    );

    // One message per recipient, and never to the collaborator's own number.
    expect(calls.map(numberOn)).toEqual(['5511888880002', '5511888880003']);
    expect(messageOf(calls[0])).toContain('Maria cancelou um compromisso');
    expect(messageOf(calls[0])).toContain(PJ_DEEP_LINK);
    expect(result.body.notify_status).toBe('sent');
    expect(state.attempts).toEqual([{ attempt: 1, status: 'sent', providerResponse: null }]);
  });

  it('asks for the recipients of the workspace that owns the row (ACK-03)', async () => {
    const { store, state } = makeStore({
      appointment: { ...cancelledAppointment, workspace_id: 'workspace-owning' },
      agendaRecipients: ['5511888880002'],
    });

    await handleNotifyAppointment('appointment-1', deps({ store, fetchImpl: makeFetch(() => okFetch()).fetchImpl }), 'cancelled_by_collaborator');

    // No phone number is written anywhere in this module: the recipients come
    // from the row's workspace.
    expect(state.recipientLookups).toEqual(['workspace-owning']);
  });

  it('falls back to the legacy workspace number when no agenda recipient is set (ACK-03)', async () => {
    const { store } = makeStore({
      appointment: { ...cancelledAppointment },
      agendaRecipients: [],
      workspaceNotifyWhatsapp: '5511777770004',
    });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_collaborator'
    );

    expect(calls).toHaveLength(1);
    expect(numberOn(calls[0])).toBe('5511777770004');
  });

  it('records a failed cancellation send and leaves the cancellation standing (ACK-05)', async () => {
    const { store, state } = makeStore({
      appointment: { ...cancelledAppointment },
      agendaRecipients: ['5511888880002'],
    });
    const { fetchImpl } = makeFetch(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    }));

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_collaborator'
    );

    // The row is still cancelled — a WhatsApp outage cancels nothing back.
    expect(state.appointment?.status).toBe('cancelled');
    // …and the attempt is on the record, with the provider's answer.
    expect(state.attempts).toEqual([
      { attempt: 1, status: 'failed', providerResponse: expect.stringContaining('agzap_500') },
    ]);
    expect(result.body.notify_status).toBe('failed');
  });

  it('reports no_whatsapp when the workspace has nobody to tell (ACK-03)', async () => {
    const { store, state } = makeStore({
      appointment: { ...cancelledAppointment },
      agendaRecipients: [],
      workspaceNotifyWhatsapp: null,
    });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    const result = await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_collaborator'
    );

    expect(calls).toHaveLength(0);
    expect(state.notifyStatus).toBe('pending');
    expect(state.attempts).toEqual([{ attempt: 1, status: 'no_whatsapp', providerResponse: null }]);
    expect(result.body.notify_status).toBe('no_whatsapp');
  });

  it('leaves the creation verdict alone when a cancellation is sent', async () => {
    const { store, state } = makeStore({
      appointment: { ...cancelledAppointment, notify_status: 'sent' },
      agendaRecipients: ['5511888880002'],
    });

    await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl: makeFetch(() => okFetch()).fetchImpl }),
      'cancelled_by_collaborator'
    );

    // `notify_status` belongs to the creation notice the manager can still
    // resend; the cancellation attempt lives in the log.
    expect(state.appointment?.notify_status).toBe('sent');
    expect(state.logged[0].status).toBe('sent');
  });

  it('appends the observation to a cancellation message, like the creation one (NOTIF-09)', async () => {
    const { store } = makeStore({
      appointment: { ...cancelledAppointment, notes: 'Cliente desmarcou' },
      agendaRecipients: ['5511888880002'],
    });
    const { calls, fetchImpl } = makeFetch(() => okFetch());

    await handleNotifyAppointment(
      'appointment-1',
      deps({ store, fetchImpl }),
      'cancelled_by_collaborator'
    );

    expect(messageOf(calls[0])).toContain('Observação: Cliente desmarcou');
  });

  it('resolves the workspace recipients in the Deno entry point, with no number in code', () => {
    // SPEC_PRECISION_GAP: Deno is not installed (AD-003), so the real query
    // never runs here. ACK-03's mechanism — active `notification_recipients`
    // with `types @> {agenda}`, falling back to `workspaces.notify_whatsapp` —
    // is pinned at the only boundary this suite can reach, the same way NOTIF-08
    // pins the log write.
    expect(indexSource).toContain('.from("notification_recipients")');
    expect(indexSource).toContain('.eq("is_active", true)');
    expect(indexSource).toContain('.contains("types", ["agenda"])');
    expect(indexSource).toContain('.from("workspaces")');
    expect(indexSource).toContain('notify_whatsapp');
    // NOTIF-05: the provider URL still comes from the environment — the entry
    // point only injects `Deno.env.get`, the shared module asks for AGZAP_URL —
    // and no recipient phone number lives anywhere in the module.
    expect(indexSource).toContain('env: (name) => Deno.env.get(name)');
    expect(coreSource).toContain("deps.env('AGZAP_URL')");
    expect(coreSource).not.toMatch(/55\d{10}/);
    expect(indexSource).not.toMatch(/55\d{10}/);
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
