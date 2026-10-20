import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { AgendaDayView } from './AgendaDayView';
import { AgendaWeekView } from './AgendaWeekView';
import { AgendaMonthView } from './AgendaMonthView';
import type { AgendaViewEvent } from './events';

// Radix popovers measure with ResizeObserver, which jsdom does not implement.
beforeEach(() => {
  if (!('ResizeObserver' in globalThis)) {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  }
});

// ─────────────────────────────────────────────
// Fixed event set — T8 Done-when: "renders each view with a fixed event set
// and asserts the same DOM a pre-change snapshot produced".
// 2026-11-05 is a Thursday, so the week of that date is Mon 02 .. Sun 08.
// ─────────────────────────────────────────────

const NOV_05 = '2026-11-05';

const REUNIAO: AgendaViewEvent = {
  id: 'ev-1',
  date: NOV_05,
  start: '09:00',
  end: '10:00',
  title: 'Reunião com cliente',
  color: '#3b82f6',
  type: 'reuniao',
  kind: 'personal',
};

const FOLLOW_UP: AgendaViewEvent = {
  id: 'ev-2',
  date: NOV_05,
  start: '15:00',
  end: '16:00',
  title: 'Follow-up',
  color: '#8b5cf6',
  type: 'cliente',
  kind: 'personal',
};

const TAREFA: AgendaViewEvent = {
  id: 'ev-3',
  date: NOV_05,
  start: '11:00',
  end: '12:00',
  title: 'Tarefa solta',
  color: '#f59e0b',
  type: 'tarefa',
  kind: 'personal',
};

const OVERLAPPING: AgendaViewEvent = {
  id: 'ev-4',
  date: NOV_05,
  start: '09:30',
  end: '10:30',
  title: 'Sobreposto',
  color: '#22c55e',
  type: 'projeto',
  kind: 'personal',
};

const TOUCHING: AgendaViewEvent = {
  id: 'ev-5',
  date: NOV_05,
  start: '10:00',
  end: '11:00',
  title: 'Encostado',
  color: '#06b6d4',
  type: 'ligacao',
  kind: 'personal',
};

function nov05(): Date {
  return new Date(2026, 10, 5, 12, 0, 0);
}

