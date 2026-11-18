# Automations Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/automations/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: **none** — the repo has no `AGENTS.md`, `CONTRIBUTING.md` or testing/quality doc, and no coverage threshold in `vitest.config`. Strong defaults applied.

Evidence for the commands: `package.json` scripts (`test` = `vitest run`, `test:db` = `vitest run --config tests/db/vitest.config.ts`, `build` = `vite build`, `lint` = `eslint .`), and `vite.config.ts` `test.include = ["src/**/*.test.{ts,tsx}", "supabase/functions/**/*.test.{ts,tsx}"]`. The linter is **not** a gate: the recorded baseline is 202 pre-existing problems, so `npm run lint` cannot fail a task that added none.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / pure logic (`_shared/frameio/*`, client name builder) | unit | All branches; 1:1 to spec ACs; every listed edge case | `supabase/functions/_shared/**/*.test.ts`, `src/**/*.test.ts` | `npm run test` |
| Edge functions (`frameio-connect`, `frameio-create-structure`) | unit | Every row of design's Error Handling Strategy: happy path **and** each failure path | `supabase/functions/**/*.test.ts` | `npm run test` |
| React pages / components / hooks | unit | Every state named in an AC: loading, disconnected, reconnecting, success, partial, failure, denied | `src/**/*.test.tsx` | `npm run test` |
| Database: schema, RLS, RPC, unique index | integration | Every AC enforced in the DB: no client policy, admin-only RPC, one-live-run mutex | `tests/db/*.test.ts` | `npm run test:db` |
| Route + sidebar wiring | unit | MENU-01, MENU-02, MENU-03 outcomes | `src/components/layout/AppSidebar.test.tsx`, `src/AppRoutes.test.tsx` | `npm run test` |
| Config (`config.toml`) / secrets | none | — build gate only, ending in `tests/check-bundle-secrets.mjs` which scans `dist/assets` for the marker (AUTH-05) | — | `node tests/check-bundle-secrets.mjs` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After unit-only tasks | `npm run test` |
| Full | After a task that touches the schema | `npm run test && npm run test:db` |
| Build | After phase completion | `npm run test && npm run test:db && npx tsc --noEmit && npm run build && node tests/check-bundle-secrets.mjs` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

Schema plus the pure logic everything else calls. Nothing here touches the network.

```
T1
T5
T2 → T3 → T4
```

### Phase 2: Connection

Get a Frame.io connection stored, and show its state in the UI. The arrows entering `T6` and `T8` come from Phase 1.

```
T1 → T6 → T7
T5 → T6
T1 → T8 → T9
```

### Phase 3: Creation Flows

The edge function that runs a flow, then the two forms that drive it. `T10` waits on the schema and on the shared modules from Phase 1.

```
T1 → T10
T4 → T10
T5 → T10
T11 → T12
T11 → T13
T11 → T14
```

### Phase 4: Wiring

Put the page on the menu and behind a route. The arrows entering `T15` and `T17` come from Phases 2 and 3.

```
T9 → T15
T12 → T15
T13 → T15
T14 → T15
T7 → T17
T15 → T17
T16
```

---

## Task Breakdown

### T1: Create the frameio_connections and frameio_runs schema

**What**: One migration adding `frameio_connections` (one row per workspace, holding the Frame.io account/workspace ids and both tokens), `frameio_runs` (the run log and concurrency mutex), the partial unique index `frameio_runs_one_live_per_client`, the `frameio_connection_status()` RPC, RLS enabled on both tables **with no policies**, the `update_updated_at_column()` triggers, and the grants.
**Where**: `supabase/migrations/20261118120000_automations_frameio.sql`
**Depends on**: None
**Reuses**: `appointment_notification_log` (`20261019120000_collaborator_agenda_schema.sql:66-71`) as the no-policy template · `get_my_workspace_id()` (`20260218161244_…:45-55`) as the RPC + grant template · `is_workspace_admin` (`20260218161244_…:72`)
**Requirement**: AUTH-04, AUTH-07, AUTH-09, STRU-05, PROJ-11, EDGE-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Both tables exist with the columns and CHECKs in design's Data Models
- [x] `SELECT` as `authenticated` against either base table returns zero rows and raises no error (no policy ⇒ deny)
- [x] `frameio_connection_status()` returns a row for a workspace admin and an empty set for a plain member (AD-006)
- [x] A second `INSERT ... WHERE status='running'` for the same `client_id` raises the unique violation
- [x] A row stuck in `running` for 11 minutes no longer blocks the insert
- [x] Gate check passes: `npm run test && npm run test:db`
- [x] Test count: new `tests/db/schema-automations.test.ts` passes with the pre-existing 63 DB tests intact

