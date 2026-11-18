import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { scratchUrl } from './connection';
import { expectFailure as expectSqlFailure } from './pg-helpers';

// The suite owns every row it creates: a workspace of its own, two members of
// it (an admin and a plain member) and two clients. Nothing shared with the
// seed fixtures is touched, so file order cannot matter.
const ADMIN = '11111111-1111-4111-8111-1111111111a1';
const MEMBER = '11111111-1111-4111-8111-1111111111a2';
const RUN_USER = '11111111-1111-4111-8111-1111111111a3';
const WORKSPACE = '22222222-2222-4222-8222-2222222222a1';
const CLIENT = '44444444-4444-4444-8444-444444444441';
const OTHER_CLIENT = '44444444-4444-4444-8444-444444444442';

const CONNECTION_COLUMNS = [
  'id',
  'workspace_id',
  'frameio_account_id',
  'frameio_account_name',
  'frameio_workspace_id',
  'frameio_workspace_name',
  'access_token',
  'access_token_expires_at',
  'refresh_token',
  'requires_reconnect',
  'connected_by',
  'created_at',
  'updated_at',
];

const RUN_COLUMNS = [
  'id',
  'workspace_id',
  'client_id',
  'flow',
  'params',
  'status',
  'result',
  'error',
  'started_by',
  'started_at',
  'finished_at',
  'updated_at',
];

/** The statement `frameio-create-structure` runs before it inserts a run. */
const SWEEP_STALE_RUNS = `
  UPDATE public.frameio_runs SET status = 'failed'
   WHERE status = 'running' AND started_at < now() - interval '10 minutes'`;

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

async function expectFailure(
  sql: string,
  params: unknown[],
  expected: { code: string; constraint?: string; messageIncludes?: string }
): Promise<void> {
  await expectSqlFailure(client, sql, params, expected);
}

async function insertRun(
  clientId: string,
  extra: { status?: string; startedAt?: string; flow?: string } = {}
): Promise<void> {
  await asSuperuser();
  await client.query(
    `INSERT INTO public.frameio_runs
       (workspace_id, client_id, flow, params, status, started_by, started_at)
     VALUES ($1, $2, $3, '{}'::jsonb, $4, $5, $6)`,
    [
      WORKSPACE,
      clientId,
      extra.flow ?? 'client_structure',
      extra.status ?? 'running',
      RUN_USER,
      extra.startedAt ?? new Date().toISOString(),
    ]
  );
}

async function runningCount(clientId: string): Promise<string> {
  await asSuperuser();
  const counted = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.frameio_runs
      WHERE client_id = $1 AND status = 'running'`,
    [clientId]
  );
  return counted.rows[0].count;
}

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();

  await asSuperuser();
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES
       ($1, 'frameio.admin@fixture.test'),
       ($2, 'frameio.member@fixture.test'),
       ($3, 'frameio.runner@fixture.test')`,
    [ADMIN, MEMBER, RUN_USER]
  );
  // The on_workspace_created trigger registers ADMIN as owner of the workspace.
  await client.query(
    `INSERT INTO public.workspaces (id, owner_user_id, name)
     VALUES ($1, $2, 'Frame.io Workspace')`,
    [WORKSPACE, ADMIN]
  );
  // A plain member of the SAME workspace: the negative control for AD-006.
  // Without the is_workspace_admin gate this member would read the row.
  await client.query(
    `INSERT INTO public.workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'member')`,
    [WORKSPACE, MEMBER]
  );
  await client.query(
    `INSERT INTO public.clients (id, workspace_id, name, is_active)
     VALUES ($1, $2, 'Cliente Frameio', true),
            ($3, $2, 'Outro Cliente', true)`,
    [CLIENT, WORKSPACE, OTHER_CLIENT]
  );
  await client.query(
    `INSERT INTO public.frameio_connections
       (workspace_id, frameio_account_id, frameio_account_name,
        frameio_workspace_id, frameio_workspace_name,
        access_token, access_token_expires_at, refresh_token, connected_by)
     VALUES ($1, 'acct-100', 'Conta Chapada', 'ws-200', 'Chapada Digital',
             'access-token-value', now() + interval '1 hour', 'refresh-token-value', $2)`,
    [WORKSPACE, ADMIN]
  );
});

