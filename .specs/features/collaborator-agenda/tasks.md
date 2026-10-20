# Collaborator Agenda Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/collaborator-agenda/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. The repository shipped with **no** test runner, no test files, no `test` script and no CI workflow, so there is nothing to sample and no documented standard to conform to. The harness itself is established by T1 and T2, which makes the matrix below provisional until those tasks land.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / pure logic (`schedule`, zod schemas, message builder, mappers) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `src/**/*.test.ts`, `supabase/functions/_shared/**/*.test.ts` | `npm run test` |
| React components and hooks | unit (Testing Library + jsdom) | Every listed edge case plus the rendered states named in the ACs | `src/**/*.test.tsx` | `npm run test` |
| Edge function transport (`notify-appointment`) | unit with mocked `fetch` | Happy path + every failure row in the Error Handling table | `supabase/functions/notify-appointment/**/*.test.ts` | `npm run test` |
| Database: RLS policies, CHECK constraints, triggers, RPC | integration against a local Supabase stack | Every DB-authoritative AC: AVAIL-04, AVAIL-05, AVAIL-06, AVAIL-08, AVAIL-11, MGR-04, MGR-05, MGR-08, COLAB-02, COLAB-03, COLAB-04, COLAB-05, COLAB-09, SYNC-03 | `tests/db/*.test.ts` | `npm run test:db` |
| Migrations | integration (applies cleanly to an empty DB) | All 120 migrations apply in filename order with no skips; a failing migration exits non-zero; publication membership asserted | `supabase/migrations/*.sql` | `npm run test:db` |
| Entity / config (routes, nav arrays, `config.toml`) | none | — (build gate only) | — | build gate |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm run test` |
| Full | After tasks touching the database or edge functions | `npm run test && npm run test:db` |
| Build | After phase completion or config-only tasks | `npm run lint && npm run build && npm run test && npm run test:db` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

Nothing else can be verified until a harness exists.

```
T1 → T2
T1 → T3
```

### Phase 2: Database

Schema and behaviour, each with the tests that prove it.

```
T4 → T5
```

### Phase 3: Notification

Pure builder first, transport second.

```
T6 → T7
```

### Phase 4: Calendar Extraction

Zero behavior change to the existing personal agenda.

```
T8 → T9
```

### Phase 5: Collaborator Experience

```
T10 → T11
T10 → T13
T12 → T13
T13 → T14
```

### Phase 6: Manager Experience

```
T15 → T16
T16 → T17
```

### Phase 7: Realtime

```
T18
```

---

## Task Breakdown

### T1: Establish the Vitest harness

**What**: Install Vitest, `@testing-library/react`, `@testing-library/jest-dom` and `jsdom`; add `test` and `test:run` scripts; prove the harness executes a real assertion.
**Where**: `package.json`
**Depends on**: None
**Reuses**: the existing Vite config pipeline — Vitest reads `vite.config.ts`, so no second build config is introduced
**Requirement**: — (prerequisite; enables the gate for every later task)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run test` exits 0 and reports at least one passing assertion
- [x] `npm run test:run` runs once without watch mode (used by CI-style gates)
- [x] `jsdom` environment configured so `.test.tsx` files execute
- [x] Existing `npm run lint` and `npm run build` still pass unchanged

**Tests**: unit
**Gate**: quick

**Commit**: `chore(test): establish vitest harness`

---

### T2: Establish the database test harness

