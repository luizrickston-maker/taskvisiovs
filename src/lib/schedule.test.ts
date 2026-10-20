import { beforeAll, describe, expect, it } from 'vitest';
import { formatDateBR, hasConflict, parseDateOnly, rangesOverlap, timeToMinutes } from '@/lib/schedule';
import type { TimeBlock } from '@/types/database';

// The spec interprets every date-only value in America/Sao_Paulo (UTC-3).
const TIMEZONE = 'America/Sao_Paulo';

beforeAll(() => {
  process.env.TZ = TIMEZONE;
});

function block(partial: Partial<TimeBlock>): TimeBlock {
  return {
    id: 'block-1',
    user_id: 'user-1',
    date: '2026-11-05',
    start_time: '14:00',
    end_time: '16:00',
    title: 'Bloco',
    type: 'trabalho',
    color: null,
    completed: false,
    created_at: '2026-11-01T12:00:00',
    ...partial,
  };
}

describe('timeToMinutes', () => {
  it('converts an HH:MM value to minutes past midnight', () => {
    expect(timeToMinutes('14:00')).toBe(840);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('00:00')).toBe(0);
  });
});

describe('rangesOverlap', () => {
  it('reports a genuine overlap', () => {
    expect(
      rangesOverlap({ start: '14:00', end: '16:00' }, { start: '15:00', end: '17:00' })
    ).toBe(true);
    expect(
      rangesOverlap({ start: '14:00', end: '18:00' }, { start: '15:00', end: '16:00' })
    ).toBe(true);
  });

  // Spec edge case: "IF an appointment's start_time equals an unavailability's
  // end_time, or vice versa (touching but not overlapping), THEN the system
  // SHALL treat it as non-conflicting and permit the save."
  it('treats touching endpoints as non-overlapping', () => {
    expect(
      rangesOverlap({ start: '14:00', end: '16:00' }, { start: '16:00', end: '17:00' })
    ).toBe(false);
    expect(
      rangesOverlap({ start: '12:00', end: '14:00' }, { start: '14:00', end: '16:00' })
    ).toBe(false);
  });
});

describe('hasConflict', () => {
  it('conflicts when the same-day ranges overlap', () => {
    expect(hasConflict({ date: '2026-11-05', start_time: '14:00', end_time: '16:00' }, block({}))).toBe(true);
  });

  it('does not conflict on a different date', () => {
    expect(
      hasConflict({ date: '2026-11-06', start_time: '14:00', end_time: '16:00' }, block({}))
    ).toBe(false);
  });

  it('does not conflict with itself', () => {
    expect(
      hasConflict({ id: 'block-1', date: '2026-11-05', start_time: '14:00', end_time: '16:00' }, block({}))
    ).toBe(false);
  });

  it('does not conflict when either side has no time bounds', () => {
    expect(hasConflict({ date: '2026-11-05' }, block({}))).toBe(false);
    expect(
      hasConflict({ date: '2026-11-05', start_time: '14:00' }, block({}))
    ).toBe(false);
  });

  it('does not conflict when the ranges only touch', () => {
    expect(
      hasConflict({ date: '2026-11-05', start_time: '16:00', end_time: '17:00' }, block({}))
    ).toBe(false);
  });
});

describe('parseDateOnly', () => {
  it("yields 2026-11-05 for '2026-11-05' for a UTC-3 viewer", () => {
    const parsed = parseDateOnly('2026-11-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10); // November, zero-indexed
    expect(parsed.getDate()).toBe(5);
  });

  it('constructs the date at local noon, not at UTC midnight', () => {
    expect(parseDateOnly('2026-11-05').getHours()).toBe(12);
    // A bare `new Date('2026-11-05')` is UTC midnight = 2026-11-04 21:00 in
    // São Paulo; the noon guard is what keeps the day from shifting.
    expect(new Date('2026-11-05').getDate()).toBe(4);
  });

  it('keeps the day invariant for year-end and month-start values', () => {
    const yearEnd = parseDateOnly('2026-12-31');
    expect(yearEnd.getDate()).toBe(31);
    expect(yearEnd.getMonth()).toBe(11);
    expect(yearEnd.getFullYear()).toBe(2026);
  });
});

describe('formatDateBR', () => {
  it("renders '2026-11-05' as dd/MM/yyyy", () => {
    expect(formatDateBR('2026-11-05')).toBe('05/11/2026');
  });

  it('zero-pads day and month', () => {
    expect(formatDateBR('2026-01-02')).toBe('02/01/2026');
  });
});
