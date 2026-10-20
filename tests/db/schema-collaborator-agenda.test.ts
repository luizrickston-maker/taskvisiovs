import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { scratchUrl } from './connection';
import { expectFailure as expectSqlFailure } from './pg-helpers';

// Fixed fixture ids. Workspace A / manager A / collaborator A come from
// tests/db/seed.sql; the rest are created here so this file owns its rows.
const MANAGER_A = '11111111-1111-4111-8111-111111111101';
const MANAGER_B = '11111111-1111-4111-8111-111111111102';
const COLLABORATOR_A = '11111111-1111-4111-8111-111111111103';
const WORKSPACE_A = '22222222-2222-4222-8222-222222222201';
const COLLABORATOR_B = '11111111-1111-4111-8111-111111111104';

// Dates kept clear of the ones other suites use, so fixtures never collide.
const AVAILABILITY_A_DATE = '2026-11-20';
const AVAILABILITY_B_DATE = '2026-11-21';
// Appointment fixtures sit clear of the unavailability rows: once the
// BEFORE INSERT conflict trigger (T5) exists, an appointment inside declared
// unavailability is exactly the row MGR-04 says the database must refuse.
const APPOINTMENT_A_DATE = '2026-11-20';
const APPOINTMENT_B_DATE = '2026-11-22';

let client: Client;

async function claims(user: string | null): Promise<void> {
  const value = user === null ? null : JSON.stringify({ sub: user, role: 'authenticated' });
  await client.query('SELECT set_config($1, $2, false)', ['request.jwt.claims', value]);
}

/** Runs subsequent statements as `authenticated` carrying that identity. */
async function asUser(user: string): Promise<void> {
  await client.query('RESET ROLE');
  await claims(user);
  await client.query('SET ROLE authenticated');
}

async function asSuperuser(): Promise<void> {
  await client.query('RESET ROLE');
  await claims(null);
}

/** Binds this suite's connection to the shared exact-SQL-error assertion. */
async function expectFailure(
  sql: string,
  params: unknown[],
  expected: { code: string; constraint?: string; messageIncludes?: string }
): Promise<void> {
  await expectSqlFailure(client, sql, params, expected);
}

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();

  await asSuperuser();
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'collaborator.b@fixture.test')
     ON CONFLICT (id) DO NOTHING`,
    [COLLABORATOR_B]
  );
  // The real app adds collaborators to workspace_members with role 'member'
  // (supabase/functions/create-collaborator/index.ts:139,189), so the read
  // policy has to hold for a collaborator who IS a member of the workspace.
  await client.query(
    `INSERT INTO public.workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'member') ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [WORKSPACE_A, COLLABORATOR_B]
  );
  // Availability: A has a half day, B a full day.
  await client.query(
    `INSERT INTO public.collaborator_availability
       (workspace_id, member_user_id, start_date, end_date, start_time, end_time, reason)
     VALUES ($1, $2, $3, $3, '14:00', '16:00', 'Consulta médica'),
            ($1, $4, $5, $5, NULL, NULL, 'Viagem')`,
    [WORKSPACE_A, COLLABORATOR_A, AVAILABILITY_A_DATE, COLLABORATOR_B, AVAILABILITY_B_DATE]
  );
  // Appointments: one per collaborator, both pending.
  await client.query(
    `INSERT INTO public.collaborator_appointments
       (workspace_id, member_user_id, created_by, title, date, start_time, end_time, status)
     VALUES ($1, $2, $3, 'Reunião A', $4, '17:00', '18:00', 'pending'),
            ($1, $5, $3, 'Reunião B', $6, '09:00', '10:00', 'pending')`,
    [WORKSPACE_A, COLLABORATOR_A, MANAGER_A, APPOINTMENT_A_DATE, COLLABORATOR_B, APPOINTMENT_B_DATE]
  );
});

afterAll(async () => {
  await asSuperuser();
  // Leaves the shared workspace_members fixture exactly as seed.sql made it,
  // so suites running after this file still see the two owner rows only.
  await client.query('DELETE FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2', [
    WORKSPACE_A,
    COLLABORATOR_B,
  ]);
  await client?.end();
});

