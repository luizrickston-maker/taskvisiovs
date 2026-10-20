import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { maintenanceUrl, scratchDatabase, scratchUrl } from './connection';
import { ensureStubExtensions } from './extensions-setup';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../supabase/migrations');

async function applyFile(client: Client, filePath: string, label: string): Promise<void> {
  const sql = await fs.readFile(filePath, 'utf8');
  try {
    await client.query(sql);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Database harness failed applying ${label}:\n${detail}`);
  }
}

/**
 * Recreates the scratch database from zero, applies the Supabase compatibility
 * bootstrap, every migration in supabase/migrations/ in filename order, and
 * the fixtures. Any failure aborts the run with a non-zero exit.
 */
export default async function setup(): Promise<() => Promise<void>> {
  // Fail fast, before touching any database, if the pg_net/pg_cron stubs are
  // missing from the server's share directory.
  await ensureStubExtensions();

  const runId = randomUUID();
  process.env.DB_HARNESS_RUN_ID = runId;

  const maintenance = new Client({ connectionString: maintenanceUrl });
  await maintenance.connect();
  try {
    await maintenance.query(`DROP DATABASE IF EXISTS ${scratchDatabase} WITH (FORCE)`);
    await maintenance.query(`CREATE DATABASE ${scratchDatabase}`);
  } finally {
    await maintenance.end();
  }

  const client = new Client({ connectionString: scratchUrl() });
  await client.connect();
  try {
    await applyFile(client, path.join(here, 'bootstrap.sql'), 'tests/db/bootstrap.sql');

    await client.query(`
      CREATE SCHEMA IF NOT EXISTS harness;
      CREATE TABLE IF NOT EXISTS harness.runs (
        id uuid PRIMARY KEY,
        started_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS harness.applied_migrations (
        seq integer PRIMARY KEY,
        filename text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query('INSERT INTO harness.runs (id) VALUES ($1)', [runId]);

    const migrations = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let seq = 0;
    for (const file of migrations) {
      seq += 1;
      await applyFile(client, path.join(migrationsDir, file), `supabase/migrations/${file}`);
      await client.query('INSERT INTO harness.applied_migrations (seq, filename) VALUES ($1, $2)', [seq, file]);
    }

    await applyFile(client, path.join(here, 'seed.sql'), 'tests/db/seed.sql');
  } finally {
    await client.end();
  }

  return async function teardown() {
    const cleanup = new Client({ connectionString: maintenanceUrl });
    await cleanup.connect();
    try {
      await cleanup.query(`DROP DATABASE IF EXISTS ${scratchDatabase} WITH (FORCE)`);
    } finally {
      await cleanup.end();
    }
  };
}
