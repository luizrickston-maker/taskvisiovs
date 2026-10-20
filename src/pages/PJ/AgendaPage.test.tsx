import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import AgendaPage from './AgendaPage';
import { useAppStore } from '@/stores/useAppStore';
import type { CollaboratorAppointmentRow, CollaboratorAvailabilityRow } from '@/components/agenda/CalendarEvent';
import type { CorporateTeamMember } from '@/types/database';

// ─────────────────────────────────────────────
// The page is driven end to end through the real hooks, so assertions land on
// what is actually sent to Postgres. Only the transport is doubled: one result
// queue per table, consumed in call order.
// ─────────────────────────────────────────────

const { supabase, calls, queueResult, queueRpc, MANAGER_ID } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown };
  const log: { table: string; method: string; args: unknown[] }[] = [];
  const queues = new Map<string, Result[]>();
  const rpcQueues = new Map<string, Result[]>();

  function push(target: Map<string, Result[]>, key: string, result: Result) {
    const bucket = target.get(key) ?? [];
    bucket.push(result);
    target.set(key, bucket);
  }

  function makeBuilder(table: string) {
    const bucket = queues.get(table);
    const result = bucket && bucket.length > 0 ? bucket.shift()! : { data: null, error: null };
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'lte', 'gte', 'order', 'single']) {
      builder[method] = (...args: unknown[]) => {
        log.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: unknown, reject: unknown) =>
      Promise.resolve(result).then(resolve as never, reject as never);
    return builder;
  }

  const reset = () => {
    log.length = 0;
    queues.clear();
    rpcQueues.clear();
  };

  return {
    MANAGER_ID: 'manager-1',
    supabase: {
      from: (table: string) => {
        log.push({ table, method: 'from', args: [] });
        return makeBuilder(table);
      },
      rpc: (fn: string, args?: unknown) => {
        log.push({ table: fn, method: 'rpc', args: args ? [args] : [] });
        const bucket = rpcQueues.get(fn);
        const result = bucket && bucket.length > 0 ? bucket.shift()! : { data: false, error: null };
        return Promise.resolve(result);
      },
      functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) },
    },
    calls: {
      log,
      from: (table: string) => log.filter(c => c.method === 'from' && c.table === table),
      inserts: () => log.filter(c => c.method === 'insert'),
      updates: () => log.filter(c => c.method === 'update'),
      eqs: () => log.filter(c => c.method === 'eq'),
      reset,
    },
    queueResult: (table: string, result: Result) => push(queues, table, result),
    queueRpc: (fn: string, result: Result) => push(rpcQueues, fn, result),
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'manager-1' } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const blocks = [
  {
    id: 'tb-1',
    user_id: 'manager-1',
    title: 'Meu bloco pessoal',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    type: 'reuniao',
    color: '#3b82f6',
    completed: false,
    created_at: '2026-11-05T12:00:00Z',
  },
];

vi.mock('@/hooks/useAgendaPJ', () => ({
  useTimeBlocks: vi.fn(() => ({ data: blocks })),
  useCreateTimeBlock: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateTimeBlock: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteTimeBlock: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd');

function teamMember(overrides: Partial<CorporateTeamMember> = {}): CorporateTeamMember {
  return {
    id: 'row-maria',
    clt_benefits: null,
    contract_type: 'pj',
    cost: 0,
    created_at: '2026-01-01T00:00:00Z',
    hours_available: null,
    is_active: true,
    name: 'Maria Silva',
    notes: null,
    payment_day: 5,
    role: 'Colaborador',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'manager-1',
    workspace_id: 'ws-1',
    member_user_id: 'uid-maria',
    whatsapp: '5511999990001',
    ...overrides,
  };
}

function appointment(overrides: Partial<CollaboratorAppointmentRow> = {}): CollaboratorAppointmentRow {
  return {
    id: 'ap-1',
    workspace_id: 'ws-1',
    member_user_id: 'uid-maria',
    created_by: 'manager-1',
    title: 'Visita técnica',
    notes: null,
    date: TODAY,
    start_time: '09:00',
    end_time: '10:00',
    status: 'pending',
    decided_at: null,
    decided_by: null,
    notify_status: 'pending',
    ...overrides,
  };
}

function availability(overrides: Partial<CollaboratorAvailabilityRow> = {}): CollaboratorAvailabilityRow {
  return {
    id: 'av-1',
    workspace_id: 'ws-1',
    member_user_id: 'uid-maria',
    start_date: TODAY,
    end_date: TODAY,
    start_time: '14:00',
    end_time: '16:00',
    reason: 'Consulta médica',
    ...overrides,
  };
}

/** Opens the manager's selector and picks a labelled entry. */
async function selectFrom(label: string) {
  const trigger = screen.getByLabelText('Colaborador');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

async function selectCollaborator(label = 'Maria Silva') {
  await selectFrom(label);
  // The collaborator block is mounted; each test then waits for the specific
  // rows it needs, which also pins the order the per-table queues are consumed.
  await screen.findByRole('button', { name: /Novo compromisso/ });
}

async function openCreateDialog() {
  fireEvent.click(screen.getByRole('button', { name: /Novo compromisso/ }));
  await screen.findByRole('dialog');
}

async function fillAndSubmit(values: {
  title: string;
  notes?: string;
  start?: string;
  end?: string;
  date?: string;
}) {
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: values.title } });
  if (values.date) fireEvent.change(screen.getByLabelText('Data'), { target: { value: values.date } });
  if (values.start) fireEvent.change(screen.getByLabelText('Início'), { target: { value: values.start } });
  if (values.end) fireEvent.change(screen.getByLabelText('Fim'), { target: { value: values.end } });
  if (values.notes !== undefined) {
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: values.notes } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AgendaPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  calls.reset();
  vi.clearAllMocks();
  useAppStore.setState({ corporateTeam: [teamMember()] });
});

