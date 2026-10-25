import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { format } from 'date-fns';
import { AgendaPJ } from './AgendaPJ';
import type { TimeBlock } from '@/types/database';

// T8 Done-when: "AgendaPJ.tsx mounts them and still renders the personal agenda
// with no user-visible change". The personal agenda is rendered end to end with
// a fixed `time_blocks` set; only the data hooks are replaced.

vi.mock('@/hooks/useAgendaPJ', () => ({
  useTimeBlocks: vi.fn(() => ({ data: blocks })),
  useCreateTimeBlock: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateTimeBlock: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteTimeBlock: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const TODAY = format(new Date(), 'yyyy-MM-dd');

const blocks: TimeBlock[] = [
  {
    id: 'tb-1',
    user_id: 'u1',
    title: 'Reunião com cliente',
    date: TODAY,
    start_time: '09:00',
    end_time: '10:00',
    type: 'reuniao',
    color: '#3b82f6',
    completed: false,
    created_at: '2026-11-05T12:00:00Z',
  },
  {
    id: 'tb-2',
    user_id: 'u1',
    title: 'Follow-up',
    date: TODAY,
    start_time: '15:00',
    end_time: '16:00',
    type: 'cliente',
    color: null,
    completed: false,
    created_at: '2026-11-05T12:00:00Z',
  },
];

beforeEach(() => {
  if (!('ResizeObserver' in globalThis)) {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  }
});

describe('AgendaPJ (personal agenda, day view)', () => {
  it('renders the personal time blocks through the extracted day view', () => {
    render(<AgendaPJ />);

    expect(screen.getByText('Reunião com cliente')).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument();
    expect(screen.getByText('15:00–16:00')).toBeInTheDocument();
  });

  it('keeps the personal popover actions working on the original row', () => {
    render(<AgendaPJ />);

    fireEvent.click(screen.getByText('Reunião com cliente'));
    expect(screen.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(screen.getByText('Reunião')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument();
  });

  it('keeps edit and delete working from the month grid popover', async () => {
    // The month grid gained the popover the day and week views already had, so
    // the personal agenda's own actions have to follow it there.
    render(<AgendaPJ />);
    fireEvent.click(screen.getByRole('button', { name: /Mês/ }));

    fireEvent.click(screen.getByText('Reunião com cliente'));
    const popover = within(screen.getByRole('dialog'));
    expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();

    fireEvent.click(popover.getByRole('button', { name: /Editar/ }));

    expect(await screen.findByText('Editar Compromisso')).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toHaveValue('Reunião com cliente');
  });

  it('never offers the collaborator answer actions (COLAB-13 gate)', () => {
    // The popover content is shared with the collaborator agenda. The personal
    // agenda supplies neither onConfirm nor onCancel and never produces an
    // `appointment` event, so all three gates hold here and the personal
    // popover must stay exactly as it was.
    render(<AgendaPJ />);

    fireEvent.click(screen.getByText('Reunião com cliente'));
    const popover = within(screen.getByRole('dialog'));

    expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(popover.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
    // Exactly Editar plus the unnamed delete icon — nothing was added.
    expect(popover.getAllByRole('button')).toHaveLength(2);
  });

  it('shows the period header and the three view modes', () => {
    render(<AgendaPJ />);

    // Each toggle button renders a desktop and a mobile label, so its
    // accessible name is the label twice.
    expect(screen.getByRole('button', { name: /Dia/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Semana/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mês/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo/ })).toBeInTheDocument();
  });
});