**Tests**: integration
**Gate**: full

**Commit**: `feat(automations): add frameio connection and run schema`

---

### T2: Build the frameio folder names

**What**: `supabase/functions/_shared/frameio/names.ts` exporting `CLIENT_FIXED_FOLDERS`, `MATERIAL_FOLDERS`, `slugPart`, `weekDayPtBR`, `buildMonthFolderName` and `buildProjectFolderName`.
**Where**: `supabase/functions/_shared/frameio/names.ts`
**Depends on**: None
**Reuses**: `date-fns` is **not** used here — weekday and month names are literal pt-BR constants, because the edge runtime's `Intl` locale data is not guaranteed (design Tech Decisions)
**Requirement**: PROJ-07, PROJ-08, PROJ-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `buildMonthFolderName('2026-11-05')` returns `2026-11-Novembro`
- [x] `buildProjectFolderName({dateISO:'2026-11-05', tipo:'Video', nomeProjeto:'Lancamento'})` returns `2026-11-05_Quinta-Video-Lancamento`
- [x] All 7 weekdays and all 12 months are covered by the test table
- [x] Each whitespace run in `tipo`/`nomeProjeto` collapses to one hyphen; accents and every other character survive (PROJ-09)
- [x] File uses no Deno-specific API, so `tsc --noEmit` accepts it when reached from `src`
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/_shared/frameio/names.test.ts` passes alongside `collaborator-agenda.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): build frameio folder names`

---

### T3: Plan folder creation idempotently

**What**: `supabase/functions/_shared/frameio/plan.ts` exporting `FolderSpec`, `ExistingChild`, `Step`, `planClientStructure()`, `planVideoProject()` and `planSteps(specs, childrenOf)` — the single function that decides create-vs-reuse.
**Where**: `supabase/functions/_shared/frameio/plan.ts`
**Depends on**: T2
**Reuses**: `CLIENT_FIXED_FOLDERS`, `MATERIAL_FOLDERS`, `buildMonthFolderName`, `buildProjectFolderName` from T2
**Requirement**: STRU-01, STRU-02, STRU-03, STRU-04, PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, EDGE-01, EDGE-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `planClientStructure()` yields `Contratos`, `Artes`, `Textos e Roteiros`, `Relatórios`, `Vídeos` under the project root, in that order
- [x] `planVideoProject()` yields `Vídeos` → month folder → project folder → `Brutos`, `Cenas de Apoio`, `Editados` (three **siblings**, confirmed by the user 2026-11-18)
- [x] `planSteps` never emits `create` for a name already present under that parent (STRU-03, PROJ-05)
- [x] Re-running against a fully-populated tree yields zero `create` steps (STRU-04, PROJ-06)
- [x] A tree missing only `Editados` yields exactly one `create` (EDGE-01)
- [x] A tree missing only the project folder under an existing month yields only that branch (EDGE-03)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/_shared/frameio/plan.test.ts` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): plan frameio folder creation idempotently`

---

### T4: Run a folder plan with throttling and honest reporting

**What**: `supabase/functions/_shared/frameio/runner.ts` exporting the `FrameioApi` interface, `RunnerOptions` and `ensureStructure()` — walks a plan, throttles, retries a 401 once, backs off on 429, and stops with `{createdSoFar, failedAt, remaining}` on the first terminal error.
**Where**: `supabase/functions/_shared/frameio/runner.ts`
**Depends on**: T3
**Reuses**: `planSteps` from T3 · injected `FrameioApi` + `delay` so the edge function supplies `fetch`/`setTimeout` and Vitest supplies fakes (AD-003)
**Requirement**: STRU-04, STRU-06, STRU-07, RETY-01, FAIL-01, PROJ-06, PROJ-12, RATE-01, PART-01, PART-02, EDGE-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Folder creations are issued one at a time with ≥350 ms between consecutive requests (STRU-06), asserted by an instrumented fake `delay`
- [x] A 401 triggers one refresh-and-retry of that call, not a second refresh (RETY-01)
- [x] A 429 waits `Retry-After` when present, 1 s when absent, up to 3 attempts, then gives up (RATE-01)
- [x] A 5xx after retries stops the run and reports `failedAt` naming the step plus `remaining` (FAIL-01, PART-01)
- [x] A failure on the very first item reports `created: []` (PART-02)
- [x] A resumed run creates only what is still missing and reports the rest as `existing` (STRU-04, PROJ-06, STRU-07)
- [x] When the API rejects a name, its reason reaches the returned error rather than being swallowed (EDGE-02)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/_shared/frameio/runner.test.ts` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): run frameio folder creation with throttling`

---

### T5: Decide when to refresh the frameio access token

**What**: `supabase/functions/_shared/frameio/tokens.ts` exporting `needsRefresh(expiresAt, skewMs, now)` (default skew 5 min) and `classifyTokenError(status, body)` → `'reconnect' | 'retryable' | 'fatal'`.
**Where**: `supabase/functions/_shared/frameio/tokens.ts`
**Depends on**: None
**Reuses**: none — pure date/shape predicates
**Requirement**: AUTH-08, AUTH-09, EDGE-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `needsRefresh` is true within 5 minutes of expiry and false well before it
- [x] It accepts an explicit `now`, so no test depends on the wall clock
- [x] `classifyTokenError` maps a rejected refresh to `'reconnect'`, a transient 401/429 to `'retryable'`, and other failures to `'fatal'`
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/_shared/frameio/tokens.test.ts` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): decide frameio token refresh`

---

### T6: Exchange the frame.io OAuth code

**What**: `supabase/functions/frameio-connect/index.ts` — validate the caller, require workspace admin, POST `grant_type=authorization_code` to `ims-na1.adobelogin.com/ims/token/v3`, resolve the first account and first workspace, upsert `frameio_connections`.
**Where**: `supabase/functions/frameio-connect/index.ts`
**Depends on**: T1, T5
**Reuses**: caller-validation block from `supabase/functions/generate-client-portal-link/index.ts:31-60` · `Deno.env.get('FRAMEIO_CLIENT_ID'|'FRAMEIO_CLIENT_SECRET'|'FRAMEIO_REDIRECT_URI')` in the style of `notify-appointment/index.ts:82-84`
**Requirement**: AUTH-03, AUTH-04, AUTH-05, EDGE-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A missing or invalid `Authorization` header is refused with 401 before any Frame.io call
- [x] A caller who is not a workspace admin is refused (AD-006 predicate)
- [x] A missing `FRAMEIO_CLIENT_SECRET` fails fast with an explicit "not configured" error, before any network call
- [x] The exchange sends exactly `grant_type`, `code`, `client_id`, `client_secret`, `redirect_uri`
- [x] Upsert keys on `workspace_id`, so a second connect replaces the first row instead of adding one (AUTH-04)
- [x] Account/workspace resolution stores the **first** of each (context.md assumption)
- [x] A test asserts `FRAMEIO_CLIENT_SECRET` appears in no file under `src/`, in no `VITE_*` variable, and in no `vite.config.ts` entry (AUTH-05)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/frameio-connect/index.test.ts` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): exchange the frameio oauth code`

---

### T7: Add the frame.io connect callback page

**What**: `src/pages/Auth/FrameioCallbackPage.tsx` — read `?code=`/`?state=`/`?error=`, validate `state` against `sessionStorage`, delete the stored entry, forward the code to `frameio-connect`, and report success or failure.
**Where**: `src/pages/Auth/FrameioCallbackPage.tsx`
**Depends on**: T6
**Reuses**: `src/pages/AuthCallback.tsx` — the `loading|success|error` state machine and the `sanitizeErrorMessage` rule (strip HTML, cap at 200 chars)
**Requirement**: AUTH-01, AUTH-02, AUTH-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A `state` that does not match the stored value aborts **before** `functions.invoke` is called, and no token is requested (AUTH-02)
- [x] A matching `state` invokes `frameio-connect` with the `code` exactly once
- [x] The `sessionStorage` entry is removed after the first read, so a replay cannot reuse it
- [x] An Adobe `error`/`error_description` is sanitised and capped at 200 characters before display
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/pages/Auth/FrameioCallbackPage.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add frameio connect callback page`

