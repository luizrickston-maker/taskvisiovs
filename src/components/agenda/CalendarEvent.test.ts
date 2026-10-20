import { describe, expect, it } from 'vitest';
import {
  APPOINTMENT_COLOR,
  UNAVAILABILITY_COLOR,
  availabilityConflictsWith,
  mapAppointmentToCalendarEvent,
  mapAvailabilityToCalendarEvents,
  mapTimeBlockToCalendarEvent,
  type CollaboratorAppointmentRow,
  type CollaboratorAvailabilityRow,
} from './CalendarEvent';
import type { TimeBlock } from '@/types/database';

// ─────────────────────────────────────────────
// Fixtures — straight from the table shapes in
// supabase/migrations/20261019120000_collaborator_agenda_schema.sql
// ─────────────────────────────────────────────

const MEMBER = '11111111-1111-1111-1111-111111111111';
const WORKSPACE = '22222222-2222-2222-2222-222222222222';
const MANAGER = '33333333-3333-3333-3333-333333333333';

function availability(overrides: Partial<CollaboratorAvailabilityRow> = {}): CollaboratorAvailabilityRow {
  return {
    id: 'av-1',
    workspace_id: WORKSPACE,
    member_user_id: MEMBER,
    start_date: '2026-11-05',
    end_date: '2026-11-05',
    start_time: null,
    end_time: null,
    reason: null,
    ...overrides,
  };
}

function appointment(overrides: Partial<CollaboratorAppointmentRow> = {}): CollaboratorAppointmentRow {
  return {
    id: 'ap-1',
    workspace_id: WORKSPACE,
    member_user_id: MEMBER,
    created_by: MANAGER,
    title: 'Reunião com cliente',
    notes: null,
    date: '2026-11-05',
    start_time: '09:00',
    end_time: '10:00',
    status: 'pending',
    decided_at: null,
    decided_by: null,
    notify_status: 'pending',
    ...overrides,
  };
}

describe('CalendarEvent shape', () => {
  it('maps an availability row to exactly the fields the design defines', () => {
    const [event] = mapAvailabilityToCalendarEvents(availability());
    expect(Object.keys(event).sort()).toEqual([
      'color', 'date', 'end', 'id', 'kind', 'start', 'title',
    ]);
    expect(event.kind).toBe('unavailability');
    expect(event.color).toBe(UNAVAILABILITY_COLOR);
  });

  it('maps an appointment row to the design fields, carrying status, conflicted and notes', () => {
    const event = mapAppointmentToCalendarEvent(
      appointment({ status: 'confirmed', notes: 'Trazer o contrato' }),
      { conflicted: true },
    );
    expect(Object.keys(event).sort()).toEqual([
      'color', 'conflicted', 'date', 'end', 'id', 'kind', 'notes', 'start', 'status', 'title',
    ]);
    expect(event.status).toBe('confirmed');
    expect(event.conflicted).toBe(true);
    expect(event.notes).toBe('Trazer o contrato');
    expect(event.kind).toBe('appointment');
    expect(event.color).toBe(APPOINTMENT_COLOR);
  });
});

describe('mapAvailabilityToCalendarEvents (AVAIL-07)', () => {
  it('expands a multi-day row into one blocked entry per covered day', () => {
    const events = mapAvailabilityToCalendarEvents(
      availability({ start_date: '2026-11-10', end_date: '2026-11-14' }),
    );

    expect(events.map(e => e.date)).toEqual([
      '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
    ]);
    expect(events.every(e => e.kind === 'unavailability')).toBe(true);
    expect(new Set(events.map(e => e.id)).size).toBe(5);
  });

  it('keeps both endpoints of a row that spans a month boundary', () => {
    const events = mapAvailabilityToCalendarEvents(
      availability({ start_date: '2026-11-30', end_date: '2026-12-02' }),
    );
    expect(events.map(e => e.date)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
  });

  it('maps a half-day row to the hours it declares, not to the whole day', () => {
    const [event] = mapAvailabilityToCalendarEvents(
      availability({ start_time: '13:00', end_time: '18:00', reason: 'Consulta médica' }),
    );
    expect(event.start).toBe('13:00');
    expect(event.end).toBe('18:00');
    expect(event.title).toBe('Consulta médica');
  });

  it('maps a whole-day row to the full day', () => {
    const [event] = mapAvailabilityToCalendarEvents(availability());
    expect(event.start).toBe('00:00');
    expect(event.end).toBe('23:59');
  });
});

describe('availabilityConflictsWith', () => {
  const timed = availability({ start_time: '09:00', end_time: '12:00' });
  const wholeDay = availability();

  it('conflicts when the appointment sits inside declared unavailability', () => {
    expect(availabilityConflictsWith(appointment({ start_time: '09:30', end_time: '10:30' }), [timed])).toBe(true);
  });

  it('conflicts against a whole-day row on the same date', () => {
    expect(availabilityConflictsWith(appointment(), [wholeDay])).toBe(true);
  });

  it('treats touching endpoints as non-conflicting', () => {
    expect(availabilityConflictsWith(appointment({ start_time: '12:00', end_time: '13:00' }), [timed])).toBe(false);
    expect(availabilityConflictsWith(appointment({ start_time: '08:00', end_time: '09:00' }), [timed])).toBe(false);
  });

  it('ignores unavailability on other days, including other days of a multi-day row', () => {
    const range = availability({ start_date: '2026-11-10', end_date: '2026-11-14' });
    expect(availabilityConflictsWith(appointment({ date: '2026-11-15' }), [range])).toBe(false);
  });
});

describe('mapTimeBlockToCalendarEvent', () => {
  const block: TimeBlock = {
    id: 'tb-1',
    user_id: MANAGER,
    title: 'Reunião com cliente',
    date: '2026-11-05',
    start_time: '09:00',
    end_time: '10:00',
    type: 'reuniao',
    color: null,
    completed: false,
    created_at: '2026-11-05T12:00:00Z',
  };

  it('maps a personal time block with the type colour when the row has none', () => {
    const event = mapTimeBlockToCalendarEvent(block);
    expect(event).toEqual({
      id: 'tb-1',
      date: '2026-11-05',
      start: '09:00',
      end: '10:00',
      title: 'Reunião com cliente',
      color: '#3b82f6',
      kind: 'personal',
    });
  });
});

describe('date construction (spec assumption, risk R4)', () => {
  it('keeps date-only values on the same day for a UTC-3 viewer', () => {
    const events = mapAvailabilityToCalendarEvents(
      availability({ start_date: '2026-11-05', end_date: '2026-11-05' }),
    );
    expect(events[0].date).toBe('2026-11-05');
  });

  it('builds every date through parseDateOnly and never with a bare new Date(string)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), 'CalendarEvent.ts'),
      'utf-8',
    );
    expect(source).not.toContain('new Date(');
    expect(source).toContain('parseDateOnly');
  });
});
