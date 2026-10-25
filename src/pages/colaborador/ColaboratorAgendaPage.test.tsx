import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { format } from 'date-fns';
import ColaboratorAgendaPage from './ColaboratorAgendaPage';
import type { CollaboratorAppointmentRow, CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';

// The page always opens on the current month, so the fixtures use today.
const TODAY = format(new Date(), 'yyyy-MM-dd');

const { appointments, availabilityRows, respondMutate, deleteMutate, respondState } = vi.hoisted(() => ({
  appointments: [] as unknown[],
  availabilityRows: [] as unknown[],
  respondMutate: vi.fn(async (args: unknown) => args),
  deleteMutate: vi.fn(async (id: unknown) => id),
  // ACK-06…ACK-08: the notice the respond hook records after a cancellation.
  respondState: { notice: null as unknown },
}));

vi.mock('@/hooks/useCollaboratorAppointments', () => ({
  // The real hook excludes cancelled rows at the query
  // (src/hooks/useCollaboratorAppointments.ts, asserted in its own suite); the
  // double applies the same exclusion so a cancelled fixture means what it
  // means in production.
  useCollaboratorAppointments: () => ({
    data: appointments.filter(row => row.status !== 'cancelled'),
    isLoading: false,
  }),
  useRespondAppointment: () => ({
    mutateAsync: respondMutate,
    isPending: false,
    notice: respondState.notice,
  }),
  NOTIFY_FUNCTION: 'notify-appointment',
}));

vi.mock('@/hooks/useCollaboratorAvailability', () => ({
  // A copy, the way a refetch hands the page a fresh array: the page memoizes
  // on the reference, so the same object would never drop a deleted row.
  useCollaboratorAvailability: () => ({ data: availabilityRows.slice(), isLoading: false }),
  useCreateAvailability: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAvailability: () => ({ mutate: deleteMutate, isPending: false }),
}));

vi.mock('@/hooks/useCollaboratorPermissions', () => ({
  useCollaboratorPermissions: () => ({ can: () => true, isLoading: false, permissions: new Map() }),
}));

function appointment(overrides: Partial<CollaboratorAppointmentRow> = {}): CollaboratorAppointmentRow {
  return {
    id: 'ap-1',
    workspace_id: 'ws-1',
    member_user_id: 'member-1',
    created_by: 'manager-1',
    title: 'Reunião com cliente',
    notes: null,
    date: TODAY,
    start_time: '09:00',
    end_time: '10:00',
    status: 'pending',
    decided_at: null,
    decided_by: null,
    notify_status: 'sent',
    ...overrides,
  };
}

function availability(overrides: Partial<CollaboratorAvailabilityRow> = {}): CollaboratorAvailabilityRow {
  return {
    id: 'av-1',
    workspace_id: 'ws-1',
    member_user_id: 'member-1',
    start_date: TODAY,
    end_date: TODAY,
    start_time: null,
    end_time: null,
    reason: 'Consulta médica',
    ...overrides,
  };
}

function pageTree() {
  return (
    <MemoryRouter initialEntries={['/colaborador/agenda']}>
      <Routes>
        <Route path="/colaborador/agenda" element={<ColaboratorAgendaPage />} />
        <Route path="/auth" element={<div>LOGIN-SCREEN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPage() {
  return render(pageTree());
}

beforeEach(() => {
  appointments.length = 0;
  availabilityRows.length = 0;
  respondMutate.mockClear();
  deleteMutate.mockClear();
  respondState.notice = null;
});

describe('ColaboratorAgendaPage', () => {
  it('renders the calendar with nothing declared or scheduled (empty state)', () => {
    renderPage();

    expect(screen.getByText('Nenhum compromisso no período.')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma indisponibilidade declarada neste mês.')).toBeInTheDocument();
    // The calendar itself renders, with no empty-state error (Edge Cases).
    expect(screen.getByText('Seg')).toBeInTheDocument();
    // COLAB-01: a session takes the collaborator straight to the agenda.
    expect(screen.queryByText('LOGIN-SCREEN')).not.toBeInTheDocument();
  });

  it('renders availability as a blocked block on the calendar (AVAIL-07)', () => {
    availabilityRows.push(availability());
    renderPage();

    const chips = document.querySelectorAll('.grid.grid-cols-7 .truncate');
    expect([...chips].some(c => c.textContent?.includes('Consulta médica'))).toBe(true);
    // The same row is also listed under "Indisponibilidades".
    expect(screen.getAllByText('Consulta médica').length).toBeGreaterThanOrEqual(2);
  });

  it('removes an unavailability row and re-renders the calendar without a reload (AVAIL-09)', () => {
    availabilityRows.push(availability());
    const { rerender } = renderPage();
    // The row is both a blocked block on the calendar and an entry in the list.
    expect(screen.getAllByText('Consulta médica').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(
      screen.getByRole('button', { name: 'Remover indisponibilidade: Consulta médica' }),
    );
    expect(deleteMutate).toHaveBeenCalledWith('av-1');

    // useDeleteAvailability invalidates the availability query on success
    // (src/hooks/useCollaboratorAvailability.test.tsx), so the refetch drops the
    // row and the calendar re-renders in place — the page never navigates.
    availabilityRows.length = 0;
    rerender(pageTree());

    expect(screen.queryByText('Consulta médica')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma indisponibilidade declarada neste mês.')).toBeInTheDocument();
  });

  it('marks only the appointment that overlaps declared unavailability (AVAIL-10)', () => {
    // A timed block, so the day still holds an appointment that does not touch it.
    availabilityRows.push(availability({ start_time: '14:00', end_time: '16:00' }));
    appointments.push(
      appointment({ id: 'ap-overlap', title: 'Dentista', start_time: '15:00', end_time: '16:00' }),
      appointment({ id: 'ap-free', title: 'Visita técnica', start_time: '09:00', end_time: '10:00' }),
    );
    renderPage();

    const dayEvents = [...document.querySelectorAll('[data-event]')];
    const overlapping = dayEvents.find(el => el.textContent?.includes('Dentista'));
    const free = dayEvents.find(el => el.textContent?.includes('Visita técnica'));

    // The badge the spec asks for: a conflict ring and its alert icon.
    expect(overlapping).toBeTruthy();
    expect(overlapping!.className).toContain('ring-destructive');
    expect(overlapping!.querySelector('svg')).toBeTruthy();

    // …and only on that one: a badge that is always on would pass a one-sided test.
    expect(free).toBeTruthy();
    expect(free!.className).not.toContain('ring-destructive');
    expect(free!.querySelector('svg')).toBeFalsy();
  });

  it('shows both confirm and cancel for a pending appointment (COLAB-06)', () => {
    appointments.push(appointment({ status: 'pending' }));
    renderPage();

    const section = screen.getByText('Compromissos').closest('section')!;
    expect(within(section).getByText('Reunião com cliente')).toBeInTheDocument();
    expect(within(section).getByText('Pendente')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: /Cancelar/ })).toBeInTheDocument();
  });

  it('shows no actions for a confirmed appointment (COLAB-07)', () => {
    appointments.push(appointment({ status: 'confirmed', decided_at: '2026-11-05T12:00:00Z' }));
    renderPage();

    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
  });

  // Requirement change 2026-10-22: a cancelled appointment used to render with
  // a "Cancelado" badge and no actions (COLAB-07). It now disappears from the
  // page entirely (COLAB-14), so the assertion is absence in both surfaces.
  it('shows a cancelled appointment nowhere — neither calendar nor list (COLAB-14)', () => {
    appointments.push(
      appointment({ id: 'ap-cancelled', title: 'Cancelado pela agenda', status: 'cancelled', decided_at: '2026-11-05T12:00:00Z' }),
      appointment({ id: 'ap-pending', title: 'Ainda de pé' }),
    );
    renderPage();

    expect(screen.queryByText('Cancelado')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelado pela agenda')).not.toBeInTheDocument();
    // The day the cancelled one sat on now holds nothing but the live one.
    expect(document.querySelectorAll('.grid.grid-cols-7 .truncate')).toHaveLength(1);
    // COLAB-07 still holds for whatever is left: only the pending one answers.
    expect(screen.getAllByRole('button', { name: /Confirmar/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Cancelar/ })).toHaveLength(1);
  });

  it('renders the observation next to the appointment (COLAB-12)', () => {
    appointments.push(
      appointment({ id: 'ap-1', title: 'Com nota', notes: 'Trazer o contrato assinado' }),
      appointment({ id: 'ap-2', title: 'Sem nota', notes: null }),
    );
    renderPage();

    const section = screen.getByText('Compromissos').closest('section')!;
    expect(within(section).getByText('Trazer o contrato assinado')).toBeInTheDocument();
    expect(within(section).getByText('Com nota')).toBeInTheDocument();
    expect(within(section).getByText('Sem nota')).toBeInTheDocument();
  });

  it('answers a pending appointment through the respond mutation (COLAB-02)', () => {
    const row = appointment({ status: 'pending' });
    appointments.push(row);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'confirm' });

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'cancel' });
  });

  it('answers from the month grid, where the tap used to do nothing (COLAB-13)', () => {
    const row = appointment({ status: 'pending' });
    appointments.push(row);
    renderPage();

    // The month grid chip — the surface the user tapped, which had no popover.
    const chip = [...document.querySelectorAll('.grid.grid-cols-7 .truncate')]
      .find(el => el.textContent?.includes('Reunião com cliente'));
    expect(chip).toBeTruthy();
    fireEvent.click(chip!);

    const popover = within(screen.getByRole('dialog'));
    expect(popover.getByText('Pendente')).toBeInTheDocument();

    fireEvent.click(popover.getByRole('button', { name: /Confirmar/ }));
    expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'confirm' });

    fireEvent.click(popover.getByRole('button', { name: /Cancelar/ }));
    expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'cancel' });
  });

  // ACK-06…ACK-08 — the cancelled appointment renders nowhere on this page
  // (COLAB-14), so the panel the collaborator is looking at is the only place
  // the delivery verdict can be shown. Both notices are the spec's, verbatim.
  it('reports a delivered cancellation notice in the collaborator\'s own view (ACK-06)', () => {
    respondState.notice = {
      appointmentId: 'ap-1',
      kind: 'cancelled_by_collaborator',
      status: 'sent',
    };
    renderPage();

    expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('reports a failed cancellation notice with its retry action (ACK-07)', () => {
    respondState.notice = {
      appointmentId: 'ap-1',
      kind: 'cancelled_by_collaborator',
      status: 'failed',
    };
    renderPage();

    expect(
      screen.getByText('Compromisso cancelado, mas o aviso não foi enviado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
