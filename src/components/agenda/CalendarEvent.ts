import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { parseDateOnly, rangesOverlap } from '@/lib/schedule';
import { getTypeConf } from '@/components/agenda/views';
import type { TimeBlock } from '@/types/database';

// =====================================================
// CalendarEvent: the one shape every calendar source maps into. The views
// render it without knowing whether the row came from `time_blocks`,
// `collaborator_availability` or `collaborator_appointments`.
// =====================================================

export type CalendarEvent = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
  title: string;
  color: string;
  kind: 'appointment' | 'unavailability' | 'personal';
  status?: 'pending' | 'confirmed' | 'cancelled';
  conflicted?: boolean;
  notes?: string | null;
};

// Rows are mapped from these shapes; the generated Supabase types do not
// carry the two tables yet, so the column set lives here.
export interface CollaboratorAvailabilityRow {
  id: string;
  workspace_id: string;
  member_user_id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface CollaboratorAppointmentRow {
  id: string;
  workspace_id: string;
  member_user_id: string;
  created_by: string;
  title: string;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  decided_at: string | null;
  decided_by: string | null;
  notify_status: string;
}

/** Unavailability reads as a greyed block; appointments keep the agenda blue (MGR-10). */
export const UNAVAILABILITY_COLOR = '#6b7280';
export const APPOINTMENT_COLOR = '#3b82f6';

// ─────────────────────────────────────────────
// Availability
// ─────────────────────────────────────────────

/**
 * One row becomes one event per covered day, inclusive of both endpoints
 * (AVAIL-07). `start_time`/`end_time` may only be set on a single day, so a
 * timed row maps to exactly the hours it declares — never to the whole day.
 *
 * SPEC_PRECISION_GAP: neither spec nor design states which `start`/`end` a
 * whole-day row (both times NULL) takes once it becomes a timed calendar
 * event. '00:00'–'23:59' is the literal reading of "the whole day".
 */
export function mapAvailabilityToCalendarEvents(row: CollaboratorAvailabilityRow): CalendarEvent[] {
  const wholeDay = row.start_time === null || row.end_time === null;
  const title = row.reason && row.reason.trim() ? row.reason : 'Indisponível';

  const events: CalendarEvent[] = [];
  const first = parseDateOnly(row.start_date);
  const days = differenceInCalendarDays(parseDateOnly(row.end_date), first) + 1;

  for (let i = 0; i < days; i++) {
    events.push({
      id: `${row.id}:${format(addDays(first, i), 'yyyy-MM-dd')}`,
      date: format(addDays(first, i), 'yyyy-MM-dd'),
      start: wholeDay ? '00:00' : row.start_time as string,
      end: wholeDay ? '23:59' : row.end_time as string,
      title,
      color: UNAVAILABILITY_COLOR,
      kind: 'unavailability',
    });
  }

  return events;
}

// ─────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────

/** MGR-10: status and the read-time conflict flag travel with the event. */
export function mapAppointmentToCalendarEvent(
  row: CollaboratorAppointmentRow,
  options: { conflicted?: boolean } = {},
): CalendarEvent {
  return {
    id: row.id,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    title: row.title,
    color: APPOINTMENT_COLOR,
    kind: 'appointment',
    status: row.status,
    conflicted: options.conflicted ?? false,
    notes: row.notes,
  };
}

/**
 * Same rule the database applies in `fn_collaborator_has_conflict`
 * (20261019120100_collaborator_agenda_behavior.sql): the date windows must
 * touch, and a timed row only conflicts on its own day with a strict time
 * overlap — touching endpoints do not conflict.
 */
export function availabilityConflictsWith(
  appointment: Pick<CollaboratorAppointmentRow, 'date' | 'start_time' | 'end_time'>,
  availability: CollaboratorAvailabilityRow[],
): boolean {
  return availability.some(av => {
    if (av.start_date > appointment.date || av.end_date < appointment.date) return false;
    if (av.start_time === null || av.end_time === null) return true;
    if (av.start_date !== appointment.date) return false;
    return rangesOverlap(
      { start: appointment.start_time, end: appointment.end_time },
      { start: av.start_time, end: av.end_time },
    );
  });
}

// ─────────────────────────────────────────────
// Personal time blocks
// ─────────────────────────────────────────────

export function mapTimeBlockToCalendarEvent(block: TimeBlock): CalendarEvent {
  return {
    id: block.id,
    date: block.date,
    start: block.start_time,
    end: block.end_time,
    title: block.title,
    color: block.color ?? getTypeConf(block.type).color,
    kind: 'personal',
  };
}