afterAll(async () => {
  await asSuperuser();
  // Cascades to workspace_members, clients, frameio_connections and
  // frameio_runs, leaving the seed fixtures exactly as seed.sql made them.
  await client.query('DELETE FROM public.workspaces WHERE id = $1', [WORKSPACE]);
  await client.query('DELETE FROM auth.users WHERE id IN ($1, $2, $3)', [
    ADMIN,
    MEMBER,
    RUN_USER,
  ]);
  await client?.end();
});

describe('frameio_connections and frameio_runs columns', () => {
  it('creates both tables with exactly the columns the design lists', async () => {
    await asSuperuser();
    const connections = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'frameio_connections'
        ORDER BY ordinal_position`
    );
    const runs = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'frameio_runs'
        ORDER BY ordinal_position`
    );

    expect(connections.rows.map((row) => row.column_name)).toEqual(CONNECTION_COLUMNS);
    expect(runs.rows.map((row) => row.column_name)).toEqual(RUN_COLUMNS);
  });

  it('types the credential columns as text and the expiry as timestamptz', async () => {
    await asSuperuser();
    const columns = await client.query<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('frameio_connections', 'frameio_runs')
        ORDER BY table_name, ordinal_position`
    );
    const byName = new Map(
      columns.rows.map((row) => [row.column_name, `${row.data_type}/${row.is_nullable}`])
    );

    expect(byName.get('access_token')).toBe('text/NO');
    expect(byName.get('refresh_token')).toBe('text/NO');
    expect(byName.get('access_token_expires_at')).toBe('timestamp with time zone/NO');
    expect(byName.get('requires_reconnect')).toBe('boolean/NO');
    expect(byName.get('params')).toBe('jsonb/NO');
    expect(byName.get('result')).toBe('jsonb/YES');
    expect(byName.get('flow')).toBe('text/NO');
    expect(byName.get('status')).toBe('text/NO');
    expect(byName.get('client_id')).toBe('uuid/NO');
    expect(byName.get('started_by')).toBe('uuid/NO');
    expect(byName.get('started_at')).toBe('timestamp with time zone/NO');
  });

  it('rejects a flow outside client_structure and video_project', async () => {
    await asSuperuser();
    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'rename_folder', '{}'::jsonb, $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23514', constraint: 'frameio_runs_flow_check' }
    );
  });

  it('rejects a status outside running, done and failed', async () => {
    await asSuperuser();
    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, status, started_by)
       VALUES ($1, $2, 'video_project', '{}'::jsonb, 'queued', $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23514', constraint: 'frameio_runs_status_check' }
    );
  });

  it('rejects a run that records no params and no runner', async () => {
    await asSuperuser();
    await expectFailure(
      `INSERT INTO public.frameio_runs (workspace_id, client_id, flow)
       VALUES ($1, $2, 'client_structure')`,
      [WORKSPACE, CLIENT],
      { code: '23502', messageIncludes: 'params' }
    );
    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'client_structure', '{}'::jsonb, NULL)`,
      [WORKSPACE, CLIENT],
      { code: '23502', messageIncludes: 'started_by' }
    );
  });

  it('keeps exactly one connection row per workspace (AUTH-04)', async () => {
    await asSuperuser();
    await expectFailure(
      `INSERT INTO public.frameio_connections
         (workspace_id, frameio_account_id, frameio_workspace_id, access_token,
          access_token_expires_at, refresh_token)
       VALUES ($1, 'acct-100', 'ws-200', 'other-token', now(), 'other-refresh')`,
      [WORKSPACE],
      { code: '23505', constraint: 'frameio_connections_workspace_id_key' }
    );
  });
});

