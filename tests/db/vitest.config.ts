import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));

// Database tests run against the local PostgreSQL instance and never against
// the hosted project. Applying all migrations takes longer than the unit
// defaults, hence the generous timeouts.
export default defineConfig({
  root: path.resolve(here, '../..'),
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    globalSetup: ['tests/db/globalSetup.ts'],
    // Every file shares one scratch database, so suites must not run at the
    // same time: a fixture created in one file would break an exact-row
    // assertion in another.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 600_000,
  },
});
