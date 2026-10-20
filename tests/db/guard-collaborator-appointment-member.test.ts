import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { scratchUrl } from './connection';
import { expectFailure } from './pg-helpers';

// Spec Edge Case (Manager views a collaborator's calendar):
//   "IF the selected collaborator is deactivated (`is_active = false`) between
//    selection and save, THEN the system SHALL reject the save with
//    `Este colaborador não está mais ativo.`"
//
// The selector only ever offers active `corporate_team` rows with an account,
// so the database requires exactly that on INSERT. A separate file so this
// suite never mutates the fixtures another suite inserts against.

const MANAGER_A = '11111111-1111-4111-8111-111111111101';
const COLLABORATOR_A = '11111111-1111-4111-8111-111111111103';
const TEAM_MEMBER_A = '33333333-3333-4333-8333-333333333301';
const WORKSPACE_A = '22222222-2222-4222-8222-222222222201';
/** An account with no `corporate_team` row at all. */
const ACCOUNTLESS = '11111111-1111-4111-8111-111111111106';

// Dates kept clear of every other suite, so no fixture here can collide. Not
// December: the schema suite's AVAIL-02 fixture leaves a whole-month
// unavailability for Colaborador A across 2026-12-01..2026-12-31, and an
// appointment inside it is refused by the conflict trigger.
const ACTIVE_DATE = '2027-01-12';
const DEACTIVATED_DATE = '2027-01-13';
const ACCOUNTLESS_DATE = '2027-01-14';
const UPDATE_DATE = '2027-01-15';

const SPEC_MESSAGE = 'Este colaborador não está mais ativo.';

let client: Client;

async function claims(user: string | null): Promise<void> {
  const value = user === null ? null : JSON.stringify({ sub: user, role: 'authenticated' });
  await client.query('SELECT set_config($1, $2, false)', ['request.jwt.claims', value]);
}

async function asUser(user: string): Promise<void> {
  await client.query('RESET ROLE');
  await claims(user);
  await client.query('SET ROLE authenticated');
}

async function asSuperuser(): Promise<void> {
  await client.query('RESET ROLE');
  await claims(null);
}

async function setMemberActive(active: boolean): Promise<void> {
  await asSuperuser();
  await client.query('UPDATE public.corporate_team SET is_active = $1 WHERE id = $2', [
    active,
    TEAM_MEMBER_A,
  ]);
}

async function insertAppointmentFor(member: string, date: string, title: string): Promise<void> {
  await asUser(MANAGER_A);
  await client.query(
    `INSERT INTO public.collaborator_appointments
       (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, '10:00', '11:00')`,
    [WORKSPACE_A, member, MANAGER_A, title, date],
  );
}

/** Reads back as data, so "nothing persisted" is provable rather than assumed. */
async function persistedCount(member: string, date: string): Promise<string> {
  await asSuperuser();
  const row = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.collaborator_appointments
     WHERE member_user_id = $1 AND date = $2`,
    [member, date],
  );
  return row.rows[0].count;
}

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();

  await asSuperuser();
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'collaborator.d@fixture.test')
     ON CONFLICT (id) DO NOTHING`,
    [ACCOUNTLESS],
  );
  // The active team row for Colaborador A comes from tests/db/seed.sql.
});

afterAll(async () => {
  if (!client) return;
  await asSuperuser();
  // Leave every fixture exactly as these tests found it, even if one failed.
  await client.query(
    'UPDATE public.corporate_team SET is_active = true WHERE id = $1',
    [TEAM_MEMBER_A],
  );
  await client.query(
    `DELETE FROM public.collaborator_appointments
     WHERE date = ANY($1::date[]) AND member_user_id = ANY($2::uuid[])`,
    [[ACTIVE_DATE, DEACTIVATED_DATE, ACCOUNTLESS_DATE, UPDATE_DATE], [COLLABORATOR_A, ACCOUNTLESS]],
  );
  await client.query('DELETE FROM auth.users WHERE id = $1', [ACCOUNTLESS]);
  await client?.end();
});

describe('active team member guard on INSERT', () => {
  it('accepts an appointment for an active team member', async () => {
    await setMemberActive(true);
    await insertAppointmentFor(COLLABORATOR_A, ACTIVE_DATE, 'Visita técnica');

    expect(await persistedCount(COLLABORATOR_A, ACTIVE_DATE)).toBe('1');
  });

  it('refuses the save once the member is deactivated, persisting nothing', async () => {
    await setMemberActive(false);
    try {
      await expectFailure(
        client,
        `INSERT INTO public.collaborator_appointments
           (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
         VALUES ($1, $2, $3, 'Ainda tentando', $4, '10:00', '11:00')`,
        [WORKSPACE_A, COLLABORATOR_A, MANAGER_A, DEACTIVATED_DATE],
        { code: 'P0001', messageIncludes: SPEC_MESSAGE },
      );
    } finally {
      await setMemberActive(true);
    }

    expect(await persistedCount(COLLABORATOR_A, DEACTIVATED_DATE)).toBe('0');
  });

  it('refuses a member_user_id that has no corporate_team row at all', async () => {
    await expectFailure(
      client,
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Fora do time', $4, '10:00', '11:00')`,
      [WORKSPACE_A, ACCOUNTLESS, MANAGER_A, ACCOUNTLESS_DATE],
      { code: 'P0001', messageIncludes: SPEC_MESSAGE },
    );

    expect(await persistedCount(ACCOUNTLESS, ACCOUNTLESS_DATE)).toBe('0');
  });

  it('guards INSERT only — an already created row stays editable', async () => {
    await setMemberActive(true);
    await insertAppointmentFor(COLLABORATOR_A, UPDATE_DATE, 'Título original');

    await setMemberActive(false);
    try {
      // The BEFORE UPDATE transition guard still accepts a manager edit, so a
      // member deactivated after booking can still be rebooked out or
      // cancelled (MGR-09) — this new guard never fires on UPDATE.
      await asUser(MANAGER_A);
      await client.query(
        `UPDATE public.collaborator_appointments
         SET title = 'Título corrigido'
         WHERE member_user_id = $1 AND date = $2`,
        [COLLABORATOR_A, UPDATE_DATE],
      );
    } finally {
      await setMemberActive(true);
    }

    await asSuperuser();
    const row = await client.query<{ title: string }>(
      'SELECT title FROM public.collaborator_appointments WHERE member_user_id = $1 AND date = $2',
      [COLLABORATOR_A, UPDATE_DATE],
    );
    expect(row.rows[0].title).toBe('Título corrigido');
  });
});