describe('row-level security on the two new tables', () => {
  it('enables RLS on both tables and defines no policy on either', async () => {
    await asSuperuser();
    const flags = await client.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('frameio_connections', 'frameio_runs')`
    );
    expect(flags.rows).toHaveLength(2);
    expect(flags.rows.every((row) => row.relrowsecurity)).toBe(true);

    const policies = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_policy
        WHERE polrelid IN ('public.frameio_connections'::regclass, 'public.frameio_runs'::regclass)`
    );
    expect(policies.rows[0].count).toBe('0');
  });

  it('gives authenticated zero rows and no error from either base table', async () => {
    await asSuperuser();
    const visible = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.frameio_connections'
    );
    // The row exists: the empty read below is RLS, not an empty table.
    expect(visible.rows[0].count).toBe('1');

    await asUser(RUN_USER);
    const connections = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.frameio_connections'
    );
    const runs = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.frameio_runs'
    );
    expect(connections.rows[0].count).toBe('0');
    expect(runs.rows[0].count).toBe('0');
    await asSuperuser();
  });
});

describe('frameio_connection_status()', () => {
  it('returns the workspace admin their connection row (AUTH-07)', async () => {
    await asSuperuser();
    const stored = await client.query<{ created_at: Date }>(
      'SELECT created_at FROM public.frameio_connections WHERE workspace_id = $1',
      [WORKSPACE]
    );

    await asUser(ADMIN);
    const rows = await client.query<{
      workspace_id: string;
      frameio_workspace_name: string;
      frameio_account_name: string;
      requires_reconnect: boolean;
      connected_at: Date;
    }>(
      `SELECT workspace_id::text AS workspace_id, frameio_workspace_name,
              frameio_account_name, requires_reconnect, connected_at
         FROM public.frameio_connection_status()`
    );
    await asSuperuser();

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toEqual({
      workspace_id: WORKSPACE,
      frameio_workspace_name: 'Chapada Digital',
      frameio_account_name: 'Conta Chapada',
      requires_reconnect: false,
      connected_at: stored.rows[0].created_at,
    });
  });

  it('exposes only the five non-secret columns the design defines (AUTH-09)', async () => {
    await asSuperuser();
    const signature = await client.query<{ result: string }>(
      `SELECT pg_get_function_result('public.frameio_connection_status()'::regprocedure) AS result`
    );
    const declared = signature.rows[0].result;
    expect(declared.startsWith('TABLE(')).toBe(true);
    expect(declared).not.toMatch(/token/i);

    const names = declared
      .slice('TABLE('.length, -1)
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0]);
    expect(names).toEqual([
      'workspace_id',
      'frameio_workspace_name',
      'frameio_account_name',
      'requires_reconnect',
      'connected_at',
    ]);
  });

  it('returns an empty set for a plain member of the same workspace (AD-006)', async () => {
    await asUser(MEMBER);
    // The member's workspace IS the connected one, so only the admin gate
    // keeps this member from the row.
    const myWorkspace = await client.query<{ ws: string | null }>(
      'SELECT public.get_my_workspace_id() AS ws'
    );
    expect(myWorkspace.rows[0].ws).toBe(WORKSPACE);

    const rows = await client.query(
      'SELECT * FROM public.frameio_connection_status()'
    );
    await asSuperuser();
    expect(rows.rowCount).toBe(0);
  });

  it('reports requires_reconnect once the row is flagged (AUTH-09)', async () => {
    await asSuperuser();
    await client.query(
      'UPDATE public.frameio_connections SET requires_reconnect = true WHERE workspace_id = $1',
      [WORKSPACE]
    );

    await asUser(ADMIN);
    const rows = await client.query<{ requires_reconnect: boolean }>(
      'SELECT requires_reconnect FROM public.frameio_connection_status()'
    );
    await asSuperuser();
    await client.query(
      'UPDATE public.frameio_connections SET requires_reconnect = false WHERE workspace_id = $1',
      [WORKSPACE]
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].requires_reconnect).toBe(true);
  });

  it('is executable by authenticated and not through PUBLIC', async () => {
    await asSuperuser();
    const grants = await client.query<{ authenticated: boolean; via_public: boolean }>(
      `SELECT has_function_privilege('authenticated', 'public.frameio_connection_status()', 'EXECUTE')
                AS authenticated,
              has_function_privilege('public', 'public.frameio_connection_status()', 'EXECUTE')
                AS via_public`
    );
    expect(grants.rows[0]).toEqual({ authenticated: true, via_public: false });
  });
});

