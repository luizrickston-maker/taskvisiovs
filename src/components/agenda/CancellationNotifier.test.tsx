import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CancellationNotifier } from './CancellationNotifier';
import type { CancellationNotice } from '@/hooks/useCollaboratorAppointments';

// ─────────────────────────────────────────────
// ACK-06…ACK-08 — the notice the party that cancelled must see. A cancelled
// appointment is dropped from every read path (COLAB-14, MGR-13) and the
// attempt log has no RLS, so this surface is the only one that can report the
// delivery. The strings are the spec's, asserted verbatim.
// ─────────────────────────────────────────────

const { supabase, invokeMock } = vi.hoisted(() => {
  const invoke = vi.fn();
  return { supabase: { functions: { invoke } }, invokeMock: invoke };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));

function notice(overrides: Partial<CancellationNotice> = {}): CancellationNotice {
  return {
    appointmentId: 'ap-1',
    kind: 'cancelled_by_collaborator',
    status: 'sent',
    ...overrides,
  };
}

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: { notify_status: 'sent' }, error: null });
});

describe('CancellationNotifier — delivered on the first attempt (ACK-06)', () => {
  it('shows the spec sentence and offers no further action', () => {
    render(<CancellationNotifier notice={notice({ status: 'sent' })} />);

    expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    // The first attempt already ran inside the cancel mutation; the panel must
    // not send anything of its own.
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe('CancellationNotifier — the notice was not delivered (ACK-07)', () => {
  it('shows the spec sentence with a `Tentar novamente` action when delivery failed', () => {
    render(<CancellationNotifier notice={notice({ status: 'failed' })} />);

    expect(
      screen.getByText('Compromisso cancelado, mas o aviso não foi enviado.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Compromisso cancelado.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('shows the same notice when the delivery timed out', () => {
    render(<CancellationNotifier notice={notice({ status: 'timeout' })} />);

    expect(
      screen.getByText('Compromisso cancelado, mas o aviso não foi enviado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('keeps the failure notice when the retry does not deliver either', async () => {
    invokeMock.mockResolvedValue({ data: { notify_status: 'timeout' }, error: null });

    render(<CancellationNotifier notice={notice({ status: 'failed' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText('Compromisso cancelado, mas o aviso não foi enviado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});

describe('CancellationNotifier — `Tentar novamente` (ACK-08)', () => {
  it('re-attempts delivery naming the same appointment and the same act, then replaces the notice', async () => {
    // The first attempt already ran inside the cancel mutation; the panel
    // receives its verdict and only the retry is a new invocation.
    render(<CancellationNotifier notice={notice({ status: 'failed' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    // Only the appointment and the act travel: the attempt number is the
    // server's to allocate, so a previous attempt can never be rewritten here.
    expect(invokeMock).toHaveBeenCalledWith('notify-appointment', {
      body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' },
    });

    expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument();
    expect(
      screen.queryByText('Compromisso cancelado, mas o aviso não foi enviado.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('keeps the manager\'s act when the manager was the one who cancelled', async () => {
    render(
      <CancellationNotifier
        notice={notice({ kind: 'cancelled_by_manager', status: 'failed' })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith('notify-appointment', {
      body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' },
    });
    expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument();
  });
});
