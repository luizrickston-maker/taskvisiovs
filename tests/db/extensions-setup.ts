import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { maintenanceUrl } from './connection';

const here = path.dirname(fileURLToPath(import.meta.url));
const stubDir = path.join(here, 'extensions');

/** Supabase extensions the migrations create but vanilla PostgreSQL has no control file for. */
const STUBBED_EXTENSIONS = ['pg_net', 'pg_cron'];

function candidateIsShareDir(dir: string): boolean {
  // plpgsql ships with every PostgreSQL install, so its control file proves the path.
  return path.basename(dir) === 'extension' && fs.existsSync(path.join(dir, 'plpgsql.control'));
}

async function resolveShareDir(): Promise<string> {
  if (process.env.TEST_PG_SHAREDIR) {
    const dir = process.env.TEST_PG_SHAREDIR;
    if (!candidateIsShareDir(dir)) {
      throw new Error(`TEST_PG_SHAREDIR="${dir}" does not look like a PostgreSQL share/extension directory.`);
    }
    return dir;
  }

  const client = new Client({ connectionString: maintenanceUrl });
  await client.connect();
  try {
    const config = await client.query('SHOW config_file');
    // SHOW names the result column after the setting, so read it positionally.
    const configFile = String(Object.values(config.rows[0] as object)[0]);
    // <install>/data/postgresql.conf -> <install>/share/extension
    const installDir = path.dirname(path.dirname(configFile));
    const dir = path.join(installDir, 'share', 'extension');
    if (candidateIsShareDir(dir)) return dir;
    throw new Error(
      `Could not locate the PostgreSQL share/extension directory (derived "${dir}" from SHOW config_file). ` +
        'Set TEST_PG_SHAREDIR to it and re-run.'
    );
  } finally {
    await client.end();
  }
}

function repairMessage(shareDir: string, missing: string[]): string {
  return [
    'Database test harness cannot start: stub extensions are not installed.',
    `Missing in ${shareDir}: ${missing.map((name) => `${name}.control`).join(', ')}`,
    '',
    'Supabase ships pg_net and pg_cron; vanilla PostgreSQL does not, and the',
    'migrations run CREATE EXTENSION against both. Installing the stubs needs',
    'write access to the PostgreSQL share directory, so run this once from an',
    'elevated PowerShell:',
    '',
    `  Copy-Item "${stubDir}\\*" "${shareDir}" -Force`,
    '',
    'Then re-run: npm run test:db',
  ].join('\n');
}

/**
 * Copies the pg_net / pg_cron stub control files into PostgreSQL's share
 * directory, failing fast with the exact command when that needs elevation.
 * Never skips: a missing stub would otherwise surface three migrations later
 * as an unrelated "extension is not available" error.
 */
export async function ensureStubExtensions(): Promise<string> {
  const shareDir = await resolveShareDir();
  let missing = STUBBED_EXTENSIONS.filter(
    (name) => !fs.existsSync(path.join(shareDir, `${name}.control`))
  );
  if (missing.length > 0) {
    let copyError: unknown = null;
    try {
      for (const file of fs.readdirSync(stubDir)) {
        fs.copyFileSync(path.join(stubDir, file), path.join(shareDir, file));
      }
    } catch (error) {
      copyError = error;
    }
    missing = STUBBED_EXTENSIONS.filter(
      (name) => !fs.existsSync(path.join(shareDir, `${name}.control`))
    );
    if (missing.length > 0) {
      const reason = copyError instanceof Error ? copyError.message : '';
      throw new Error(`${repairMessage(shareDir, missing)}\n\nCopy attempt failed: ${reason}`);
    }
  }
  return shareDir;
}
