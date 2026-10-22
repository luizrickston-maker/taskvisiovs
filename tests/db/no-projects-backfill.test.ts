import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// PRC-05 — "The system SHALL NOT modify any `projects` row that exists before
// this change", checked through the Success Criterion behind it: "No
// pre-existing row is modified — verified by asserting the migration set
// contains no `UPDATE` against `projects`."
//
// What runs when a migration is applied is everything outside a
// dollar-quoted function body, so the SQL is stripped of comments, string
// literals and `$$ … $$` bodies before it is searched. The three RPC
// migrations do contain `UPDATE projects` — inside functions the database
// compiles but never executes on apply — and the `20260522000031` hit is a
// comment.
//
// SPEC_DEVIATION: one migration does run a top-level `UPDATE public.projects`
// when applied — `20260601162729`, the historical `workspace_id` backfill. It
// predates this feature and the user explicitly declined retroactive changes
// ("mantem os que ja existe"), so it is not mine to rewrite. The assertion is
// therefore "no top-level `UPDATE` against `projects` beyond that one file",
// plus an outright ban on any migration writing `is_corporate`.

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../supabase/migrations');

/** The one pre-existing top-level projects UPDATE, out of scope by user decision. */
const PRE_EXISTING_BACKFILL = '20260601162729_11b97031-274a-4197-914b-2e357c7266bf.sql';

/** Drops comments, string literals and dollar-quoted bodies from SQL. */
function stripSql(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      out += ' ';
      continue;
    }
    if (c === '$') {
      const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        if (end === -1) {
          i = sql.length;
          continue;
        }
        out += ' ';
        i = end + tag[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

const UPDATE_PROJECTS = /\bupdate\s+(?:only\s+)?(?:public\.)?projects\b/i;
const WRITE_IS_CORPORATE = /\bupdate\b[^;]*\bis_corporate\b/i;

const applied = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => ({ file, sql: stripSql(fs.readFileSync(path.join(migrationsDir, file), 'utf8')) }));

describe('migration set leaves pre-existing projects rows alone (PRC-05)', () => {
  it('runs no top-level UPDATE against projects beyond the pre-existing workspace_id backfill', () => {
    const offenders = applied.filter(({ sql }) => UPDATE_PROJECTS.test(sql)).map(({ file }) => file);

    expect(offenders).toEqual([PRE_EXISTING_BACKFILL]);
    // That one statement backfills workspace_id; it is not this feature's and
    // it never rewrites the corporate flag.
    expect(applied.find(({ file }) => file === PRE_EXISTING_BACKFILL)!.sql).not.toMatch(
      WRITE_IS_CORPORATE,
    );
  });

  it('never writes is_corporate from a migration', () => {
    expect(applied.filter(({ sql }) => WRITE_IS_CORPORATE.test(sql)).map(({ file }) => file)).toEqual(
      [],
    );
  });
});