**What**: Bootstrap and runner that recreate a scratch database on the natively installed PostgreSQL 17, apply a Supabase-compatibility bootstrap, apply all 120 migrations in order, and seed two workspaces plus collaborator identities for RLS assertions.
**Where**: `tests/db/`
**Depends on**: T1
**Reuses**: existing `supabase/migrations/` ordering; `has_workspace_access()` helpers from `20260218161244_…`
**Requirement**: — (prerequisite; unlocks the DB-authoritative ACs)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/db/bootstrap.sql` creates every Supabase object the migrations need and that a vanilla install lacks: `auth.users`, `auth.uid()` implemented as `NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub'::uuid`, `auth.role()`, the `anon` / `authenticated` / `service_role` roles, the `supabase_realtime` publication, and no-op stubs for `net.http_post`, `cron.schedule`, `cron.unschedule`, `storage.buckets` and `storage.objects`
- [x] `npm run test:db` drops and recreates a **scratch** database (never a shared or production one), applies the bootstrap, applies all 120 migrations in filename order **with no skips**, seeds the fixtures, runs its assertions and exits 0 — 121 on disk now that this task added `20260101000000_backfill_products_services.sql`; the assertion compares against the directory listing, so it covers every migration present
- [x] A migration that fails to apply makes `test:db` exit non-zero — proven by temporarily breaking one on purpose and restoring it
- [x] Seed creates: workspace A (manager A), workspace B (manager B), one collaborator linked to A with `member_user_id` set, one collaborator with `member_user_id` NULL
- [x] A test can impersonate a user via `SET request.jwt.claims` and `auth.uid()` returns exactly that user — asserted directly, since every RLS test depends on this being faithful
- [x] Connection details come from a local env var only; nothing in the harness references `gvjvwirlgzrmmeekpyzh` or any hosted URL

**Tests**: integration
**Gate**: full

**Commit**: `chore(test): establish postgres database test harness`

---

### T3: Extract schedule primitives into `src/lib/schedule.ts`

**What**: Move `timeToMinutes` and `hasConflict` out of the hook into a pure module, add `parseDateOnly` and `formatDateBR`, and rewire the existing imports.
**Where**: `src/lib/schedule.ts`
**Depends on**: T1
**Reuses**: `src/hooks/useAgendaPJ.ts:12-29` (moved, not rewritten)
**Requirement**: AVAIL-01, AVAIL-02, AVAIL-03, and the Date-construction assumption in the spec

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `timeToMinutes` and `hasConflict` exported from `src/lib/schedule.ts`; `useAgendaPJ.ts` re-imports them and no longer defines them
- [x] `parseDateOnly('2026-11-05')` yields 2026-11-05 in `America/Sao_Paulo` — asserted for a UTC-3 viewer so the `CollaboratorPortal.tsx:251` class of bug cannot recur
- [x] `rangesOverlap` treats touching endpoints as non-overlapping, matching `useAgendaPJ.ts:16-24`
- [x] `formatDateBR` renders `dd/MM/yyyy`
- [x] Existing personal agenda still builds (`npm run build`)

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(agenda): extract schedule primitives to src/lib/schedule.ts`

---

### T4: Create the collaborator agenda schema

**What**: Migration adding `collaborator_availability`, `collaborator_appointments`, `appointment_notification_log`, all CHECK constraints, all RLS policies, and realtime registration.
**Where**: `supabase/migrations/20261019120000_collaborator_agenda_schema.sql`
**Depends on**: T2
**Reuses**: `has_workspace_access()` from `20260218161244_…`; the no-policy log-table pattern from `20260626180000_agenda_reminders.sql:25-26`; the idempotent realtime `DO` block from `20260617120000_realtime_react_query_tables.sql:14-46`
**Requirement**: AVAIL-04, AVAIL-05, AVAIL-06, AVAIL-08, AVAIL-11, MGR-05, MGR-08, COLAB-09, SYNC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `supabase db reset` applies the migration cleanly — **environment deviation**: `supabase` CLI needs Docker/WSL, unavailable here, so the gate is `npm run test:db`, which rebuilds the database from zero and replays every migration in filename order (the operation `db reset` performs)
- [x] All four availability CHECKs and the appointment CHECKs reject their invalid shapes, each asserted with the exact SQL error (SQLSTATE + constraint name; the server words messages in pt_BR, so the locale-independent identity is what is pinned)
- [x] A manager in workspace B receives **zero rows** for workspace A's appointments and availability (MGR-08, AVAIL-11)
- [x] A collaborator receives only their own rows (COLAB-09) — also asserted for a collaborator who is a `workspace_members` row with role `member`, the shape `create-collaborator` produces
- [x] A collaborator INSERT with `member_user_id` set to someone else is rejected by RLS (AVAIL-11)
- [x] `appointment_notification_log` has RLS enabled with no policies (service_role only)
- [x] Both new tables appear in `supabase_realtime` with `REPLICA IDENTITY FULL` (SYNC-03)
- [x] Test count: no assertion deleted from T2's seed suite (14/14 still run and pass in the same gate)

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add collaborator agenda schema and row-level security`