describe('one live run per client', () => {
  it('refuses a second running row for the same client (STRU-05, PROJ-11, EDGE-06)', async () => {
    await insertRun(CLIENT);
    expect(await runningCount(CLIENT)).toBe('1');

    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'client_structure', '{}'::jsonb, $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23505', constraint: 'frameio_runs_one_live_per_client' }
    );
  });

  it('allows a running row for a different client', async () => {
    await insertRun(OTHER_CLIENT);
    expect(await runningCount(OTHER_CLIENT)).toBe('1');
    // The first client's live row is untouched by the second client's insert.
    expect(await runningCount(CLIENT)).toBe('1');
    await asSuperuser();
    await client.query(`DELETE FROM public.frameio_runs WHERE client_id = $1`, [OTHER_CLIENT]);
  });

  it('allows a new run once the previous one finished', async () => {
    await asSuperuser();
    await client.query(
      `UPDATE public.frameio_runs SET status = 'done', finished_at = now()
        WHERE client_id = $1 AND status = 'running'`,
      [CLIENT]
    );
    await insertRun(CLIENT);

    const rows = await client.query<{ status: string }>(
      `SELECT status FROM public.frameio_runs WHERE client_id = $1 ORDER BY started_at`,
      [CLIENT]
    );
    expect(rows.rowCount).toBe(2);
    expect(rows.rows.map((row) => row.status).sort()).toEqual(['done', 'running']);
  });

  it('releases the mutex after the 10-minute stale sweep (EDGE-06)', async () => {
    await asSuperuser();
    // Rebuild the blocked shape: one live row, now 11 minutes old.
    await client.query('DELETE FROM public.frameio_runs WHERE client_id = $1', [CLIENT]);
    await insertRun(CLIENT, { startedAt: new Date(Date.now() - 11 * 60_000).toISOString() });

    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'client_structure', '{}'::jsonb, $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23505', constraint: 'frameio_runs_one_live_per_client' }
    );

    const swept = await client.query<{ status: string; count: string }>(
      `WITH swept AS (${SWEEP_STALE_RUNS} RETURNING status)
       SELECT status, (SELECT count(*)::text FROM swept) AS count FROM swept`
    );
    expect(swept.rowCount).toBe(1);
    expect(swept.rows[0].status).toBe('failed');
    expect(swept.rows[0].count).toBe('1');

    await insertRun(CLIENT);
    expect(await runningCount(CLIENT)).toBe('1');
    await asSuperuser();
    await client.query('DELETE FROM public.frameio_runs WHERE client_id = $1', [CLIENT]);
  });

  it('leaves a run younger than 10 minutes holding the mutex', async () => {
    await asSuperuser();
    await insertRun(CLIENT, { startedAt: new Date(Date.now() - 9 * 60_000).toISOString() });

    const swept = await client.query(SWEEP_STALE_RUNS);
    expect(swept.rowCount).toBe(0);
    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'client_structure', '{}'::jsonb, $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23505', constraint: 'frameio_runs_one_live_per_client' }
    );

    await asSuperuser();
    await client.query('DELETE FROM public.frameio_runs WHERE client_id = $1', [CLIENT]);
  });

  it('holds the mutex across both flows, because both write the same tree (PROJ-11)', async () => {
    await insertRun(CLIENT, { flow: 'video_project' });
    expect(await runningCount(CLIENT)).toBe('1');

    await expectFailure(
      `INSERT INTO public.frameio_runs
         (workspace_id, client_id, flow, params, started_by)
       VALUES ($1, $2, 'client_structure', '{}'::jsonb, $3)`,
      [WORKSPACE, CLIENT, RUN_USER],
      { code: '23505', constraint: 'frameio_runs_one_live_per_client' }
    );

    await asSuperuser();
    await client.query('DELETE FROM public.frameio_runs WHERE client_id = $1', [CLIENT]);
  });
});
