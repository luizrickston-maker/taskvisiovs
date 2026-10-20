import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { scratchUrl } from './connection';

// ACK-01 / ACK-02 — its own world, so nothing here can collide with the
// fixtures the other suites seed or leave behind.
const MANAGER = '11111111-1111-4111-8111-11111111aa01';
const COLLABORATOR = '11111111-1111-4111-8111-11111111aa02';
const WORKSPACE = '22222222-2222-4222-8222-22222222aa01';
const TEAM_MEMBER = '33333333-3333-4333-8333-33333333aa01';

// Dates no other suite touches.
const CONFIRM_DATE = '2027-01-11';
const CANCEL_DATE = '2027-01-12';
const MANAGER_CANCEL_DATE = '2027-01-13';
const SELF_SCHEDULED_DATE = '2027-01-14';

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

/** Creates the appointment under test as the manager would. */
async function createAppointment(date: string, options: { selfScheduled?: boolean } = {}): Promise<string> {
  await asSuperuser();
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO public.collaborator_appointments
       (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
     VALUES ($1, $2, $3, 'Reunião de alinhamento', $4, '14:00', '15:00')
     RETURNING id`,
    [WORKSPACE, COLLABORATOR, options.selfScheduled ? COLLABORATOR : MANAGER, date]
  );
  return inserted.rows[0].id;
}

/** Every notification row this suite's workspace holds, read as the database. */
async function readNotifications(): Promise<Record<string, unknown>[]> {
  await asSuperuser();
  const rows = await client.query<Record<string, unknown>>(
    `SELECT user_id::text AS user_id, workspace_id::text AS workspace_id,
            title, message, link, type, read, created_at
     FROM public.notifications WHERE workspace_id = $1`,
    [WORKSPACE]
  );
  return rows.rows;
}

async function answer(id: string, status: 'confirmed' | 'cancelled', actor: string): Promise<void> {
  await asUser(actor);
  await client.query(
    `UPDATE public.collaborator_appointments SET status = $2 WHERE id = $1`,
    [id, status]
  );
}

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();

  await asSuperuser();
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'ack.manager@fixture.test'),
                                              ($2, 'ack.collaborator@fixture.test')
     ON CONFLICT (id) DO NOTHING`,
    [MANAGER, COLLABORATOR]
  );
  // Inserting the workspace fires on_workspace_created, which adds the owner
  // membership row — the manager is then a workspace admin for the policies.
  await client.query(
    `INSERT INTO public.workspaces (id, owner_user_id, name)
     VALUES ($1, $2, 'Workspace ACK') ON CONFLICT (id) DO NOTHING`,
    [WORKSPACE, MANAGER]
  );
  // A scheduling target that the member-active guard accepts.
  await client.query(
    `INSERT INTO public.corporate_team (id, user_id, name, role, workspace_id, member_user_id, is_active)
     VALUES ($1, $2, 'Colaborador ACK', 'colaborador', $3, $4, true)
     ON CONFLICT (id) DO NOTHING`,
    [TEAM_MEMBER, MANAGER, WORKSPACE, COLLABORATOR]
  );
});

afterAll(async () => {
  await asSuperuser();
  await client.query('DELETE FROM public.notifications WHERE workspace_id = $1', [WORKSPACE]);
  await client.query('DELETE FROM public.collaborator_appointments WHERE workspace_id = $1', [WORKSPACE]);
  await client.query('DELETE FROM public.corporate_team WHERE id = $1', [TEAM_MEMBER]);
  await client.query('DELETE FROM public.workspaces WHERE id = $1', [WORKSPACE]);
  await client.query('DELETE FROM auth.users WHERE id IN ($1, $2)', [MANAGER, COLLABORATOR]);
  await client?.end();
});

describe('ACK-01 — in-app notification to the creating manager', () => {
  it('writes one notification when the collaborator confirms', async () => {
    const id = await createAppointment(CONFIRM_DATE);
    await answer(id, 'confirmed', COLLABORATOR);

    const rows = await readNotifications();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.user_id).toBe(MANAGER);
    expect(row.workspace_id).toBe(WORKSPACE);
    expect(row.type).toBe('agenda');
    expect(row.link).toBe('/pj/agenda');
    expect(row.read).toBe(false);
    expect(row.created_at).not.toBe(null);
    // The wording names the decision and the appointment it is about.
    expect(row.title).toBe('Compromisso confirmado');
    expect(String(row.message)).toContain('confirmou');
    expect(String(row.message)).toContain('Reunião de alinhamento');
    expect(String(row.message)).toContain('11/01/2027');
  });

  it('writes one notification when the collaborator cancels', async () => {
    const id = await createAppointment(CANCEL_DATE);
    await answer(id, 'cancelled', COLLABORATOR);

    const rows = await readNotifications();
    // Two answers so far, two rows — one per decision.
    expect(rows).toHaveLength(2);
    const row = rows.find(candidate => String(candidate.message).includes('12/01/2027'));
    expect(row).toBeTruthy();
    expect(row!.user_id).toBe(MANAGER);
    expect(row!.type).toBe('agenda');
    expect(row!.link).toBe('/pj/agenda');
    expect(row!.read).toBe(false);
    expect(row!.created_at).not.toBe(null);
    expect(row!.title).toBe('Compromisso cancelado');
    expect(String(row!.message)).toContain('cancelou');
    expect(String(row!.message)).toContain('Reunião de alinhamento');
  });

  it('writes nothing when the manager withdraws their own scheduling (AD-007)', async () => {
    const id = await createAppointment(MANAGER_CANCEL_DATE);
    await answer(id, 'cancelled', MANAGER);

    // Still only the two notifications the collaborator's answers produced.
    const rows = await readNotifications();
    expect(rows).toHaveLength(2);
    expect(rows.some(row => String(row.message).includes('13/01/2027'))).toBe(false);
  });

  it('writes nothing when the creator answers their own appointment', async () => {
    const id = await createAppointment(SELF_SCHEDULED_DATE, { selfScheduled: true });
    await answer(id, 'confirmed', COLLABORATOR);

    const rows = await readNotifications();
    expect(rows).toHaveLength(2);
    expect(rows.some(row => String(row.message).includes('14/01/2027'))).toBe(false);
  });

  it('is reachable only by the owner: the manager reads their own row, the collaborator nothing', async () => {
    await asUser(MANAGER);
    const asManager = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.notifications`
    );
    expect(asManager.rows[0].count).toBe('2');

    await asUser(COLLABORATOR);
    const asCollaborator = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.notifications`
    );
    expect(asCollaborator.rows[0].count).toBe('0');

    await asUser(COLLABORATOR);
    // The table carries no INSERT policy at all, so a user has no path to a
    // row: it can only come from the SECURITY DEFINER trigger above.
    const insertPolicies = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'notifications' AND cmd = 'INSERT'`
    );
    expect(insertPolicies.rows[0].count).toBe('0');
  });
});
