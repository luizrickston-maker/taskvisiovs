# STATE

## Decisions

### AD-001
- **Decision**: Workspace-scoped features get their own tables with a `workspace_id` column plus `has_workspace_access(workspace_id)` in RLS, rather than adding columns to the pre-workspace `public.time_blocks`.
- **Reason**: `time_blocks` predates the workspace model, has no `workspace_id`, and its RLS is still `auth.uid() = user_id`. It feeds `/caixa`, `/meu-dia`, the personal PJ agenda and the WhatsApp AI tools. Relaxing its policy to let a manager read a collaborator's rows would also let a collaborator read the manager's personal agenda.
- **Trade-off**: Duplicated calendar-shaped tables, and the existing `AgendaPJ` views must be extracted before they can be reused instead of rewritten.
- **Scope**: All future features that need calendar or per-collaborator data visible to a manager.
- **Date**: 2026-10-19
- **Status**: active

### AD-002
- **Decision**: Cross-user rules are enforced in PostgreSQL — `BEFORE INSERT`/`BEFORE UPDATE` triggers plus RLS are the authority; client-side checks exist only for immediate feedback.
- **Reason**: RLS cannot restrict columns, and a stale tab or a hand-rolled request bypasses any TypeScript-only guard. A single `BEFORE UPDATE` trigger can host both the state machine and the field-level rights that column GRANTs would otherwise have to express.
- **Trade-off**: Enforcement logic is written in two languages. Conflict detection avoids the split by living once in SQL and being called by both the client RPC and the trigger; the state machine has no such sharing and relies on tests keeping the client's UX in step.
- **Scope**: Every feature touching multi-user rows.
- **Date**: 2026-10-19
- **Status**: active

### AD-003
- **Decision**: Edge-function logic that must be unit-tested is written as pure TypeScript under `supabase/functions/_shared/` and imported from there by both the Deno function and the Vitest suite.
- **Reason**: Deno is not installed on the development machine, so edge functions cannot be executed locally. A dependency-free module gives one source of truth that Vitest can run without duplicating the logic on the client.
- **Trade-off**: Shared modules cannot use Deno-specific APIs, so any I/O has to stay in the function and out of the shared file.
- **Scope**: All Supabase Edge Functions in this repo.
- **Date**: 2026-10-19
- **Status**: active

### AD-004
- **Decision**: Vitest + `@testing-library/react` + `jsdom` is the project's test harness; no feature work starts before the harness exists and runs.
- **Reason**: The repo shipped with no test runner, no test files and no `test` script, while the development process requires a runner to decide when a task is complete. Vite and Vitest share a config pipeline, so this is the lowest-friction choice.
- **Trade-off**: Adds dev dependencies and a second config surface; jsdom cannot exercise real Postgres behaviour, so database-authoritative requirements need a separate strategy.
- **Scope**: The whole repository.
- **Date**: 2026-10-19
- **Status**: active

### AD-005
- **Decision**: Database tests run against a natively installed Windows PostgreSQL 17 with a Supabase-compatibility bootstrap, not against `supabase start` in Docker.
- **Reason**: This machine has no WSL and Docker Desktop is bound to the Linux engine, so its daemon cannot start; installing WSL needs a reboot the user has ruled out. The user asked for a free local database with no Linux emulation. The bootstrap supplies only Supabase's *auth plumbing* (`auth.uid()` reading `request.jwt.claims` exactly as Supabase does, `auth.users`, the `anon`/`authenticated`/`service_role` roles, the `supabase_realtime` publication, and no-op `net.http_post`/`cron.schedule`/`storage` stubs); everything actually under test — RLS, CHECKs, triggers, feature SQL — is unmodified PostgreSQL.
- **Trade-off**: Anything depending on Supabase's real auth server (token issuance, refresh rotation, JWT verification) is not covered here, and the stub set must be maintained if a migration introduces a new Supabase-specific object.
- **Scope**: All database testing in this repository.
- **Date**: 2026-10-19
- **Status**: active

### AD-006
- **Decision**: Where a table is shared between a manager and one or more collaborators, manager-side RLS uses `is_workspace_admin(workspace_id, auth.uid()) OR is_super_admin(auth.uid())` — never `has_workspace_access(workspace_id)` alone.
- **Reason**: `has_workspace_access` is true for any row in `workspace_members`, and `supabase/functions/create-collaborator/index.ts:139,189` inserts collaborators there with role `member`. Using it as the sole predicate would let collaborator A read collaborator B's rows, breaking the spec's absolute requirement that a collaborator sees only their own rows.
- **Trade-off**: Manager-side and collaborator-side access must be written as separate policies instead of one shared permissive predicate, so a shared-table policy set grows from 1 to 2 policies per operation.
- **Scope**: Any table carrying a `member_user_id` or otherwise holding per-collaborator rows inside a workspace.
- **Date**: 2026-10-19
- **Status**: active

### AD-007
- **Decision**: When a manager and a collaborator share write access to the same row, "accepting" and "withdrawing" are gated as distinct acts rather than treating a status column as wholly one party's.
- **Reason**: `MGR-09` and the user-confirmed assumption required the manager to cancel an appointment they created, while the spec also requires that only the collaborator may accept. The first design collapsed both into "manager may not touch `status`", which made the manager unable to withdraw their own scheduling. Separating the two — manager may set `cancelled`, never `confirmed` — satisfies both requirements, and `decided_by` becomes "whoever ended it" rather than "the collaborator".
- **Trade-off**: The state machine's allowed set is asymmetric and per-role, so a future change to the lifecycle must consider two actors rather than one, and the guard is more code than a blanket refusal.
- **Scope**: Any workflow where one party proposes and another party accepts, with a shared record.
- **Date**: 2026-10-19
- **Status**: active