---

### T5: Add the conflict function and transition guard

**What**: Migration adding `fn_collaborator_has_conflict()` plus the `BEFORE INSERT` conflict trigger and the `BEFORE UPDATE` state-machine/field-rights trigger.
**Where**: `supabase/migrations/20261019120100_collaborator_agenda_behavior.sql`
**Depends on**: T4
**Reuses**: the policy vocabulary already established in T4
**Requirement**: MGR-04, COLAB-02, COLAB-03, COLAB-04, COLAB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `fn_collaborator_has_conflict` is `SECURITY INVOKER` and `STABLE` — asserted by reading `pg_proc`, so a later refactor cannot silently make it `DEFINER` (design R7)
- [x] An appointment overlapping an unavailability row is refused and **nothing is persisted** (MGR-04) — asserted for a timed row and for a whole-day row
- [x] A touching-but-not-overlapping pair is accepted (Edge Cases) — both endpoints (before 09:00, after 12:00) asserted
- [x] `pending → confirmed` and `pending → cancelled` both succeed and record `decided_at`/`decided_by` (COLAB-02, COLAB-03) — the update sends only `status`, so the database itself proves it fills both columns
- [x] Any transition out of `confirmed` or `cancelled` is refused with nothing persisted (COLAB-04)
- [x] A collaborator attempting to change `title`, `notes`, `date`, `start_time`, `end_time` or `workspace_id` is refused (COLAB-05)
- [x] A manager cannot alter `status` or `decided_*`
- [x] Test count: no assertion from T4 deleted (schema suite still 17/17, harness 14/14 in the same gate)

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add conflict detection and appointment state-machine guards`

---

### T6: Build the shared appointment message module

**What**: Pure, dependency-free TypeScript holding the message builder and range formatting, importable by both the edge function and Vitest.
**Where**: `supabase/functions/_shared/collaborator-agenda.ts`
**Depends on**: T1
**Reuses**: nothing — this module exists precisely so NOTIF-01 and NOTIF-09 are testable without Deno (AD-003)
**Requirement**: NOTIF-01, NOTIF-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `buildAppointmentMessage` emits collaborator first name, title, `dd/MM/yyyy` date, `HH:MM–HH:MM` range, observation and the deep link `https://taskvisiovs.vercel.app/colaborador/agenda`
- [x] A non-empty `notes` appears between the time range and the deep link (NOTIF-09) — asserted structurally: exactly one line separates the range line from the link line
- [x] A null or empty `notes` produces **no** observation line — the deep link follows the range line directly, for `null`, `''` and blank
- [x] The module imports nothing — no Deno APIs, nothing from `src/` — asserted against the file's own source
- [x] Vitest imports the exact file the edge function will import (same path; T7 asserts the edge function's import specifier)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(notify): add shared appointment message builder`

---

### T7: Implement the notify-appointment edge function

**What**: Edge function that reads one appointment through an RLS-honoring client, sends via agzap, records the attempt and updates `notify_status`.
**Where**: `supabase/functions/notify-appointment/index.ts`
**Depends on**: T6
**Reuses**: agzap body shape from `process-agenda-reminders/index.ts:49-57`; `_shared/collaborator-agenda.ts` from T6
**Requirement**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST { appointment_id }` sends exactly one message and marks `notify_status = 'sent'` (NOTIF-01)
- [ ] The agzap URL and token come only from `Deno.env.get` — a repo-wide grep for `VITE_` in this path returns nothing for the credential (NOTIF-05)
- [ ] Non-2xx, thrown error and a 10 s timeout each leave the appointment intact and log the attempt as `failed` / `timeout` (NOTIF-02, NOTIF-06)
- [ ] `UNIQUE(appointment_id, attempt)` plus `ON CONFLICT DO NOTHING` makes a duplicate invocation send nothing (NOTIF-04)
- [ ] Missing or non-digits `whatsapp` logs `no_whatsapp` and does not call agzap (MGR-07)
- [ ] Editing or cancelling sends nothing — no code path exists for it (NOTIF-07)
- [ ] `config.toml` is **not** modified to add this function to the `verify_jwt = false` list
- [ ] `fetch` is mocked; no test makes a real network call

**Tests**: unit
**Gate**: full

**Commit**: `feat(notify): add notify-appointment edge function`

---

### T8: Extract the calendar views with zero behavior change

**What**: Move the month/day/week views and the popover out of the 830-line component into presentational components driven by an `events` prop, then rewire the existing personal agenda to mount them unchanged.
**Where**: `src/components/agenda/views/`
**Depends on**: T3
**Reuses**: `src/components/agenda/AgendaPJ.tsx:411-830` — moved, not rewritten
**Requirement**: MGR-02, AVAIL-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `AgendaMonthView`, `AgendaDayView`, `AgendaWeekView`, `EventPopoverContent` live under `src/components/agenda/views/` and take `events` + `mode`
- [ ] They import no data hook — `useAgendaPJ` is not referenced from the views
- [ ] `AgendaPJ.tsx` mounts them and still renders the personal agenda with no user-visible change (design R1)
- [ ] Component test renders each view with a fixed event set and asserts the same DOM a pre-change snapshot produced
- [ ] `npm run build` passes and the bundle still resolves

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(agenda): extract calendar views into presentational components`

---

### T9: Add the CalendarEvent view-model and source mappers

**What**: The `CalendarEvent` type plus mappers from `time_blocks`, `collaborator_availability` and `collaborator_appointments` into it.
**Where**: `src/components/agenda/CalendarEvent.ts`
**Depends on**: T8
**Reuses**: `src/types/database.ts` row types; `src/lib/schedule.ts` from T3
**Requirement**: AVAIL-07, MGR-10, COLAB-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `CalendarEvent` matches the design's shape exactly
- [ ] Availability rows spanning several days expand into one blocked entry per covered day, each with `kind: 'unavailability'` (AVAIL-07)
- [ ] A half-day row maps to the stated `start`/`end`, not to the whole day
- [ ] Appointments map `status` and `conflicted` (MGR-10)
- [ ] A non-empty `notes` reaches the mapped event (COLAB-12)
- [ ] Every mapper uses `parseDateOnly` — no `new Date(dateString)` anywhere in the file

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agenda): add CalendarEvent view-model and source mappers`

---

### T10: Add the availability query hook

**What**: React Query CRUD for `collaborator_availability`, mirroring the existing agenda hook's shape.
**Where**: `src/hooks/useCollaboratorAvailability.ts`
**Depends on**: T4
**Reuses**: `src/hooks/useAgendaPJ.ts:31-85` as the structural template
**Requirement**: AVAIL-01, AVAIL-02, AVAIL-03, AVAIL-08, AVAIL-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Query key `collab-availability`; mutations invalidate by prefix, matching `useAgendaPJ.ts:73-80`
- [ ] Insert supports all three row shapes: single day with times, single day without times, multi-day range without times
- [ ] Delete removes the row and the cache entry
- [ ] The hook sends `workspace_id` from `get_my_workspace_id()` and `member_user_id` from the session
- [ ] Unit tests cover all five granularities producing the right row shape

**Tests**: unit
**Gate**: quick

**Commit**: `feat(colaborador): add availability query hook`

---

### T11: Build the availability form

**What**: Dialog covering all five unavailability granularities with the three AVAIL validation rules.
**Where**: `src/components/areapj/AvailabilityForm.tsx`
**Depends on**: T10
**Reuses**: `zod`, `react-hook-form`, `@hookform/resolvers` (all already in `package.json`); `TeamMemberForm.tsx` for dialog conventions
**Requirement**: AVAIL-04, AVAIL-05, AVAIL-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The three error messages appear exactly as the spec names them, before any network call
- [ ] A granularity selector produces: hour range, half day, full day, multi-day range, full month
- [ ] Submitting a valid row calls the T10 mutation once
- [ ] Unit tests drive each rejection path and assert the message text
- [ ] `end_date` earlier than `start_date` is rejected (AVAIL-04)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(colaborador): add availability form with range validation`

