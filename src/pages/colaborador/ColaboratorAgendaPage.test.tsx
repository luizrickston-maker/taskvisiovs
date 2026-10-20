import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { format } from 'date-fns';
import ColaboratorAgendaPage from './ColaboratorAgendaPage';
import type { CollaboratorAppointmentRow, CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';

// The page always opens on the current month, so the fixtures use today.
const TODAY = format(new Date(), 'yyyy-MM-dd');

const { appointments, availabilityRows, respondMutate, deleteMutate } = vi.hoisted(() => ({
  appointments: [] as unknown[],
  availabilityRows: [] as unknown[],
  respondMutate: vi.fn(async (args: unknown) => args),
  deleteMutate: vi.fn(async (id: unknown) => id),
}));

vi.mock('@/hooks/useCollaboratorAppointments', () => ({
  useCollaboratorAppointments: () => ({ data: appointments, isLoading: false }),
  useRespondAppointment: () => ({ mutateAsync: respondMutate, isPending: false }),
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

  it('shows no actions for a cancelled appointment (COLAB-07)', () => {
    appointments.push(appointment({ status: 'cancelled', decided_at: '2026-11-05T12:00:00Z' }));
    renderPage();

    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
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
});
