/**
 * Connection settings for the local database test harness.
 *
 * Everything here points at the natively installed PostgreSQL on this machine.
 * `TEST_DATABASE_URL` is the only override; there is no hosted fallback and no
 * reference to the production Supabase project.
 */

const LOCAL_MAINTENANCE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

/** Administrative connection: used only to drop and recreate the scratch database. */
export const maintenanceUrl = process.env.TEST_DATABASE_URL ?? LOCAL_MAINTENANCE_URL;

/** Scratch database, dropped and recreated on every run. */
export const scratchDatabase = 'taskvisiovs_scratch_test';

export function scratchUrl(): string {
  const url = new URL(maintenanceUrl);
  url.pathname = `/${scratchDatabase}`;
  return url.toString();
}