---

### T12: Add the appointment query hook

**What**: React Query CRUD for `collaborator_appointments`, including the RPC pre-check before insert and the confirm/cancel mutations.
**Where**: `src/hooks/useCollaboratorAppointments.ts`
**Depends on**: T4
**Reuses**: `src/hooks/useAgendaPJ.ts:31-85` as the structural template
**Requirement**: COLAB-02, COLAB-03, COLAB-04, COLAB-05, COLAB-06, COLAB-07, MGR-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Insert calls `fn_collaborator_has_conflict` via RPC before writing, and surfaces the spec's refusal message on conflict
- [ ] Confirm and cancel set `status`, `decided_at`, `decided_by` and nothing else
- [ ] Edit and cancel by the manager send no notification — the hook contains no notify call on those paths (MGR-09)
- [ ] Actions are only offered for `pending` rows; a terminal row produces no action call
- [ ] Unit tests cover: happy path, RPC refusal, terminal-state refusal, foreign-row refusal

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agenda): add appointment query hook with conflict pre-check`

---

### T13: Build the collaborator agenda page

**What**: `/colaborador/agenda` — the collaborator's calendar, the availability editor, and the confirm/cancel actions.
**Where**: `src/pages/colaborador/ColaboratorAgendaPage.tsx`
**Depends on**: T9, T10, T12
**Reuses**: extracted views from T8 in `mode='read'`; `CollaboratorPortal.tsx` section/card styling
**Requirement**: COLAB-01, COLAB-06, COLAB-07, COLAB-08, COLAB-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Renders appointments and availability from the two hooks using the T9 mappers
- [ ] A `pending` row shows both confirm and cancel; a terminal row shows neither (COLAB-06, COLAB-07)
- [ ] A non-empty `notes` is rendered with the appointment (COLAB-12)
- [ ] Confirm/cancel navigate correctly from the WhatsApp deep link with no extra login step when a session exists (COLAB-01)
- [ ] Component tests cover: empty state, pending row, confirmed row, cancelled row, notes rendering

**Tests**: unit
**Gate**: quick

**Commit**: `feat(colaborador): add collaborator agenda page`

---

### T14: Wire the agenda route, navigation and permission gate

**What**: Register `/colaborador/agenda` under `CollaboratorRoute`, add the collaborator nav entry in both nav surfaces, and gate it on the existing `agenda` permission key.
**Where**: `src/App.tsx`
**Depends on**: T13
**Reuses**: `CollaboratorRoute.tsx:15-32`; `AppSidebar.tsx:70-72`; `MobileNav.tsx:61-72`; `useCollaboratorPermissions.ts:23-27`
**Requirement**: COLAB-10, PERM-01, PERM-02, PERM-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The route is nested under `CollaboratorRoute`, mirroring `App.tsx:384-390` (design R6)
- [ ] The sidebar and mobile nav each gain an agenda entry visible only to collaborators, gated on `can('agenda')`
- [ ] `agenda` false hides the entry **and** redirects a direct URL hit to `/colaborador` (PERM-01, PERM-02)
- [ ] A missing permission row falls back to the schema default and grants access (PERM-03)
- [ ] A manager typing `/colaborador/agenda` is bounced to `/caixa`
- [ ] Component tests cover: collaborator with flag on, collaborator with flag off, manager attempting the URL

**Tests**: unit
**Gate**: full

**Commit**: `feat(colaborador): add agenda route, nav and permission gating`

---

### T15: Build the collaborator selector

**What**: Dropdown of active collaborators holding a full account, for the manager's agenda header.
**Where**: `src/components/agenda/CollaboratorSelector.tsx`
**Depends on**: T9
**Reuses**: `useAppStore` team rows already loaded by `src/hooks/useInitializeData.ts:101` — **no new query**; `TeamMemberCard.tsx` for label conventions
**Requirement**: MGR-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Lists exactly `is_active === true && member_user_id != null` (MGR-01)
- [ ] A collaborator with `member_user_id` NULL is excluded (COLAB-11)
- [ ] `null` is a valid value meaning "my own calendar"
- [ ] Unit tests assert the filter excludes deactivated and accountless members

**Tests**: unit
**Gate**: quick

**Commit**: `feat(agenda): add collaborator selector`

---

### T16: Wire the manager's agenda to the selected collaborator

**What**: `/pj/agenda` switches source on selection, pre-checks conflict, and creates appointments with the observation field.
**Where**: `src/pages/PJ/AgendaPage.tsx`
**Depends on**: T15, T9, T11
**Reuses**: extracted views from T8; `useCollaboratorAppointments` from T12; the T12 conflict pre-check
**Requirement**: MGR-02, MGR-03, MGR-04, MGR-05, MGR-09, MGR-10, MGR-11, MGR-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With no collaborator selected the page renders personal `time_blocks` exactly as today (MGR-02)
- [ ] Selecting a collaborator replaces the source with their appointments and availability, and clears the personal events (MGR-03, MGR-11)
- [ ] Creating inside declared unavailability shows `Este período está indisponível para {nome} de {início} a {fim}.` and persists nothing (MGR-04)
- [ ] A successful create persists `status = 'pending'` with the member and workspace (MGR-05)
- [ ] The observation field is present, optional, and persisted as `notes` (MGR-12)
- [ ] Unavailability blocks render visually distinct from appointments (MGR-10)
- [ ] Component tests cover: own calendar, collaborator calendar, blocked save, successful save with notes

**Tests**: unit
**Gate**: full

**Commit**: `feat(agenda): wire manager agenda to selected collaborator`

---

### T17: Send the notification and expose its status

**What**: Invoke `notify-appointment` after a successful insert, render `notify_status`, and provide the resend action.
**Where**: `src/components/agenda/AppointmentNotifier.tsx`
**Depends on**: T16, T7
**Reuses**: `supabase.functions.invoke` pattern from `src/components/ai/OperationalBrainChat.tsx:36`; `notify_status` column from T4
**Requirement**: MGR-07, NOTIF-02, NOTIF-03, NOTIF-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A successful insert invokes the function exactly once
- [ ] A null or empty `whatsapp` shows `Colaborador sem WhatsApp cadastrado — notificação não enviada.` with a resend affordance (MGR-07)
- [ ] A failed or timed-out send keeps the appointment and shows the same affordance (NOTIF-02)
- [ ] Resend writes a new attempt; the prior attempt is unchanged (NOTIF-03)
- [ ] The attempt history from `appointment_notification_log` is observable through `notify_status` (NOTIF-08)
- [ ] Component tests cover: sent, no-whatsapp, failed-then-resent

**Tests**: unit
**Gate**: full

**Commit**: `feat(agenda): send appointment notification and surface delivery status`

---

### T18: Register the new tables for realtime

**What**: Add both tables to `REALTIME_QUERY_BINDINGS` so changes propagate to open views without a reload.
**Where**: `src/lib/realtime-query-config.ts`
**Depends on**: T13, T16
**Reuses**: `src/lib/realtime-query-config.ts:48` (`time_blocks` entry proves the mechanism); publication added in T4
**Requirement**: SYNC-01, SYNC-02, SYNC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `collaborator_appointments` maps to the appointment query key and `collaborator_availability` to the availability key
- [ ] A collaborator confirming an appointment invalidates the manager's cache (SYNC-01)
- [ ] A manager creating an appointment invalidates the collaborator's cache (SYNC-02)
- [ ] Availability changes invalidate both (SYNC-04)
- [ ] Unit tests assert the bindings produce the expected invalidations for the payloads in the three cases
- [ ] No binding is added for `time_blocks` beyond the one that already exists

**Tests**: unit
**Gate**: full

**Commit**: `feat(agenda): register collaborator agenda tables for realtime`

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

Dependencies that cross a phase boundary. The intra-phase arrows are the ones already drawn in the Execution Plan above; together the two sets are the complete dependency graph.

```
T2 → T4
T1 → T6
T3 → T8
T4 → T10
T4 → T12
T9 → T13
T9 → T15
T9 → T16
T11 → T16
T7 → T17
T13 → T18
T16 → T18
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