---

### T8: Read the frame.io connection status

**What**: `src/hooks/useFrameioConnection.ts` — a TanStack Query over `supabase.rpc('frameio_connection_status')` returning `{status, isLoading, error}`.
**Where**: `src/hooks/useFrameioConnection.ts`
**Depends on**: T1
**Reuses**: `supabase.rpc('get_my_workspace_id')` call shape from `src/hooks/useCollaboratorAppointments.ts:160`
**Requirement**: AUTH-06, AUTH-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] An empty RPC result maps to `status: 'disconnected'`
- [x] A row with `requires_reconnect: false` maps to `'connected'`; `true` maps to `'requires_reconnect'`
- [x] Loading and error are distinct states, not collapsed into `disconnected`
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/hooks/useFrameioConnection.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): read frameio connection status`

---

### T9: Add the frame.io connection card

**What**: `src/components/automacoes/FrameioConnectionCard.tsx` — renders the three connection states, and on "Conectar Frame.io" builds the Adobe authorize URL and redirects.
**Where**: `src/components/automacoes/FrameioConnectionCard.tsx`
**Depends on**: T8
**Reuses**: `Card`/`Button`/`Badge` from `src/components/ui`
**Requirement**: AUTH-01, AUTH-06, AUTH-07, AUTH-09, MENU-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `disconnected` shows the connect action and hides the two creation actions (AUTH-06)
- [x] `connected` shows the connected state and reveals both creation actions (AUTH-07)
- [x] `requires_reconnect` shows `Reconectar Frame.io` and hides the creation actions (AUTH-09)
- [x] The constructed URL targets `https://ims-na1.adobelogin.com/ims/authorize/v2` and carries `response_type=code`, `client_id`, `redirect_uri`, `scope=openid email profile offline_access additional_info.roles` and a fresh `state` (AUTH-01)
- [x] The `state` written to `sessionStorage` is deleted before a new one is generated, so a retry cannot reuse it
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/components/automacoes/FrameioConnectionCard.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add frameio connection card`

---

### T10: Create the frame.io folder structure

**What**: `supabase/functions/frameio-create-structure/index.ts` — validate caller, require admin, sweep stale runs, take the `frameio_runs` mutex, resolve/refresh the token, ensure the project, run the plan through a `fetch`-backed `FrameioApi`, record the outcome, return the `RunResult`.
**Where**: `supabase/functions/frameio-create-structure/index.ts`
**Depends on**: T1, T4, T5
**Reuses**: `ensureStructure` (T4) · `needsRefresh`/`classifyTokenError` (T5) · caller validation from `generate-client-portal-link/index.ts:31-60` · `planClientStructure`/`planVideoProject` (T3)
**Requirement**: STRU-01, STRU-05, PROJ-10, EDGE-04, EDGE-06, AUTH-08, AUTH-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Non-admin and unauthenticated callers are refused before any Frame.io call
- [x] Taking the mutex while another run holds it returns HTTP 409 with `Já existe uma criação em andamento para este cliente` (EDGE-06)
- [x] A token within 5 minutes of expiry is refreshed before the first Frame.io call (AUTH-08)
- [x] A rejected refresh marks `requires_reconnect` and returns a reconnect error instead of retrying forever (AUTH-09)
- [x] `flow: 'video_project'` with no project for the client returns `Crie primeiro a estrutura do cliente` **after zero writes** (PROJ-10)
- [x] `flow: 'client_structure'` matches the project by `clients.name`, so two clients with the same name share one project (EDGE-04)
- [x] The run row is closed as `done` or `failed` with `result`/`error` filled, never left `running`
- [x] The returned object's keys equal `FrameioRunResult` in `src/components/automacoes/RunResult.tsx` (type-level contract test)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `supabase/functions/frameio-create-structure/index.test.ts` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): create frameio folder structure`