describe('availability CHECKs', () => {
  it('rejects end_date earlier than start_date (AVAIL-04)', async () => {
    await asUser(COLLABORATOR_A);
    await expectFailure(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date)
       VALUES ($1, $2, '2026-12-05', '2026-12-04')`,
      [WORKSPACE_A, COLLABORATOR_A],
      { code: '23514', constraint: 'collaborator_availability_dates_check' }
    );
  });

  it('rejects a time bound set without its pair (AVAIL-05/06)', async () => {
    await asUser(COLLABORATOR_A);
    await expectFailure(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date, start_time, end_time)
       VALUES ($1, $2, '2026-12-06', '2026-12-06', '09:00', NULL)`,
      [WORKSPACE_A, COLLABORATOR_A],
      { code: '23514', constraint: 'collaborator_availability_times_pair_check' }
    );
  });

  it('rejects times spanning more than one day (AVAIL-05)', async () => {
    await asUser(COLLABORATOR_A);
    await expectFailure(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date, start_time, end_time)
       VALUES ($1, $2, '2026-12-07', '2026-12-08', '09:00', '10:00')`,
      [WORKSPACE_A, COLLABORATOR_A],
      { code: '23514', constraint: 'collaborator_availability_times_single_day_check' }
    );
  });

  it('rejects an end time that is not after the start time (AVAIL-06)', async () => {
    await asUser(COLLABORATOR_A);
    await expectFailure(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date, start_time, end_time)
       VALUES ($1, $2, '2026-12-09', '2026-12-09', '14:00', '14:00')`,
      [WORKSPACE_A, COLLABORATOR_A],
      { code: '23514', constraint: 'collaborator_availability_times_order_check' }
    );
  });

  it('persists a multi-day unavailability with both times NULL (AVAIL-02, AVAIL-08)', async () => {
    await asUser(COLLABORATOR_A);
    const inserted = await client.query<{
      start_time: string | null;
      end_time: string | null;
      start_date: string;
      end_date: string;
      workspace_id: string;
      member_user_id: string;
    }>(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date)
       VALUES ($1, $2, '2026-12-01', '2026-12-31')
       RETURNING start_date::text, end_date::text, start_time, end_time,
                 workspace_id::text, member_user_id::text`,
      [WORKSPACE_A, COLLABORATOR_A]
    );
    expect(inserted.rows[0]).toEqual({
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      start_time: null,
      end_time: null,
      workspace_id: WORKSPACE_A,
      member_user_id: COLLABORATOR_A,
    });
  });

  it('persists 14:00-16:00 on 2026-11-05 as one half-day row (AVAIL-01)', async () => {
    await asUser(COLLABORATOR_A);
    const inserted = await client.query<{
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
    }>(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date, start_time, end_time)
       VALUES ($1, $2, '2026-11-05', '2026-11-05', '14:00', '16:00')
       RETURNING start_date::text, end_date::text, start_time, end_time`,
      [WORKSPACE_A, COLLABORATOR_A]
    );
    expect(inserted.rows[0]).toEqual({
      start_date: '2026-11-05',
      end_date: '2026-11-05',
      start_time: '14:00',
      end_time: '16:00',
    });
  });
});