**How phase-based execution works:**

At Execute, the agent counts total tasks and packs phases into **task-budgeted batches** (~7 tasks per worker, whole phases). The cut only ever lands on a phase boundary - a phase is never split across workers. When packing yields more than one batch (> ~8 tasks), the agent offers to dispatch batch sub-agents. Batches run sequentially: each worker executes ALL its tasks in order, then reports a compact summary before the next batch starts.

Packed batches for this feature (18 tasks, 7 phases):

| Batch | Phases | Tasks | Count |
| ----- | ------ | ----- | ----- |
| 1 | 1, 2, 3 | T1 through T7 | 7 |
| 2 | 4, 5 | T8 through T14 | 7 |
| 3 | 6, 7 | T15 through T18 | 4 |

**The orchestrating agent's role during Execute:**

1. Count total tasks and pack phases into ~7-task batches - offer batch sub-agents if that yields more than one batch and the user accepts
2. Dispatch the next batch (to a worker, or execute inline)
3. Receive the compact batch summary
4. Update tasks.md with results
5. If the batch summary shows all tasks complete: proceed to the next batch
6. If a task failed: decide fix/escalate before dispatching the next batch

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Establish the Vitest harness | 1 config surface | ✅ Granular |
| T2: Establish the local db test harness | 1 harness + seed | ✅ Granular |
| T3: Extract schedule primitives | 1 module | ✅ Granular |
| T4: Create the schema | 1 migration file | ✅ Granular |
| T5: Add conflict + transition guards | 1 migration file | ✅ Granular |
| T6: Shared message module | 1 module | ✅ Granular |
| T7: notify-appointment function | 1 endpoint | ✅ Granular |
| T8: Extract calendar views | 1 directory of presentational components | ✅ Granular (cohesive; the four views are one concept) |
| T9: CalendarEvent + mappers | 1 module | ✅ Granular |
| T10: availability hook | 1 hook | ✅ Granular |
| T11: availability form | 1 component | ✅ Granular |
| T12: appointment hook | 1 hook | ✅ Granular |
| T13: collaborator page | 1 page | ✅ Granular |
| T14: route + nav + gating | 1 route wiring (3 touch points, one concern) | ⚠️ Acceptable — the three edits are one routing concern; splitting would leave a dangling route with no nav or a nav item with no route |
| T15: selector | 1 component | ✅ Granular |
| T16: manager agenda wiring | 1 page | ✅ Granular |
| T17: notifier | 1 component | ✅ Granular |
| T18: realtime bindings | 1 config table | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on (task body) | Diagram Shows (intra-phase) | Status |
| ---- | ---------------------- | --------------------------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T2 | — (cross-phase T2→T4) | ✅ |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T1 | — (cross-phase T1→T6) | ✅ |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T3 | — (cross-phase T3→T8) | ✅ |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T4 | — (cross-phase T4→T10) | ✅ |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T4 | — (cross-phase T4→T12) | ✅ |
| T13 | T9, T10, T12 | T10 → T13, T12 → T13 | ✅ Match (T9 cross-phase) |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T9 | — (cross-phase T9→T15) | ✅ |
| T16 | T15, T9, T11 | T15 → T16 | ✅ Match (T9, T11 cross-phase) |
| T17 | T16, T7 | T16 → T17 | ✅ Match (T7 cross-phase) |
| T18 | T13, T16 | — (cross-phase) | ✅ |