### AD-008
- **Decision**: When a privileged user writes a row *on behalf of another person*, the INSERT `WITH CHECK` must constrain **who the row is about**, not only who is writing it — and where the validating table is not readable by the writer, the check runs as a `SECURITY DEFINER` function with an explicit `SET search_path`.
- **Reason**: `collaborator_appointments` originally had `WITH CHECK (is_workspace_admin(...) OR is_super_admin(...))`, which validates only the actor. That let a workspace admin write a row for **any** auth user, who would then see it in their own portal through a policy keyed on `auth.uid() = member_user_id`. An INVOKER guard was rejected because `corporate_team` is readable only by `user_id` or the member itself, so a second legitimate admin of the same workspace could not see a colleague's row and would have been refused — fail-closed in the wrong direction.
- **Trade-off**: `SECURITY DEFINER` widens what the function can read, so it needs `SET search_path` pinned and must be reachable only after `WITH CHECK` has already constrained the caller.
- **Scope**: Any table where one party creates records belonging to another.
- **Date**: 2026-10-19
- **Status**: active

### AD-009
- **Decision**: A table that stores a third-party credential is created with `ENABLE ROW LEVEL SECURITY` and **no policies at all** (only `service_role` can read it). The client learns its state through a `SECURITY DEFINER` function with an explicit `SET search_path` that returns only non-secret columns, gated on `is_workspace_admin(workspace_id, auth.uid())`. Edge functions read the credential itself exclusively from `Deno.env.get`.
- **Reason**: RLS cannot restrict columns, so any read policy on the base table puts the credential one careless `select('*')` away from the browser. `frameio_connections` is the first such table; the pattern exists partly already in `appointment_notification_log` (RLS on, no policies), which is the precedent AD-009 generalizes. It makes the spec's "secret never reaches client code" requirement structural rather than a convention someone can forget.
- **Trade-off**: Reading a non-secret fact (connected / reconnect required) costs an RPC round trip instead of a plain `select`, and every future credential table must remember to grant nothing to `authenticated`.
- **Scope**: Any table holding a third-party credential, API key or OAuth token.
- **Date**: 2026-11-18
- **Status**: active

## Handoff

- **Feature**: `collaborator-agenda` — **SHIPPED** 2026-10-21 (migrations pushed, edge function deployed, `AGZAP_URL` set, `git push` `1716a95..a654bea`, Vercel reported `success` on `a654bea`). A live-bundle check confirmed `path:"/colaborador/agenda"` and chunk `ColaboratorAgendaPage-cy4aS0Vy.js` in production. **Cancellation round closed 2026-10-25** (`3edf8ce..bc7db2e`): COLAB-13, COLAB-14, MGR-13 and ACK-02…ACK-05 implemented and marked Verified.
- **Phase / Task**: cancellation scope **SHIPPED 2026-10-25** — `supabase functions deploy notify-appointment` first, then `git push` (`f397c76..07a37ae`, 14 commits); Vercel reported `success` on `07a37ae`. Three fix→re-verify iterations; round 3 PASS (13/13 ACs, 16 mutations all killed, `validate_state` exit 0). Gates as verified by hand: `npm run test` **246 passed** · `npm run test:db` **63 passed** · `npx tsc --noEmit` exit 0. Spec now **67 ACs**, 0 errors. No migration was added in the whole round.
- **PENDING (deploy, 2026-11-18 — 3 of 4 done)**: (1) ✅ `supabase db push` applied `20261118120000_automations_frameio.sql` (migration list showed exactly one pending, no divergence). (2) ✅ `frameio-connect` (v2) and `frameio-create-structure` (v1) deployed, both ACTIVE with `verify_jwt: true`. First attempt failed because `plan.ts` imported `./names` without `.ts` — the Supabase bundler rejects extensionless relative imports (commit `cd04d53`). (3) ✅ `supabase secrets set --project-ref gvjvwirlgzrmmeekpyzh` set `FRAMEIO_CLIENT_ID`, `FRAMEIO_CLIENT_SECRET`, `FRAMEIO_REDIRECT_URI`. **The Client Secret is still the one pasted into the chat transcript — the user chose to rotate it afterwards; ROTATION IS OUTSTANDING and must happen before this credential is treated as safe.** (4) ❌ `git push` **failed: 403 Permission to luizrickston-maker/taskvisiovs.git denied to LuizRickston**. Read works (public repo) but write does not. `git config` is correct (`user.name = luizrickston-maker`, remote `https://github.com/luizrickston-maker/taskvisiovs.git`); the Windows Git Credential Manager (`credential.helper = manager`) holds a credential for the **wrong account** (`LuizRickston`). Fix is in Windows Credential Manager or a fresh `git push` prompt — do not change the remote. **23 commits local-only.**
- **Uncommitted files**: none except the untracked `.agents/`, `.claude/`, `.cursor/`, `.windsurf/` skill-install directories, deliberately never staged.
- **Branch**: `main`, **20 commits ahead of `origin/main`** (HEAD `f6c2e76`), not pushed — a `git push` needs its own go-ahead.

