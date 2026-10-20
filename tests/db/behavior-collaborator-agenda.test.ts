import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { scratchUrl } from './connection';
import { expectFailure } from './pg-helpers';

const MANAGER_A = '11111111-1111-4111-8111-111111111101';
const COLLABORATOR_C = '11111111-1111-4111-8111-111111111105';
const WORKSPACE_A = '22222222-2222-4222-8222-222222222201';
const WORKSPACE_B = '22222222-2222-4222-8222-222222222202';
const TEAM_MEMBER_C = '33333333-3333-4333-8333-333333333303';

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

async function fail(sql: string, params: unknown[], expected: { code: string; messageIncludes?: string }): Promise<void> {
  await expectFailure(client, sql, params, expected);
}

/** Reads one appointment back as data, so "nothing persisted" is provable. */
async function readAppointment(id: string): Promise<Record<string, unknown>> {
  await asSuperuser();
  const row = await client.query<Record<string, unknown>>(
    `SELECT title, notes, date::text AS date, start_time, end_time,
            workspace_id::text AS workspace_id, status,
            decided_at, decided_by::text AS decided_by
     FROM public.collaborator_appointments WHERE id = $1`,
    [id]
  );
  expect(row.rowCount).toBe(1);
  return row.rows[0];
}

async function createAppointmentFor(
  date: string,
  startTime: string,
  endTime: string
): Promise<string> {
  await asUser(MANAGER_A);
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO public.collaborator_appointments
       (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
     VALUES ($1, $2, $3, 'Compromisso', $4, $5, $6)
     RETURNING id`,
    [WORKSPACE_A, COLLABORATOR_C, MANAGER_A, date, startTime, endTime]
  );
  return inserted.rows[0].id;
}

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();

  await asSuperuser();
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'collaborator.c@fixture.test')
     ON CONFLICT (id) DO NOTHING`,
    [COLLABORATOR_C]
  );
  await client.query(
    `INSERT INTO public.corporate_team (id, user_id, name, role, workspace_id, member_user_id, is_active)
     VALUES ($1, $2, 'Colaborador C', 'colaborador', $3, $4, true)
     ON CONFLICT (id) DO NOTHING`,
    [TEAM_MEMBER_C, MANAGER_A, WORKSPACE_A, COLLABORATOR_C]
  );
  // A declared unavailability, one timed and one whole day.
  await client.query(
    `INSERT INTO public.collaborator_availability
       (workspace_id, member_user_id, start_date, end_date, start_time, end_time, reason)
     VALUES ($1, $2, '2026-10-05', '2026-10-05', '09:00', '12:00', 'Atendimento externo'),
            ($1, $2, '2026-10-07', '2026-10-07', NULL, NULL, 'Dia inteiro')`,
    [WORKSPACE_A, COLLABORATOR_C]
  );
});

afterAll(async () => {
  await asSuperuser();
  await client?.end();
});

describe('conflict function contract (design R7)', () => {
  it('is SECURITY INVOKER and STABLE', async () => {
    await asSuperuser();
    const proc = await client.query<{ prosecdef: boolean; provolatile: string }>(
      `SELECT prosecdef, provolatile
       FROM pg_proc
       WHERE oid = 'public.fn_collaborator_has_conflict(uuid,date,date,text,text)'::regprocedure`
    );
    expect(proc.rows[0]).toEqual({ prosecdef: false, provolatile: 's' });
  });
});

describe('conflict detection (MGR-04)', () => {
  it('refuses an appointment inside declared unavailability and persists nothing (MGR-04)', async () => {
    await asUser(MANAGER_A);
    await fail(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Dentista', '2026-10-05', '10:00', '11:00')`,
      [WORKSPACE_A, COLLABORATOR_C, MANAGER_A],
      { code: '23P01', messageIncludes: 'Este período está indisponível para Colaborador C de ' }
    );

    await asSuperuser();
    const persisted = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.collaborator_appointments
       WHERE member_user_id = $1 AND date = '2026-10-05'`,
      [COLLABORATOR_C]
    );
    expect(persisted.rows[0].count).toBe('0');
  });

  it('refuses an appointment on a whole-day unavailability and persists nothing', async () => {
    await asUser(MANAGER_A);
    await fail(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Reunião no dia todo', '2026-10-07', '08:00', '09:00')`,
      [WORKSPACE_A, COLLABORATOR_C, MANAGER_A],
      { code: '23P01', messageIncludes: 'Este período está indisponível para Colaborador C de ' }
    );

    await asSuperuser();
    const persisted = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.collaborator_appointments
       WHERE member_user_id = $1 AND date = '2026-10-07'`,
      [COLLABORATOR_C]
    );
    expect(persisted.rows[0].count).toBe('0');
  });

  it('accepts a pair that only touches the unavailability at an endpoint (Edge Cases)', async () => {
    await asUser(MANAGER_A);
    // Unavailability runs 09:00-12:00 on 2026-10-05: ending at 09:00 and
    // starting at 12:00 both touch without overlapping.
    const before = await client.query<{ start_time: string; end_time: string }>(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Antes', '2026-10-05', '06:00', '09:00')
       RETURNING start_time, end_time`,
      [WORKSPACE_A, COLLABORATOR_C, MANAGER_A]
    );
    const after = await client.query<{ start_time: string; end_time: string }>(
      `INSERT INTO public.collaborator_appointments
         (workspace_id, member_user_id, created_by, title, date, start_time, end_time)
       VALUES ($1, $2, $3, 'Depois', '2026-10-05', '12:00', '13:00')
       RETURNING start_time, end_time`,
      [WORKSPACE_A, COLLABORATOR_C, MANAGER_A]
    );

    expect(before.rows[0]).toEqual({ start_time: '06:00', end_time: '09:00' });
    expect(after.rows[0]).toEqual({ start_time: '12:00', end_time: '13:00' });
  });
});