---

### T11: Render a run result honestly

**What**: `src/components/automacoes/RunResult.tsx` — the `FrameioRunResult` interface plus the component that renders success, partial and failure states, including the `Tentar novamente` action.
**Where**: `src/components/automacoes/RunResult.tsx`
**Depends on**: None
**Reuses**: toast conventions from `src/hooks/useCollaboratorAppointments.ts`
**Requirement**: STRU-07, PROJ-12, FAIL-01, PART-01, PART-02, EDGE-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A run with `created` and `existing` lists both, labelling the second group as already present (STRU-07, PROJ-12)
- [x] A partial run lists what was created **and** what was not (PART-01)
- [x] A run with `created: []` states that nothing was created (PART-02)
- [x] Every failure state renders a `Tentar novamente` control that fires `onRetry` (FAIL-01)
- [x] The component's own file exports `FrameioRunResult`; a type-level test asserts it is identical to the `RunResult` exported by `_shared/frameio/runner.ts`
- [x] No success state is reachable from a `status: 'failed'` payload — asserted as a test, not by inspection
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/components/automacoes/RunResult.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): render a run result honestly`

---

### T12: Submit frame.io creation runs

**What**: `src/hooks/useFrameioCreateStructure.ts` — the mutation over `supabase.functions.invoke('frameio-create-structure')`, exposing `isPending` and the parsed `RunResult`.
**Where**: `src/hooks/useFrameioCreateStructure.ts`
**Depends on**: T11
**Reuses**: mutation shape from `src/lib/cobrancas.ts:94`
**Requirement**: STRU-05, PROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `isPending` is true from submit until the promise settles — the value the forms use to disable the control (STRU-05, PROJ-11)
- [x] A 409 mutex rejection surfaces as its own message, not as a generic failure
- [x] An invoke error and a `status:'failed'` payload are kept distinct, so a transport failure never renders as a completed run
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/hooks/useFrameioCreateStructure.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): submit frameio creation runs`

