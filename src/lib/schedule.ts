import { format } from 'date-fns';
import type { TimeBlock } from '@/types/database';

// =====================================================
// Schedule primitives shared by the personal agenda,
// the collaborator agenda and the test suite.
// Moved intact from src/hooks/useAgendaPJ.ts.
// =====================================================

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Touching endpoints do not overlap: `aStart < bEnd && aEnd > bStart`. */
export function rangesOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string }
): boolean {
  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);
  return aStart < bEnd && aEnd > bStart;
}

export function hasConflict(
  a: { date?: string; start_time?: string; end_time?: string; id?: string },
  b: TimeBlock
): boolean {
  if (!a.date || a.date !== b.date) return false;
  if (a.id && a.id === b.id) return false;
  if (!a.start_time || !a.end_time) return false;
  return rangesOverlap(
    { start: a.start_time, end: a.end_time },
    { start: b.start_time, end: b.end_time }
  );
}

/**
 * Builds a Date from a `YYYY-MM-DD` value at local noon, never `new Date(d)`.
 * A bare date string is parsed as UTC midnight, which renders the previous
 * day for a UTC-3 viewer (see spec assumption "Date construction").
 */
export function parseDateOnly(d: string): Date {
  return new Date(`${d}T12:00:00`);
}

/** Formats a `YYYY-MM-DD` value as `dd/MM/yyyy`. */
export function formatDateBR(d: string): string {
  return format(parseDateOnly(d), 'dd/MM/yyyy');
}