describe('appointment CHECKs', () => {
  it('rejects an end time that is not after the start time', async () => {
    await asUser(MANAGER_A);
    await expectFailure(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Horário invertido', '2026-11-18', '14:00', '14:00')`,
      [WORKSPACE_A, COLLABORATOR_A, MANAGER_A],
      { code: '23514', constraint: 'collaborator_appointments_time_order_check' }
    );
  });

  it('rejects a status outside pending, confirmed and cancelled', async () => {
    await asUser(MANAGER_A);
    await expectFailure(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time, status)
       VALUES ($1, $2, $3, 'Status inválido', '2026-11-18', '14:00', '15:00', 'rejected')`,
      [WORKSPACE_A, COLLABORATOR_A, MANAGER_A],
      { code: '23514', constraint: 'collaborator_appointments_status_check' }
    );
  });

  it('rejects a notify_status outside the five delivery verdicts', async () => {
    await asUser(MANAGER_A);
    await expectFailure(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time, notify_status)
       VALUES ($1, $2, $3, 'Status de envio inválido', '2026-11-18', '14:00', '15:00', 'queued')`,
      [WORKSPACE_A, COLLABORATOR_A, MANAGER_A],
      { code: '23514', constraint: 'collaborator_appointments_notify_status_check' }
    );
  });

  it('persists a new appointment as pending with its member and workspace (MGR-05)', async () => {
    await asUser(MANAGER_A);
    const inserted = await client.query<{
      status: string;
      member_user_id: string;
      workspace_id: string;
      created_by: string;
    }>(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Visita técnica', '2026-11-19', '10:00', '11:00')
       RETURNING status, member_user_id::text, workspace_id::text, created_by::text`,
      [WORKSPACE_A, COLLABORATOR_A, MANAGER_A]
    );
    expect(inserted.rows[0]).toEqual({
      status: 'pending',
      member_user_id: COLLABORATOR_A,
      workspace_id: WORKSPACE_A,
      created_by: MANAGER_A,
    });
  });
});

describe('row-level security', () => {
  it('gives a manager of workspace B zero rows from workspace A (MGR-08, AVAIL-11)', async () => {
    await asUser(MANAGER_B);
    const appointments = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.collaborator_appointments'
    );
    const availability = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.collaborator_availability'
    );
    expect(appointments.rows[0].count).toBe('0');
    expect(availability.rows[0].count).toBe('0');
  });

  it('shows a collaborator only their own rows (COLAB-09)', async () => {
    await asUser(COLLABORATOR_A);
    const ownAppointments = await client.query<{ member_user_id: string }>(
      'SELECT member_user_id::text AS member_user_id FROM public.collaborator_appointments'
    );
    const ownAvailability = await client.query<{ member_user_id: string }>(
      'SELECT member_user_id::text AS member_user_id FROM public.collaborator_availability'
    );
    expect(ownAppointments.rowCount).toBeGreaterThan(0);
    expect(ownAvailability.rowCount).toBeGreaterThan(0);
    expect([...new Set(ownAppointments.rows.map((row) => row.member_user_id))]).toEqual([
      COLLABORATOR_A,
    ]);
    expect([...new Set(ownAvailability.rows.map((row) => row.member_user_id))]).toEqual([
      COLLABORATOR_A,
    ]);
  });

  it('keeps a collaborator who is a workspace member inside their own rows (COLAB-09)', async () => {
    await asUser(COLLABORATOR_B);
    const appointments = await client.query<{ member_user_id: string }>(
      'SELECT member_user_id::text AS member_user_id FROM public.collaborator_appointments'
    );
    const availability = await client.query<{ member_user_id: string }>(
      'SELECT member_user_id::text AS member_user_id FROM public.collaborator_availability'
    );
    expect(appointments.rowCount).toBeGreaterThan(0);
    expect(availability.rowCount).toBeGreaterThan(0);
    expect([...new Set(appointments.rows.map((row) => row.member_user_id))]).toEqual([
      COLLABORATOR_B,
    ]);
    expect([...new Set(availability.rows.map((row) => row.member_user_id))]).toEqual([
      COLLABORATOR_B,
    ]);
  });

  it("refuses an availability insert naming someone else's member_user_id (AVAIL-11)", async () => {
    await asUser(COLLABORATOR_A);
    await expectFailure(
      `INSERT INTO public.collaborator_availability
         (workspace_id, member_user_id, start_date, end_date)
       VALUES ($1, $2, '2026-12-12', '2026-12-12')`,
      [WORKSPACE_A, COLLABORATOR_B],
      { code: '42501', messageIncludes: 'collaborator_availability' }
    );

    await asSuperuser();
    const persisted = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.collaborator_availability
       WHERE member_user_id = $1 AND start_date = '2026-12-12'`,
      [COLLABORATOR_B]
    );
    expect(persisted.rows[0].count).toBe('0');
  });
});

describe('notification log', () => {
  it('runs with row-level security and no policy at all (service_role only)', async () => {
    await asSuperuser();
    const rls = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'appointment_notification_log'`
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);

    const policies = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'appointment_notification_log'`
    );
    expect(policies.rows[0].count).toBe('0');
  });

  it('makes a second attempt for the same appointment a unique violation (NOTIF-04)', async () => {
    await asSuperuser();
    const appointment = await client.query<{ id: string }>(
      `SELECT id FROM public.collaborator_appointments
       WHERE member_user_id = $1 ORDER BY date LIMIT 1`,
      [COLLABORATOR_A]
    );
    const appointmentId = appointment.rows[0].id;

    await client.query(
      `INSERT INTO public.appointment_notification_log (appointment_id, attempt, status)
       VALUES ($1, 1, 'sent')`,
      [appointmentId]
    );
    await expectFailure(
      `INSERT INTO public.appointment_notification_log (appointment_id, attempt, status)
       VALUES ($1, 1, 'failed')`,
      [appointmentId],
      { code: '23505', constraint: 'appointment_notification_log_appointment_id_attempt_key' }
    );

    const attempts = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.appointment_notification_log WHERE appointment_id = $1',
      [appointmentId]
    );
    expect(attempts.rows[0].count).toBe('1');
  });
});

describe('realtime registration (SYNC-03)', () => {
  it('publishes both tables with REPLICA IDENTITY FULL', async () => {
    await asSuperuser();
    const published = await client.query<{ tablename: string; relreplident: string }>(`
      SELECT c.relname AS tablename, c.relreplident::text AS relreplident
      FROM pg_publication_tables pt
      JOIN pg_class c ON c.relname = pt.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pt.pubname = 'supabase_realtime'
        AND pt.schemaname = 'public'
        AND n.nspname = pt.schemaname
        AND c.relname IN ('collaborator_availability', 'collaborator_appointments')
    `);
    expect(published.rowCount).toBe(2);
    expect(
      published.rows
        .filter((row) => row.relreplident.toUpperCase() === 'F')
        .map((row) => row.tablename)
        .sort()
    ).toEqual(['collaborator_appointments', 'collaborator_availability']);
  });
});