---

### T13: Add the new client structure form

**What**: `src/components/automacoes/ClientStructureForm.tsx` — client picker plus the "Criar estrutura" submit, rendering `RunResult` on completion.
**Where**: `src/components/automacoes/ClientStructureForm.tsx`
**Depends on**: T11
**Reuses**: select primitive already used across `src/pages/PJ` · `clients` query shape from `src/pages/PJ/ClientesPage.tsx:338`
**Requirement**: STRU-05, MENU-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The picker lists only `is_active` clients of the caller's workspace
- [x] The submit control is disabled while `isPending` **and** while no client is selected (STRU-05)
- [x] A completed run renders through `RunResult`, never a bare success toast
- [x] With the page's `canManage` flag false, no creation action renders (MENU-03)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/components/automacoes/ClientStructureForm.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add the new client structure form`

---

### T14: Add the video project form

**What**: `src/components/automacoes/VideoProjectForm.tsx` — client, date, type and project-name inputs, the exported `buildProjectFolderName` used for the live preview, and the submit that renders `RunResult`.
**Where**: `src/components/automacoes/VideoProjectForm.tsx`
**Depends on**: T11
**Reuses**: date input already used in the agenda forms · the name builder contract established by T2
**Requirement**: PROJ-07, PROJ-08, PROJ-09, PROJ-10, PROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] The preview shows the exact folder name that will be created, e.g. `2026-11-05_Quinta-Video-Lancamento`
- [x] A test asserts this component's `buildProjectFolderName` returns the same value as `_shared/frameio/names.ts` for a table covering all 7 weekdays, all 12 months and accented input (PROJ-07/08/09)
- [x] `Crie primeiro a estrutura do cliente` renders when the function reports a missing project, and nothing else renders as success (PROJ-10)
- [x] The submit control is disabled while `isPending` and while required fields are empty (PROJ-11)
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/components/automacoes/VideoProjectForm.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add the video project form`

---

### T15: Add the automations page

**What**: `src/pages/PJ/AutomacoesPage.tsx` — resolves the workspace admin check, loads the connection status and the client list, and composes the connection card with the two forms.
**Where**: `src/pages/PJ/AutomacoesPage.tsx`
**Depends on**: T9, T12, T13, T14
**Reuses**: page shell of `src/pages/PJ/*` · admin/role lookup used by `src/components/layout/AppSidebar.tsx:95-97`
**Requirement**: MENU-03, AUTH-06, AUTH-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] While status is loading the page shows a loading state and neither creation action (AUTH-06)
- [x] `disconnected` renders the connection card alone (AUTH-06)
- [x] `connected` renders the connection card plus both forms (AUTH-07)
- [x] A signed-in user who is not a workspace admin sees no connection or creation action (MENU-03)
- [x] The forms receive `onRun` from this page — the forms do not import the mutation hook themselves
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/pages/PJ/AutomacoesPage.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add the automations page`

---

### T16: Add the automations sidebar entry

**What**: Insert `{ title: 'Automações', url: '/pj/automacoes', icon: Zap }` into `businessNavItems`, immediately before `Ferramentas`.
**Where**: `src/components/layout/AppSidebar.tsx`
**Depends on**: None
**Reuses**: `businessNavItems` at `src/components/layout/AppSidebar.tsx:44-68` and the existing `AppSidebar.test.tsx`
**Requirement**: MENU-01, MENU-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A workspace admin's sidebar contains an entry titled `Automações` whose href is `/pj/automacoes` (MENU-01)
- [x] A user with no workspace admin role gets no `Automações` entry (MENU-02)
- [x] The collaborator navigation list is untouched
- [x] Gate check passes: `npm run test`
- [x] Test count: `src/components/layout/AppSidebar.test.tsx` grows; no existing assertion is deleted

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): add the automations sidebar entry`

---

### T17: Route the automations and callback pages

**What**: Register `/pj/automacoes` inside the guarded `/pj/*` block and `/auth/frameio/callback` beside `/auth/callback`, both in `src/App.tsx`.
**Where**: `src/App.tsx`
**Depends on**: T7, T15
**Reuses**: the guarded block at `src/App.tsx:268-375` and the sibling pair at `src/App.tsx:144-145`
**Requirement**: MENU-01, MENU-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Navigating to `/pj/automacoes` renders `AutomacoesPage` (MENU-01's target resolves)
- [x] Navigating to `/auth/frameio/callback` renders `FrameioCallbackPage`
- [x] `/pj/automacoes` sits inside the same auth guard as its `/pj/*` siblings, so an unauthenticated visit is redirected
- [x] Gate check passes: `npm run test`
- [x] Test count: new `src/AppRoutes.test.tsx` passes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(automations): route the automations and callback pages`

---

## Phase Execution Map

Phases run in sequence. **Within a phase, tasks run in numerical order**, which never contradicts a dependency arrow — every arrow points from a lower-numbered task to a higher-numbered one inside its phase, and every cross-phase arrow enters from an earlier phase. The dependency graph itself is drawn per phase in the Execution Plan above.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 · T2 · T3 · T4 · T5
Phase 2:  T6 · T7 · T8 · T9
Phase 3:  T10 · T11 · T12 · T13 · T14
Phase 4:  T15 · T16 · T17
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

**How phase-based execution works:**

At Execute, the agent counts total tasks and packs phases into **task-budgeted batches** (~7 tasks
per worker, whole phases - the benchmarked sweet spot is ~20 tasks → ~3 workers). A **phase** is the
semantic/dependency unit; a **batch** is one or more *consecutive whole phases* assigned to one
worker. The cut only ever lands on a phase boundary - a phase is never split across workers. When
packing yields more than one batch (> ~8 tasks), the agent offers to dispatch batch sub-agents.
Batches run sequentially: each worker executes ALL its tasks in order, then reports a compact summary
before the next batch starts.

**Packing for this feature — 17 tasks, 4 phases → 2 batches:**

| Batch | Phases | Tasks | Count |
| ----- | ------ | ----- | ----- |
| A | 1 + 2 | T1–T9 | 9 |
| B | 3 + 4 | T10–T17 | 8 |

Batch B starts only after Batch A reports every task complete. The Verifier runs automatically after T17.

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
| T1: one migration file + its DB suite | 1 file | ✅ Granular |
| T2–T5: one shared module each + its test | 1 file each | ✅ Granular |
| T6: one edge function + its test | 1 file | ✅ Granular |
| T7: one page + its test | 1 file | ✅ Granular |
| T8, T9, T11–T16: one hook / component / wiring each | 1 file each | ✅ Granular |
| T10: one edge function + its test | 1 file | ✅ Granular |
| T17: one route table file | 1 file | ✅ Granular |

**Granularity check**: every task names exactly one source file. No task creates two components, two functions or two endpoints. ✅ No `Where` field names more than one file, so `validate_tasks.py` reports no granularity warning.

---

## Diagram-Definition Cross-Check

Every `Depends on` in a task body has a matching arrow, and every arrow has a matching `Depends on`. `validate_tasks.py` attributes all task headers to one phase, so it applies arrow/`Depends on` parity to **cross-phase** dependencies as well — the diagrams above therefore carry the incoming arrows too.

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None | — | ✅ Match |
| T6 | T1, T5 | T1 → T6, T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T1 | T1 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T1, T4, T5 | T1 → T10, T4 → T10, T5 → T10 | ✅ Match |
| T11 | None | — | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T11 | T11 → T14 | ✅ Match |
| T15 | T9, T12, T13, T14 | T9 → T15, T12 → T15, T13 → T15, T14 → T15 | ✅ Match |
| T16 | None | — | ✅ Match |
| T17 | T7, T15 | T7 → T17, T15 → T17 | ✅ Match |

**Rules satisfied**: 19 declared dependency edges, 19 drawn arrows, no extras in either direction; every dependency points to an earlier phase or within the same one.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Database schema | integration | integration | ✅ OK |
| T2 | Domain / pure logic | unit | unit | ✅ OK |
| T3 | Domain / pure logic | unit | unit | ✅ OK |
| T4 | Domain / pure logic | unit | unit | ✅ OK |
| T5 | Domain / pure logic | unit | unit | ✅ OK |
| T6 | Edge function | unit | unit | ✅ OK |
| T7 | React page | unit | unit | ✅ OK |
| T8 | React hook | unit | unit | ✅ OK |
| T9 | React component | unit | unit | ✅ OK |
| T10 | Edge function | unit | unit | ✅ OK |
| T11 | React component | unit | unit | ✅ OK |
| T12 | React hook | unit | unit | ✅ OK |
| T13 | React component | unit | unit | ✅ OK |
| T14 | React component | unit | unit | ✅ OK |
| T15 | React page | unit | unit | ✅ OK |
| T16 | Route/sidebar wiring | unit | unit | ✅ OK |
| T17 | Route wiring | unit | unit | ✅ OK |

No task says `Tests: none`. Every task that creates a code layer with a required test type writes those tests in the same task, and no test is deferred to a later one.

---

## Post-Execution Checklist (not a task — user actions before deploy)

These are outside the code and must happen before anything reaches production:

1. Rotate the Adobe **Client Secret** — it was pasted into a chat transcript and must be treated as exposed.
2. `supabase secrets set FRAMEIO_CLIENT_ID=… FRAMEIO_CLIENT_SECRET=… FRAMEIO_REDIRECT_URI=https://taskvisiovs.vercel.app/auth/frameio/callback`
3. Deploy in the order the cancellation round established: **functions before front**, then `git push`.
4. Each of 1–3 needs its own explicit go-ahead; approving these tasks authorises local work and local commits only.
