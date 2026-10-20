import { rangesOverlap } from '@/lib/schedule';

// =====================================================
// Presentation contract of the extracted calendar views.
// AgendaPJ feeds these views its own `time_blocks` rows mapped to this shape;
// the collaborator agenda will feed `CalendarEvent` rows (T9), which match it
// field for field. The views never learn which table the rows came from.
// =====================================================

export interface AgendaViewEvent {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
  title: string;
  color: string | null;
  /** Personal-agenda appointment type (`reuniao`, ...). Drives the badge and legend in edit mode. */
  type?: string;
  kind: 'appointment' | 'unavailability' | 'personal';
  status?: 'pending' | 'confirmed' | 'cancelled';
  conflicted?: boolean;
  notes?: string | null;
}

// ─────────────────────────────────────────────
// Timeline geometry (moved intact from AgendaPJ.tsx)
// ─────────────────────────────────────────────

export const HOUR_HEIGHT = 56;
export const START_HOUR = 7;
export const END_HOUR = 22;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const CONTAINER_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

export const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

/** Personal appointment types (moved intact from AgendaPJ.tsx). */
export const APPOINTMENT_TYPES = [
  { value: 'reuniao',  label: 'Reunião',   color: '#3b82f6' },
  { value: 'cliente',  label: 'Cliente',   color: '#8b5cf6' },
  { value: 'projeto',  label: 'Projeto',   color: '#22c55e' },
  { value: 'tarefa',   label: 'Tarefa',    color: '#f59e0b' },
  { value: 'ligacao',  label: 'Ligação',   color: '#06b6d4' },
  { value: 'pessoal',  label: 'Pessoal',   color: '#ec4899' },
  { value: 'outros',   label: 'Outros',    color: '#6b7280' },
];

export function getTypeConf(type: string | undefined) {
  return APPOINTMENT_TYPES.find(t => t.value === type) ?? APPOINTMENT_TYPES[APPOINTMENT_TYPES.length - 1];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Groups events by `YYYY-MM-DD`, each group sorted by start time. */
export function groupEventsByDate(events: AgendaViewEvent[]): Map<string, AgendaViewEvent[]> {
  const byDate = new Map<string, AgendaViewEvent[]>();
  for (const e of events) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }
  byDate.forEach(list =>
    list.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
  );
  return byDate;
}

/**
 * Same rule the personal agenda has always applied (`hasConflict` in
 * @/lib/schedule): same date, different event, strict time overlap —
 * touching endpoints do not conflict.
 */
export function eventsConflict(a: AgendaViewEvent, b: AgendaViewEvent): boolean {
  if (a.date !== b.date) return false;
  if (a.id === b.id) return false;
  return rangesOverlap({ start: a.start, end: a.end }, { start: b.start, end: b.end });
}

export function isConflicted(event: AgendaViewEvent, all: AgendaViewEvent[]): boolean {
  return event.conflicted ?? all.some(b => eventsConflict(event, b));
}