describe('AgendaPage — own calendar (MGR-02)', () => {
  it('renders the personal time blocks and never queries collaborator appointments', async () => {
    renderPage();

    expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument();
    // Edge Case: the manager's own calendar does not read the feature tables.
    expect(calls.from('collaborator_appointments')).toHaveLength(0);
    expect(calls.from('collaborator_availability')).toHaveLength(0);
  });
});

describe('AgendaPage — collaborator calendar (MGR-03, MGR-11)', () => {
  it('replaces the source with the selected collaborator and drops the personal rows', async () => {
    queueResult('collaborator_appointments', { data: [appointment()], error: null });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await screen.findByText('Meu bloco pessoal');

    await selectCollaborator();

    expect((await screen.findAllByText('Visita técnica')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Meu bloco pessoal')).not.toBeInTheDocument();
    expect(calls.from('collaborator_appointments').length).toBeGreaterThan(0);
    expect(calls.eqs().filter(c => c.table === 'collaborator_appointments').map(c => c.args))
      .toContainEqual(['member_user_id', 'uid-maria']);
  });

  it('restores the personal view with no residual collaborator rows (MGR-11)', async () => {
    queueResult('collaborator_appointments', { data: [appointment()], error: null });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await selectCollaborator();
    expect((await screen.findAllByText('Visita técnica')).length).toBeGreaterThan(0);

    await selectFrom('Minha agenda');

    expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument();
    expect(screen.queryByText('Visita técnica')).not.toBeInTheDocument();
  });

  it('renders an empty calendar with an invitation to schedule, not an error (Edge Cases)', async () => {
    queueResult('collaborator_appointments', { data: [], error: null });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await selectFrom('Maria Silva');

    await screen.findByText(/Nenhum compromisso agendado/);
    expect(screen.getByRole('button', { name: /Novo compromisso/ })).toBeInTheDocument();
    expect(screen.getByText(/Sem indisponibilidade declarada/)).toBeInTheDocument();
    // The calendar itself renders; nothing reports an error.
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows unavailability blocks visually distinct from appointments (MGR-10)', async () => {
    queueResult('collaborator_appointments', { data: [appointment()], error: null });
    queueResult('collaborator_availability', {
      data: [availability({ reason: 'Folga' })],
      error: null,
    });

    renderPage();
    await selectCollaborator();
    expect((await screen.findAllByText('Folga')).length).toBeGreaterThan(0);

    const chips = [...document.querySelectorAll('.grid.grid-cols-7 .truncate')];
    const appointmentChip = chips.find(el => el.textContent?.includes('Visita técnica'));
    const unavailabilityChip = chips.find(el => el.textContent?.includes('Folga'));

    expect(appointmentChip).toBeTruthy();
    expect(unavailabilityChip).toBeTruthy();
    const appointmentStyle = (appointmentChip as HTMLElement).style;
    const unavailabilityStyle = (unavailabilityChip as HTMLElement).style;
    expect(unavailabilityStyle.background).toBeTruthy();
    expect(unavailabilityStyle.background).not.toBe(appointmentStyle.background);
  });
});

describe('AgendaPage — creating an appointment', () => {
  it('refuses an overlapping save with the spec message and persists nothing (MGR-04)', async () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const blocked = availability({
      id: 'av-month',
      start_date: format(monthStart, 'yyyy-MM-dd'),
      end_date: format(monthEnd, 'yyyy-MM-dd'),
      start_time: null,
      end_time: null,
      reason: 'Férias',
    });

    queueResult('collaborator_appointments', { data: [], error: null });
    queueResult('collaborator_availability', { data: [blocked], error: null });
    queueResult('collaborator_availability', { data: [blocked], error: null });
    queueRpc('get_my_workspace_id', { data: 'ws-1', error: null });
    queueRpc('fn_collaborator_has_conflict', { data: true, error: null });

    renderPage();
    await selectFrom('Maria Silva');
    expect((await screen.findAllByText('Férias')).length).toBeGreaterThan(0);

    await openCreateDialog();
    await fillAndSubmit({ title: 'Reunião invadindo folga', date: TODAY });

    const expected = `Este período está indisponível para Maria Silva de ${format(monthStart, 'dd/MM/yyyy')} a ${format(monthEnd, 'dd/MM/yyyy')}.`;
    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(calls.inserts()).toHaveLength(0);
  });

  it('persists the appointment with the member, workspace and observation (MGR-05, MGR-12)', async () => {
    queueResult('collaborator_appointments', { data: [], error: null });
    queueResult('collaborator_appointments', {
      data: appointment({ id: 'ap-new' }),
      error: null,
    });
    queueResult('collaborator_availability', { data: [], error: null });
    queueRpc('get_my_workspace_id', { data: 'ws-1', error: null });
    queueRpc('fn_collaborator_has_conflict', { data: false, error: null });

    renderPage();
    await selectCollaborator();
    await screen.findByText(/Nenhum compromisso agendado/);

    await openCreateDialog();
    await fillAndSubmit({
      title: 'Visita técnica',
      date: TODAY,
      start: '10:00',
      end: '11:00',
      notes: 'Levar o equipamento de teste',
    });

    await waitFor(() => expect(calls.inserts()).toHaveLength(1));
    expect(calls.inserts()[0].args[0]).toEqual({
      workspace_id: 'ws-1',
      member_user_id: 'uid-maria',
      created_by: MANAGER_ID,
      title: 'Visita técnica',
      notes: 'Levar o equipamento de teste',
      date: TODAY,
      start_time: '10:00',
      end_time: '11:00',
    });
  });

  it('stores NULL when no observation is given (MGR-12)', async () => {
    queueResult('collaborator_appointments', { data: [], error: null });
    queueResult('collaborator_appointments', { data: appointment({ id: 'ap-new' }), error: null });
    queueResult('collaborator_availability', { data: [], error: null });
    queueRpc('get_my_workspace_id', { data: 'ws-1', error: null });
    queueRpc('fn_collaborator_has_conflict', { data: false, error: null });

    renderPage();
    await selectCollaborator();
    await screen.findByText(/Nenhum compromisso agendado/);

    await openCreateDialog();
    await fillAndSubmit({ title: 'Sem observação', date: TODAY });

    await waitFor(() => expect(calls.inserts()).toHaveLength(1));
    expect((calls.inserts()[0].args[0] as Record<string, unknown>).notes).toBeNull();
  });

  it('rejects the save when the collaborator was deactivated between select and save (Edge Cases)', async () => {
    renderPage();
    await selectCollaborator();
    await screen.findByText(/Nenhum compromisso agendado/);

    // Deactivated after the selection was made.
    useAppStore.setState({ corporateTeam: [teamMember({ is_active: false })] });

    await openCreateDialog();
    await fillAndSubmit({ title: 'Ainda tentando', date: TODAY });

    expect(await screen.findByRole('alert')).toHaveTextContent('Este colaborador não está mais ativo.');
    expect(calls.inserts()).toHaveLength(0);
  });
});

describe('AgendaPage — manager cancel (MGR-09, AD-007)', () => {
  it('cancels an appointment that is still pending', async () => {
    queueResult('collaborator_appointments', {
      data: [appointment({ status: 'pending' })],
      error: null,
    });
    queueResult('collaborator_appointments', { data: appointment({ status: 'cancelled' }), error: null });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await selectCollaborator();

    fireEvent.click(await screen.findByRole('button', { name: /Cancelar/ }));

    await waitFor(() => expect(calls.updates()).toHaveLength(1));
    expect(calls.updates()[0].args[0]).toEqual({
      status: 'cancelled',
      decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      decided_by: MANAGER_ID,
    });
  });

  it('cancels an appointment the collaborator already confirmed', async () => {
    queueResult('collaborator_appointments', {
      data: [
        appointment({
          status: 'confirmed',
          decided_at: '2026-11-05T12:00:00Z',
          decided_by: 'uid-maria',
        }),
      ],
      error: null,
    });
    queueResult('collaborator_appointments', { data: appointment({ status: 'cancelled' }), error: null });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await selectCollaborator();

    expect(await screen.findByText('Confirmado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    await waitFor(() => expect(calls.updates()).toHaveLength(1));
    expect(calls.updates()[0].args[0]).toEqual({
      status: 'cancelled',
      decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      decided_by: MANAGER_ID,
    });
  });

  it('offers no cancel on an already cancelled row', async () => {
    queueResult('collaborator_appointments', {
      data: [appointment({ status: 'cancelled', decided_at: '2026-11-05T12:00:00Z' })],
      error: null,
    });
    queueResult('collaborator_availability', { data: [], error: null });

    renderPage();
    await selectCollaborator();

    expect(await screen.findByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
    expect(calls.updates()).toHaveLength(0);
  });
});