describe('appointment state machine', () => {
  it("records decided_at and decided_by on pending -> confirmed (COLAB-02)", async () => {
    const id = await createAppointmentFor('2026-10-08', '10:00', '11:00');

    await asUser(COLLABORATOR_C);
    // Only status is sent, the way a minimal client would: the database has
    // to fill decided_at/decided_by for the acceptance criterion to hold.
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'confirmed' WHERE id = $1`,
      [id]
    );

    const row = await readAppointment(id);
    expect(row.status).toBe('confirmed');
    expect(row.decided_by).toBe(COLLABORATOR_C);
    expect(row.decided_at).not.toBe(null);
  });

  it('records decided_at and decided_by on pending -> cancelled (COLAB-03)', async () => {
    const id = await createAppointmentFor('2026-10-09', '10:00', '11:00');

    await asUser(COLLABORATOR_C);
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    );

    const row = await readAppointment(id);
    expect(row.status).toBe('cancelled');
    expect(row.decided_by).toBe(COLLABORATOR_C);
    expect(row.decided_at).not.toBe(null);
  });

  it('refuses a transition out of a terminal state and persists nothing (COLAB-04)', async () => {
    const confirmed = await createAppointmentFor('2026-10-10', '10:00', '11:00');
    const cancelled = await createAppointmentFor('2026-10-11', '10:00', '11:00');

    await asUser(COLLABORATOR_C);
    await client.query(`UPDATE public.collaborator_appointments SET status = 'confirmed' WHERE id = $1`, [confirmed]);
    await client.query(`UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`, [cancelled]);

    const confirmedBefore = await readAppointment(confirmed);
    const cancelledBefore = await readAppointment(cancelled);

    await asUser(COLLABORATOR_C);
    await fail(
      `UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`,
      [confirmed],
      { code: 'P0001', messageIncludes: 'Esta solicitação já foi respondida.' }
    );
    await fail(
      `UPDATE public.collaborator_appointments SET status = 'confirmed' WHERE id = $1`,
      [cancelled],
      { code: 'P0001', messageIncludes: 'Esta solicitação já foi respondida.' }
    );

    expect(await readAppointment(confirmed)).toEqual(confirmedBefore);
    expect(await readAppointment(cancelled)).toEqual(cancelledBefore);
  });

  it("refuses every field a collaborator may not edit (COLAB-05)", async () => {
    const id = await createAppointmentFor('2026-10-12', '10:00', '11:00');
    const before = await readAppointment(id);

    await asUser(COLLABORATOR_C);
    const forbidden: Array<[column: string, literal: string]> = [
      ['title', "'Novo título'"],
      ['notes', "'Observação'"],
      ['date', "'2026-10-13'"],
      ['start_time', "'15:00'"],
      ['end_time', "'16:00'"],
      ['workspace_id', '$2'],
    ];

    for (const [column, literal] of forbidden) {
      const sql =
        column === 'workspace_id'
          ? `UPDATE public.collaborator_appointments SET workspace_id = $2 WHERE id = $1`
          : `UPDATE public.collaborator_appointments SET ${column} = ${literal} WHERE id = $1`;
      const params = column === 'workspace_id' ? [id, WORKSPACE_B] : [id];
      await fail(sql, params, { code: 'P0001', messageIncludes: 'Colaborador não pode alterar' });
    }

    expect(await readAppointment(id)).toEqual(before);
  });

  // MGR-09: o gestor cancela (pending ou confirmed) e edita o corpo do
  // compromisso. 20261019130000_collaborator_appointment_manager_cancel.sql
  // supersede a restrição anterior, que travava o status inteiro.

  it('lets the manager cancel a pending appointment, recording who decided (MGR-09)', async () => {
    const id = await createAppointmentFor('2026-10-14', '10:00', '11:00');

    await asUser(MANAGER_A);
    // Só o status é enviado, do jeito que um cliente mínimo enviaria: o
    // banco tem que preencher decided_at/decided_by do cancelamento.
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    );

    const row = await readAppointment(id);
    expect(row.status).toBe('cancelled');
    expect(row.decided_by).toBe(MANAGER_A);
    expect(row.decided_at).not.toBe(null);
  });

  it('lets the manager cancel an appointment the collaborator already confirmed', async () => {
    const id = await createAppointmentFor('2026-10-16', '10:00', '11:00');

    await asUser(COLLABORATOR_C);
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'confirmed' WHERE id = $1`,
      [id]
    );

    await asUser(MANAGER_A);
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    );

    const row = await readAppointment(id);
    expect(row.status).toBe('cancelled');
    expect(row.decided_by).toBe(MANAGER_A);
  });

  it('refuses a manager trying to confirm a pending appointment (only the collaborator accepts)', async () => {
    const id = await createAppointmentFor('2026-10-17', '10:00', '11:00');
    const before = await readAppointment(id);

    await asUser(MANAGER_A);
    await fail(
      `UPDATE public.collaborator_appointments SET status = 'confirmed' WHERE id = $1`,
      [id],
      { code: 'P0001', messageIncludes: 'O gestor só pode cancelar um compromisso, não confirmá-lo.' }
    );

    expect(await readAppointment(id)).toEqual(before);
  });

  it('refuses a manager reopening a cancelled appointment, back to pending or confirmed', async () => {
    const id = await createAppointmentFor('2026-10-18', '10:00', '11:00');

    await asUser(COLLABORATOR_C);
    await client.query(
      `UPDATE public.collaborator_appointments SET status = 'cancelled' WHERE id = $1`,
      [id]
    );
    const before = await readAppointment(id);

    await asUser(MANAGER_A);
    for (const status of ['pending', 'confirmed']) {
      await fail(
        `UPDATE public.collaborator_appointments SET status = '${status}' WHERE id = $1`,
        [id],
        { code: 'P0001', messageIncludes: 'Esta solicitação já foi respondida.' }
      );
    }

    expect(await readAppointment(id)).toEqual(before);
  });

  it('refuses decided_at/decided_by moved by the manager without a status change', async () => {
    const id = await createAppointmentFor('2026-10-19', '10:00', '11:00');
    const before = await readAppointment(id);

    await asUser(MANAGER_A);
    await fail(
      `UPDATE public.collaborator_appointments SET decided_at = now() WHERE id = $1`,
      [id],
      { code: 'P0001', messageIncludes: 'decided_at/decided_by só mudam junto com o status.' }
    );
    await fail(
      `UPDATE public.collaborator_appointments SET decided_by = $2 WHERE id = $1`,
      [id, MANAGER_A],
      { code: 'P0001', messageIncludes: 'decided_at/decided_by só mudam junto com o status.' }
    );
    // O mesmo vale para um "status sem transição": nada muda, nada grava.
    await fail(
      `UPDATE public.collaborator_appointments SET status = 'pending', decided_at = now() WHERE id = $1`,
      [id],
      { code: 'P0001', messageIncludes: 'decided_at/decided_by só mudam junto com o status.' }
    );

    expect(await readAppointment(id)).toEqual(before);
  });

  it('lets the manager edit the appointment body (the other half of the field rules)', async () => {
    const id = await createAppointmentFor('2026-10-15', '10:00', '11:00');

    await asUser(MANAGER_A);
    const updated = await client.query<{
      title: string; notes: string | null; date: string; start_time: string; end_time: string;
    }>(
      `UPDATE public.collaborator_appointments
       SET title = 'Corrigido', notes = 'Sala 2', date = '2026-10-20',
           start_time = '14:00', end_time = '15:30'
       WHERE id = $1
       RETURNING title, notes, date::text AS date, start_time, end_time`,
      [id]
    );

    expect(updated.rows[0]).toEqual({
      title: 'Corrigido',
      notes: 'Sala 2',
      date: '2026-10-20',
      start_time: '14:00',
      end_time: '15:30',
    });

    // Uma edição de campo não move a resposta.
    const row = await readAppointment(id);
    expect(row.status).toBe('pending');
    expect(row.decided_at).toBe(null);
    expect(row.decided_by).toBe(null);
  });
});
