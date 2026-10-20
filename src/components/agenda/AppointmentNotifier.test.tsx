import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  AppointmentNotifier,
  NO_WHATSAPP_MESSAGE,
  NOTIFY_FUNCTION,
} from './AppointmentNotifier';
import type { CollaboratorAppointmentRow } from './CalendarEvent';

// ─────────────────────────────────────────────
// The client's half of the notification contract: name the appointment, show
// the verdict, offer a resend. Everything else — message, provider, attempt
// number — belongs to the edge function (NOTIF-05, NOTIF-03).
// ─────────────────────────────────────────────

const { supabase, invokeMock, fromMock } = vi.hoisted(() => {
  const invoke = vi.fn();
  const from = vi.fn();
  return {
    supabase: { functions: { invoke }, from },
    invokeMock: invoke,
    fromMock: from,
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));

function appointment(overrides: Partial<CollaboratorAppointmentRow> = {}): CollaboratorAppointmentRow {
  return {
    id: 'ap-1',
    workspace_id: 'ws-1',
    member_user_id: 'uid-maria',
    created_by: 'manager-1',
    title: 'Visita técnica',
    notes: null,
    date: '2026-11-05',
    start_time: '09:00',
    end_time: '10:00',
    status: 'pending',
    decided_at: null,
    decided_by: null,
    notify_status: 'pending',
    ...overrides,
  };
}

function renderNotifier(row: CollaboratorAppointmentRow | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const view = render(
    <Wrapper>
      <AppointmentNotifier appointment={row} />
    </Wrapper>,
  );
  return {
    ...view,
    /** A refetch yields a new object for the same row. */
    rerenderRow: (next: CollaboratorAppointmentRow | null) =>
      view.rerender(
        <Wrapper>
          <AppointmentNotifier appointment={next} />
        </Wrapper>,
      ),
  };
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: { notify_status: 'sent' }, error: null });
  fromMock.mockReset();
});

describe('AppointmentNotifier — sent', () => {
  it('invokes the function exactly once, naming only the appointment (NOTIF-01)', async () => {
    renderNotifier(appointment());

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1' } });
    expect(await screen.findByTestId('appointment-notifier')).toHaveAttribute('data-status', 'sent');
    // A delivered appointment needs no further action.
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument();
  });

  it('sends once even when the appointment is re-rendered by a refetch', async () => {
    const { rerenderRow } = renderNotifier(appointment());

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    rerenderRow(appointment());
    rerenderRow(appointment());

    await waitFor(() => expect(screen.getByTestId('appointment-notifier')).toHaveAttribute('data-status', 'sent'));
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});

describe('AppointmentNotifier — missing whatsapp (MGR-07)', () => {
  it('shows the spec sentence and a resend affordance', async () => {
    invokeMock.mockResolvedValue({ data: { notify_status: 'no_whatsapp' }, error: null });

    renderNotifier(appointment());

    expect(await screen.findByText(NO_WHATSAPP_MESSAGE)).toBeInTheDocument();
    expect(screen.getByTestId('appointment-notifier')).toHaveAttribute('data-status', 'no_whatsapp');
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});

describe('AppointmentNotifier — failed then resent (NOTIF-02, NOTIF-03)', () => {
  it('keeps the delivery surface, resends as a fresh invocation and flips to sent', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { notify_status: 'failed' }, error: null })
      .mockResolvedValueOnce({ data: { notify_status: 'sent' }, error: null });

    renderNotifier(appointment());

    // NOTIF-02: a failed send surfaces the resend affordance.
    const failed = await screen.findByTestId('appointment-notifier');
    expect(failed).toHaveAttribute('data-status', 'failed');
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reenviar/ }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
    // NOTIF-03, client half: only the id travels, so a previous attempt can
    // never be addressed — and mutated — from here.
    expect(invokeMock.mock.calls.map(([, options]) => options!.body)).toEqual([
      { appointment_id: 'ap-1' },
      { appointment_id: 'ap-1' },
    ]);
    // The client writes no row of its own; the log is service_role-only.
    expect(fromMock).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByTestId('appointment-notifier')).toHaveAttribute('data-status', 'sent'),
    );
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument();
  });

  it('offers the same affordance when the send times out', async () => {
    invokeMock.mockResolvedValue({ data: { notify_status: 'timeout' }, error: null });

    renderNotifier(appointment());

    expect(await screen.findByTestId('appointment-notifier')).toHaveAttribute('data-status', 'timeout');
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
  });

  it('offers the resend when the function itself comes back with an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'credenciais ausentes' } });

    renderNotifier(appointment());

    expect(await screen.findByTestId('appointment-notifier')).toHaveAttribute('data-status', 'failed');
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
  });
});

describe('AppointmentNotifier — stored verdict (NOTIF-08)', () => {
  it('renders the row\'s notify_status without sending again', async () => {
    renderNotifier(appointment({ notify_status: 'no_whatsapp' }));

    expect(await screen.findByText(NO_WHATSAPP_MESSAGE)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('AppointmentNotifier — server-side configuration (NOTIF-05)', () => {
  it('keeps the provider URL and credential out of the client source', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'AppointmentNotifier.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/VITE_|AGZAP|agzap\.com\.br/);
  });
});
