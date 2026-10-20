import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { scratchDatabase, scratchUrl } from './connection';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../supabase/migrations');

// Fixed fixture ids, mirroring tests/db/seed.sql.
const MANAGER_A = '11111111-1111-4111-8111-111111111101';
const MANAGER_B = '11111111-1111-4111-8111-111111111102';
const COLLABORATOR_A = '11111111-1111-4111-8111-111111111103';
const WORKSPACE_A = '22222222-2222-4222-8222-222222222201';
const WORKSPACE_B = '22222222-2222-4222-8222-222222222202';
const TEAM_MEMBER_WITH_ACCOUNT = '33333333-3333-4333-8333-333333333301';
const TEAM_MEMBER_WITHOUT_ACCOUNT = '33333333-3333-4333-8333-333333333302';

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: scratchUrl() });
  await client.connect();
});

afterAll(async () => {
  await client?.end();
});

async function impersonate(user: string | null): Promise<void> {
  const claims = user === null ? null : JSON.stringify({ sub: user, role: 'authenticated' });
  await client.query('SELECT set_config($1, $2, false)', ['request.jwt.claims', claims]);
}

describe('scratch database', () => {
  it('points at the local instance and the disposable database', () => {
    const url = new URL(scratchUrl());
    expect(['127.0.0.1', 'localhost', '::1']).toContain(url.hostname);
    expect(url.pathname).toBe(`/${scratchDatabase}`);
  });

  it('is created from zero on this run, not reused from a previous one', async () => {
    const runs = await client.query<{ id: string }>('SELECT id FROM harness.runs');
    expect(runs.rowCount).toBe(1);
    expect(runs.rows[0].id).toBe(process.env.DB_HARNESS_RUN_ID);
  });
});

describe('migration replay', () => {
  it('applies every migration on disk, in filename order, with no skips', async () => {
    const onDisk = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const applied = await client.query<{ seq: number; filename: string }>(
      'SELECT seq, filename FROM harness.applied_migrations ORDER BY seq'
    );

    expect(applied.rows.map((row) => row.filename)).toEqual(onDisk);
    expect(applied.rows.map((row) => row.seq)).toEqual(onDisk.map((_, index) => index + 1));
  });

  it('creates the schema objects every later task depends on', async () => {
    const objects = await client.query<Record<string, boolean>>(`
      SELECT
        to_regclass('public.workspaces') IS NOT NULL AS workspaces,
        to_regclass('public.corporate_team') IS NOT NULL AS corporate_team,
        to_regclass('public.workspace_members') IS NOT NULL AS workspace_members,
        to_regprocedure('public.has_workspace_access(uuid)') IS NOT NULL AS has_workspace_access,
        EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') AS realtime_publication
    `);
    expect(objects.rows[0]).toEqual({
      workspaces: true,
      corporate_team: true,
      workspace_members: true,
      has_workspace_access: true,
      realtime_publication: true,
    });
  });
});

describe('supabase compatibility bootstrap', () => {
  it('creates the auth schema, roles, storage, net and cron objects the migrations assume', async () => {
    const objects = await client.query<Record<string, boolean>>(`
      SELECT
        to_regclass('auth.users') IS NOT NULL AS auth_users,
        to_regprocedure('auth.uid()') IS NOT NULL AS auth_uid,
        to_regprocedure('auth.role()') IS NOT NULL AS auth_role,
        to_regclass('storage.buckets') IS NOT NULL AS storage_buckets,
        to_regclass('storage.objects') IS NOT NULL AS storage_objects,
        to_regprocedure('storage.foldername(text)') IS NOT NULL AS storage_foldername,
        to_regprocedure('net.http_post(text,jsonb,jsonb,text,text,integer)') IS NOT NULL AS net_http_post,
        to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AS cron_schedule,
        to_regprocedure('cron.unschedule(text)') IS NOT NULL AS cron_unschedule,
        to_regclass('cron.job') IS NOT NULL AS cron_job
    `);
    expect(objects.rows[0]).toEqual({
      auth_users: true,
      auth_uid: true,
      auth_role: true,
      storage_buckets: true,
      storage_objects: true,
      storage_foldername: true,
      net_http_post: true,
      cron_schedule: true,
      cron_unschedule: true,
      cron_job: true,
    });
  });

  it('defines the anon, authenticated and service_role roles the migrations grant to', async () => {
    const roles = await client.query<{ rolname: string }>(
      `SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') ORDER BY rolname`
    );
    expect(roles.rows.map((row) => row.rolname)).toEqual(['anon', 'authenticated', 'service_role']);
  });

  it('reads the role claim through auth.role()', async () => {
    await impersonate(MANAGER_A);
    const role = await client.query<{ role: string }>('SELECT auth.role() AS role');
    expect(role.rows[0].role).toBe('authenticated');
    await impersonate(null);
  });
});

