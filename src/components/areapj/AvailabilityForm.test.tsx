import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  AVAIL_DATE_ORDER_ERROR,
  AVAIL_SINGLE_DAY_ERROR,
  AVAIL_TIME_ORDER_ERROR,
  AvailabilityForm,
  buildAvailabilityInput,
  formSchema,
} from './AvailabilityForm';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock('@/hooks/useCollaboratorAvailability', () => ({
  useCreateAvailability: () => ({ mutateAsync, isPending: false }),
}));

beforeEach(() => {
  mutateAsync.mockClear();
});

/** Radix Select opens on pointerdown. */
async function chooseGranularity(label: string, option: string) {
  const trigger = screen.getByLabelText(label);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

// ─────────────────────────────────────────────
// The three AVAIL rules, asserted on the schema (the validation layer the
// form renders) — each message is the exact string the spec names.
// ─────────────────────────────────────────────

describe('availability validation rules', () => {
  it('rejects an end date earlier than the start date (AVAIL-04)', () => {
    const result = formSchema.safeParse({
      granularity: 'intervalo',
      startDate: '2026-12-31',
      endDate: '2026-12-01',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(AVAIL_DATE_ORDER_ERROR);
  });

  it('rejects times that span more than one day (AVAIL-05)', () => {
    const result = formSchema.safeParse({
      granularity: 'intervalo',
      startDate: '2026-11-10',
      endDate: '2026-11-14',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(AVAIL_SINGLE_DAY_ERROR);
  });

  it('rejects an end time that is not after the start time (AVAIL-06)', () => {
    for (const [start, end] of [['16:00', '14:00'], ['16:00', '16:00']] as const) {
      const result = formSchema.safeParse({
        granularity: 'hora',
        startDate: '2026-11-05',
        endDate: '2026-11-05',
        startTime: start,
        endTime: end,
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(AVAIL_TIME_ORDER_ERROR);
    }
  });

  it('accepts a well-formed hour range (AVAIL-01)', () => {
    const result = formSchema.safeParse({
      granularity: 'hora',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      startTime: '14:00',
      endTime: '16:00',
    });
    expect(result.success).toBe(true);
  });
});

describe('buildAvailabilityInput — the five granularities', () => {
  it('maps an hour range to one timed day', () => {
    expect(buildAvailabilityInput({
      granularity: 'hora',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      startTime: '14:00',
      endTime: '16:00',
    })).toEqual({
      start_date: '2026-11-05',
      end_date: '2026-11-05',
      start_time: '14:00',
      end_time: '16:00',
      reason: null,
    });
  });

  it('maps a half day to its period bounds on one day', () => {
    expect(buildAvailabilityInput({
      granularity: 'meio-dia',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      period: 'tarde',
    })).toEqual({
      start_date: '2026-11-05',
      end_date: '2026-11-05',
      start_time: '13:00',
      end_time: '18:00',
      reason: null,
    });
  });

  it('maps a full day to one date with no times', () => {
    expect(buildAvailabilityInput({
      granularity: 'dia',
      startDate: '2026-11-06',
      endDate: '2026-11-06',
    })).toEqual({
      start_date: '2026-11-06',
      end_date: '2026-11-06',
      reason: null,
    });
  });

  it('maps a multi-day range to both dates with no times (AVAIL-03)', () => {
    expect(buildAvailabilityInput({
      granularity: 'intervalo',
      startDate: '2026-11-10',
      endDate: '2026-11-14',
    })).toEqual({
      start_date: '2026-11-10',
      end_date: '2026-11-14',
      reason: null,
    });
  });

  it('maps a full month to its first and last day (AVAIL-02)', () => {
    expect(buildAvailabilityInput({
      granularity: 'mes',
      startDate: '2026-12',
      endDate: '2026-12',
    })).toEqual({
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      reason: null,
    });
  });
});

// ─────────────────────────────────────────────
// The rendered dialog
// ─────────────────────────────────────────────

describe('AvailabilityForm', () => {
  it('calls the availability mutation once with the declared hour range', async () => {
    render(<AvailabilityForm open onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '16:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      start_date: '2026-11-05',
      end_date: '2026-11-05',
      start_time: '14:00',
      end_time: '16:00',
      reason: null,
    });
  });

  it('shows the AVAIL-06 message and persists nothing when the times are out of order', async () => {
    render(<AvailabilityForm open onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '16:00' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '14:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.getAllByText(AVAIL_TIME_ORDER_ERROR).length).toBeGreaterThan(0),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows the AVAIL-04 message when the range ends before it starts', async () => {
    render(<AvailabilityForm open onCancel={() => {}} />);

    await chooseGranularity('Período', 'Intervalo de dias');
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.getAllByText(AVAIL_DATE_ORDER_ERROR).length).toBeGreaterThan(0),
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('persists a full month as its first and last day', async () => {
    render(<AvailabilityForm open onCancel={() => {}} />);

    await chooseGranularity('Período', 'Mês inteiro');
    fireEvent.change(screen.getByLabelText('Mês'), { target: { value: '2026-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      reason: null,
    });
  });

  it('offers all five granularities', async () => {
    render(<AvailabilityForm open onCancel={() => {}} />);

    fireEvent.pointerDown(screen.getByLabelText('Período'), { button: 0, pointerType: 'mouse' });
    fireEvent.click(screen.getByLabelText('Período'));

    const options = await screen.findAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual([
      'Hora específica',
      'Meio período',
      'Dia inteiro',
      'Intervalo de dias',
      'Mês inteiro',
    ]);
  });
});