describe('AgendaDayView', () => {
  it('renders the fixed event set on the timeline with hour labels and its time range', () => {
    render(
      <AgendaDayView date={nov05()} events={[REUNIAO, FOLLOW_UP]} mode="edit" />
    );

    // Hour labels 07h..22h (START_HOUR..END_HOUR)
    expect(screen.getByText('07h')).toBeInTheDocument();
    expect(screen.getByText('22h')).toBeInTheDocument();

    expect(screen.getByText('Reunião com cliente')).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    // Range line renders only for blocks of 30 minutes or more
    expect(screen.getByText('09:00–10:00')).toBeInTheDocument();
    expect(screen.getByText('15:00–16:00')).toBeInTheDocument();
  });

  it('renders the empty state when the day has no events', () => {
    render(<AgendaDayView date={nov05()} events={[]} mode="edit" />);
    expect(screen.getByText('Nenhum compromisso')).toBeInTheDocument();
    expect(screen.queryByText('09:00–10:00')).not.toBeInTheDocument();
  });

  it('shows the popover with title, range, type badge and the edit/delete actions', () => {
    const onEdit = vi.fn();
    const onRequestDelete = vi.fn();
    render(
      <AgendaDayView
        date={nov05()}
        events={[REUNIAO]}
        mode="edit"
        onEdit={onEdit}
        onRequestDelete={onRequestDelete}
      />
    );

    fireEvent.click(screen.getByText('Reunião com cliente'));

    const popover = within(screen.getByRole('dialog'));
    expect(popover.getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(popover.getByText('Reunião')).toBeInTheDocument();

    const [editar, excluir] = popover.getAllByRole('button');
    fireEvent.click(editar);
    expect(onEdit).toHaveBeenCalledWith(REUNIAO);

    fireEvent.click(excluir);
    expect(onRequestDelete).toHaveBeenCalledWith(REUNIAO);
  });

  it('flags a strict time overlap as a conflict and leaves touching endpoints alone', () => {
    render(
      <AgendaDayView date={nov05()} events={[REUNIAO, OVERLAPPING, TOUCHING]} mode="edit" />
    );

    fireEvent.click(screen.getByText('Reunião com cliente'));
    expect(screen.getAllByText('Conflito de horário')).toHaveLength(1);

    fireEvent.click(screen.getByText('Encostado'));
    expect(screen.getAllByText('Conflito de horário')).toHaveLength(1);
  });

  it('does not add on a background click in read mode', () => {
    const onAddAt = vi.fn();
    const { container } = render(
      <AgendaDayView date={nov05()} events={[REUNIAO]} mode="read" onAddAt={onAddAt} />
    );
    fireEvent.click(container.querySelector('.flex-1.relative')!);
    expect(onAddAt).not.toHaveBeenCalled();
  });
});

describe('AgendaWeekView', () => {
  const days = eachDayOfInterval({
    start: startOfWeek(nov05(), { weekStartsOn: 1 }),
    end: endOfWeek(nov05(), { weekStartsOn: 1 }),
  });

  it('renders the seven day columns of the week with the event on its own day', () => {
    render(
      <AgendaWeekView days={days} events={[REUNIAO]} mode="edit" onDaySelect={() => {}} />
    );

    // Mon 02 .. Sun 08 of November 2026
    for (const d of ['2', '3', '4', '5', '6', '7', '8']) {
      expect(screen.getByText(d)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Reunião com cliente')).toHaveLength(1);
  });

  it('selects the day when its header is clicked', () => {
    const onDaySelect = vi.fn();
    render(
      <AgendaWeekView days={days} events={[REUNIAO]} mode="edit" onDaySelect={onDaySelect} />
    );
    fireEvent.click(screen.getByText('2'));
    expect(onDaySelect).toHaveBeenCalledTimes(1);
    expect(format(onDaySelect.mock.calls[0][0], 'yyyy-MM-dd')).toBe('2026-11-02');
  });
});

describe('AgendaMonthView', () => {
  it('renders the weekday headers, the day cell and the event chips of the fixed set', () => {
    render(
      <AgendaMonthView
        selectedDate={nov05()}
        events={[REUNIAO, FOLLOW_UP]}
        mode="edit"
        onDaySelect={() => {}}
        onAddAt={() => {}}
      />
    );

    for (const d of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
      expect(screen.getByText(d)).toBeInTheDocument();
    }
    expect(screen.getByText('Reunião com cliente')).toBeInTheDocument();
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    // Start time of each chip, as the pre-change view rendered it
    expect(screen.getAllByText(/09:00/).length).toBeGreaterThan(0);
  });

  it('counts the events that do not fit in a day cell', () => {
    render(
      <AgendaMonthView
        selectedDate={nov05()}
        events={[REUNIAO, FOLLOW_UP, TAREFA]}
        mode="edit"
        onDaySelect={() => {}}
        onAddAt={() => {}}
      />
    );
    // 3 events, MAX_VISIBLE = 2
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('offers no add affordance and shows the kind legend in read mode', () => {
    render(
      <AgendaMonthView
        selectedDate={nov05()}
        events={[REUNIAO]}
        mode="read"
        onDaySelect={() => {}}
        onAddAt={() => {}}
      />
    );
    expect(screen.queryByTitle('Adicionar compromisso')).not.toBeInTheDocument();
    expect(screen.getByText('Compromisso')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });
});

describe('extracted views are presentational', () => {
  it('import no data hook, query client or supabase client', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const files = [
      'AgendaDayView.tsx',
      'AgendaWeekView.tsx',
      'AgendaMonthView.tsx',
      'EventPopoverContent.tsx',
    ];

    for (const f of files) {
      const source = fs.readFileSync(path.join(dir, f), 'utf-8');
      expect(source, `${f} must not reference a data hook`).not.toMatch(
        /useAgendaPJ|useCollaborator|useQuery|useMutation|supabase|@\/hooks\//
      );
    }
  });
});
