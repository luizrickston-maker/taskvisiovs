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

## Handoff

- **Feature**: none
- **Phase / Task**: none
- **Completed**: none
- **In-progress** (file:line): none
- **Next step**: none
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: none