No task depends on a task in a later phase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | harness (prerequisite) | unit | unit | ✅ OK |
| T2 | integration harness (prerequisite) | integration | integration | ✅ OK |
| T3 | domain / pure logic | unit | unit | ✅ OK |
| T4 | database schema | integration | integration | ✅ OK |
| T5 | database behaviour | integration | integration | ✅ OK |
| T6 | domain / pure logic | unit | unit | ✅ OK |
| T7 | edge function transport | unit (mocked fetch) | unit | ✅ OK |
| T8 | React components | unit | unit | ✅ OK |
| T9 | domain / pure logic | unit | unit | ✅ OK |
| T10 | hooks | unit | unit | ✅ OK |
| T11 | React components | unit | unit | ✅ OK |
| T12 | hooks | unit | unit | ✅ OK |
| T13 | React components | unit | unit | ✅ OK |
| T14 | React components | unit | unit | ✅ OK |
| T15 | React components | unit | unit | ✅ OK |
| T16 | React components | unit | unit | ✅ OK |
| T17 | React components | unit | unit | ✅ OK |
| T18 | config (bindings are domain logic) | unit | unit | ✅ OK |

No task defers its tests. No `Tests: none` appears.

---

## Tools and Skills

No MCP servers are configured in this repository, and no project skills other than `tlc-spec-driven` are installed. Every task above therefore lists MCP: NONE and relies on the file tools plus the gate commands. If MCP servers become available before Execute, confirm their intended use per task at that point.