describe('auth.uid() impersonation', () => {
  it('returns exactly the subject carried by request.jwt.claims', async () => {
    await impersonate(MANAGER_A);
    const first = await client.query<{ uid: string | null }>('SELECT auth.uid() AS uid');
    expect(first.rows[0].uid).toBe(MANAGER_A);

    await impersonate(MANAGER_B);
    const second = await client.query<{ uid: string | null }>('SELECT auth.uid() AS uid');
    expect(second.rows[0].uid).toBe(MANAGER_B);
  });

  it('returns null when no claims are set', async () => {
    await impersonate(null);
    const anonymous = await client.query<{ uid: string | null }>('SELECT auth.uid() AS uid');
    expect(anonymous.rows[0].uid).toBe(null);
  });
});

describe('seed fixtures', () => {
  it('creates one workspace per manager', async () => {
    const workspaces = await client.query<{ id: string; owner_user_id: string; name: string }>(
      'SELECT id::text AS id, owner_user_id::text AS owner_user_id, name FROM public.workspaces ORDER BY name'
    );
    expect(workspaces.rows).toEqual([
      { id: WORKSPACE_A, owner_user_id: MANAGER_A, name: 'Workspace A' },
      { id: WORKSPACE_B, owner_user_id: MANAGER_B, name: 'Workspace B' },
    ]);
  });

  it('registers each manager as owner of their own workspace', async () => {
    const members = await client.query<{ user_id: string; role: string }>(
      `SELECT user_id::text AS user_id, role FROM public.workspace_members ORDER BY user_id`
    );
    expect(members.rows).toEqual([
      { user_id: MANAGER_A, role: 'owner' },
      { user_id: MANAGER_B, role: 'owner' },
    ]);
  });

  it('creates one collaborator with an account and one without', async () => {
    const linked = await client.query<{ member_user_id: string; workspace_id: string; is_active: boolean }>(
      `SELECT member_user_id::text AS member_user_id, workspace_id::text AS workspace_id, is_active
       FROM public.corporate_team WHERE id = $1`,
      [TEAM_MEMBER_WITH_ACCOUNT]
    );
    expect(linked.rows).toEqual([
      { member_user_id: COLLABORATOR_A, workspace_id: WORKSPACE_A, is_active: true },
    ]);

    const unlinked = await client.query<{ member_user_id: string | null }>(
      'SELECT member_user_id::text AS member_user_id FROM public.corporate_team WHERE id = $1',
      [TEAM_MEMBER_WITHOUT_ACCOUNT]
    );
    expect(unlinked.rows).toEqual([{ member_user_id: null }]);
  });

  it('keeps both collaborators scoped to workspace A', async () => {
    const scoped = await client.query<{ workspace_id: string }>(
      `SELECT DISTINCT workspace_id::text AS workspace_id FROM public.corporate_team
       WHERE id IN ($1, $2)`,
      [TEAM_MEMBER_WITH_ACCOUNT, TEAM_MEMBER_WITHOUT_ACCOUNT]
    );
    expect(scoped.rows).toEqual([{ workspace_id: WORKSPACE_A }]);
  });
});

describe('host isolation', () => {
  it('references no hosted project id or hosted URL anywhere in the harness', () => {
    const needles = ['gvjw' + 'irlgzrmmeekpyzh', 'supabase' + '.co', 'supabase' + '.in'];
    const files = fs
      .readdirSync(here)
      .filter((file) => /\.(ts|sql)$/.test(file));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = fs.readFileSync(path.join(here, file), 'utf8');
      for (const needle of needles) {
        expect(content.includes(needle), `${file} must not reference ${needle}`).toBe(false);
      }
    }
  });
});
