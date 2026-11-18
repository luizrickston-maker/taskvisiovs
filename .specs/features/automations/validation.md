# Automations Validation

**Date**: 2026-11-18
**Spec**: `.specs/features/automations/spec.md`
**Diff range**: `3c6ef5e..HEAD` (`5c2f7e6` fix round + `f6c2e76` docs)
**Round**: 2 (re-verification of round 1's five gaps; round-1 report was written over this file)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ✅ PASS
**Result**: PASS

---

## Scope of this round

Round 1 (`6e3335e..3c6ef5e`) verified all 42 ACs and failed on 5 of them plus 2 surviving mutants. This round **re-derived only those 5 ACs** and re-ran the full gate + sensor. The other **37 ACs carried over unchanged**: no source file they depend on was touched by `3c6ef5e..HEAD` except `run.ts` (which they do not assert against), no assertion was weakened, and no test was deleted — unit count went 441 → **445** (+4 new tests), db count stayed **82**. Their round-1 `file:line` evidence stands.

| Round-1 result | ACs | Round-2 status |
| -------------- | --- | -------------- |
| ✅ PASS | 37 | carried over, unchanged evidence |
| ⚠️ PARTIAL | AUTH-05, AUTH-09, FAIL-01, EDGE-02 | re-derived below → closed |
| ❌ NOT COVERED | EDGE-05 | re-derived below → closed |

---

## Task Completion

| Task | Status  | Notes                                             |
| ---- | ------- | ------------------------------------------------- |
| T1–T17 | ✅ Done | `tasks.md` unchanged in status (115 checked, 0 unchecked); only the Build-gate row and the secrets row were updated by the fix round |

---

## The five re-checked ACs

### 1. EDGE-05 — workspace no longer exists → reconnect, not empty success

**Spec** (`spec.md:138`): *IF the connection row exists but its Frame.io workspace no longer exists THEN the system SHALL display `Reconectar Frame.io` rather than an empty success.*

| Conjunct | Spec-defined outcome | `file:line` + assertion | Result |
| -------- | -------------------- | ----------------------- | ------ |
| (a) helper wired into a production path | `workspaceStillPresent` called during a run | `supabase/functions/_shared/frameio/run.ts:16` — `import { needsRefresh, workspaceStillPresent } from './tokens.ts'`; `run.ts:173` — `if (!workspaceStillPresent(available, conn.frameio_workspace_id)) {` (the **only** production caller; `grep -rn workspaceStillPresent supabase/ src/` now returns `run.ts` + `tokens.ts` + tests) | ✅ |
| (b) outcome is 409 + reconnect message | `409` + `RECONNECT_MESSAGE` | `supabase/functions/frameio-create-structure/index.test.ts:283` — `expect(res.status).toBe(409)`; `:284` — `expect(res.body.error).toBe(RECONNECT_MESSAGE)` | ✅ |
| (c) `markReconnect` called | exactly the connection's workspace marked | `index.test.ts:285` — `expect(log.marked).toEqual(['ws-tv-1'])` | ✅ |
| (d) zero Frame.io writes | no `FrameioApi` built, no folder/project created | `index.test.ts:286-287` — `expect(log.frameioContexts).toEqual([])` + `expect(log.created).toEqual([])` | ✅ |
| (e) not reported as success | run recorded `failed`, not an empty success | `index.test.ts:288` — `expect(log.finishes[0].status).toBe('failed')` | ✅ |
| (f) UI shows `Reconectar Frame.io` | exact spec literal | `src/components/automacoes/FrameioConnectionCard.tsx:112` — `reconnecting ? 'Reconectar Frame.io' : 'Conectar Frame.io'`; pinned at `FrameioConnectionCard.test.tsx:58` — `expect(screen.getByRole('button', { name: 'Reconectar Frame.io' }))`. Chain: `markReconnect` → `requires_reconnect` (`tests/db/schema-automations.test.ts:384`) → `useFrameioConnection.test.tsx:39` → card. | ✅ |
| (g) the healthy path is not broken | present workspace runs normally | `index.test.ts:291-300` — `expect(res.status).toBe(200)`, `log.marked` empty, `log.created` = ALL | ✅ |

**Outcome: closed.** The helper is no longer dead code; the new dependency `listFrameioWorkspaces` is implemented at `supabase/functions/frameio-create-structure/index.ts:253-260`.

### 2. FAIL-01 — unreachable / 5xx after the permitted retries

**Spec** (`spec.md:85`) + new assumption (`spec.md:51`): *up to 3 attempts, 1 s apart* — the retry budget is **now in the Assumptions table** with rationale ("the runner has a single retry policy; the spec only fixed the count for 429, leaving FAIL-01's 'the permitted retries' without a value").

| Conjunct | `file:line` + assertion | Result |
| -------- | ----------------------- | ------ |
| 5xx retried, delay sequence pinned | `runner.test.ts:191` — `expect(fake.state.delays).toEqual([350, 350, 1000, 1000, 1000])` (folder throttle + three 1 s retries) | ✅ |
| status-less (network) branch exercised | `runner.test.ts:194-204` — `it('falha de rede, sem status HTTP, também repete três vezes (FAIL-01)')`, fake throws a plain `Error`, asserts `res.status/failedAt/error` **and** `:203` `expect(fake.state.delays).toEqual([350, 350, 1000, 1000, 1000])` | ✅ |
| budget constant matches the assumption | `runner.ts:51` `const MAX_RETRIES = 3`, `:80-81` `transient = status === undefined \|\| status === 429 \|\| status >= 500` | ✅ |
| UI failure message + retry action (unchanged) | `RunResult.test.tsx:85-87`, `:114-118` | ✅ carried over |

**Outcome: closed.** Round 1's exact weakness ("nothing asserts a delay count for a 5xx") is now asserted, and M1 (below) dies on it.

### 3. AUTH-09 — label `Reconectar Frame.io`

| Layer | `file:line` | Value | Result |
| ----- | ----------- | ----- | ------ |
| Spec literal | `spec.md:87` (AUTH-09) and `spec.md:138` (EDGE-05) | `Reconectar Frame.io` | — |
| UI string | `src/components/automacoes/FrameioConnectionCard.tsx:112` | `Reconectar Frame.io` | ✅ exact |
| Test that pins it | `src/components/automacoes/FrameioConnectionCard.test.tsx:58` | `expect(screen.getByRole('button', { name: 'Reconectar Frame.io' }))` | ✅ exact |

The deviant `Reconectar Frameio` is gone from all source and tests (`grep -rn 'Reconectar Frameio' src/ supabase/` → 0 hits outside a doc comment).

**Outcome: closed** — UI string and the test both match the spec literal byte-for-byte.

### 4. AUTH-05 — "in the built bundle" conjunct

| Conjunct | Evidence | Result |
| -------- | -------- | ------ |
| (a) not in `src/` | `supabase/functions/frameio-connect/index.test.ts:265-269` — `expect(offenders).toEqual([])` | ✅ carried over |
| (b) **not in the built bundle** | `tests/check-bundle-secrets.mjs` (new, 27 lines) scans every `dist/assets/*.js` for `FRAMEIO_CLIENT_SECRET`, exits 1 if found, exits 1 if `dist/assets` is missing | ✅ **proved this round** |
| (c) no `VITE_*FRAMEIO` | `index.test.ts:272-277` + `:280-284` | ✅ carried over |
| gate wiring | `tasks.md:39` — Build gate = `npm run test && npm run test:db && npx tsc --noEmit && npm run build && node tests/check-bundle-secrets.mjs`; `tasks.md:29` names it in the coverage matrix | ✅ |

**Proof run (scratch, real `dist/` untouched):** clean scan → `AUTH-05 ok…` **exit 0**; a copy of `dist/assets/App-*.js` in a temp dir with `FRAMEIO_CLIENT_SECRET` appended → `AUTH-05 violado: … encontrado em bundle.js` **exit 1**. Temp dir deleted.

**Outcome: closed.**

### 5. EDGE-02 — Frame.io rejects the project name

**Spec** (`spec.md:136`): *IF client `name` contains a character Frame.io rejects as a project name THEN surface Frame.io's error AND NOT create a partial project.*

| Conjunct | `file:line` + assertion | Result |
| -------- | ----------------------- | ------ |
| `createProject` actually fails | `runner.test.ts:248-261` (new `describe('ensureStructure — recusa do nome do projeto (EDGE-02)')`) — fake `fail: (m) => m === 'createProject' ? new FrameioHttpError(422, 'nome de projeto inválido') : undefined` | ✅ round 1's `fail('createProject')` hook is now exercised |
| (a) reason reaches the caller intact | `runner.test.ts:258` — `expect(res.error).toBe('nome de projeto inválido')` | ✅ |
| (b) nothing created (no partial project) | `runner.test.ts:257` — `expect(res.status).toBe('failed')`; `:259` — `expect(res.created).toEqual([])`; `:261` — `expect(fake.state.delays).toEqual([])` (422 is not transient, no retries). The fake increments `createsProject` only *after* the throw check (`runner.test.ts:35-38`), so the project count stays 0. | ✅ |

**Outcome: closed.**

---

## Carried-over ACs (37)

P1-1…18, P1-20, P2-1…12, P3-1…3, EDGE-01, EDGE-03, EDGE-04, EDGE-06 — all ✅ in round 1 with `file:line` citations in the round-1 report; no file they assert against was modified in `3c6ef5e..HEAD`, and the gate re-run below passed every one of them again (445/445). Round-1 spec-precision gap on FAIL-01 resolved by the new Assumptions row (`spec.md:51`); no other AC had a spec-precision gap.

**Status**: ✅ **42/42 ACs matched the spec-defined outcome. 0 spec-precision gaps.**

---

## Discrimination Sensor

**Baseline** (real worktree, before): `?? .agents/` `?? .claude/` `?? .cursor/` `?? .windsurf/`

Scratch: temporary git worktree `C:/Users/Luiz Rickston/taskvisiovs-sensor` at `HEAD = f6c2e76`, `node_modules` junctioned to the real tree. `git stash` never used. Baseline targeted run in scratch: **5 files / 71 passed**.

| # | File (layer) | Mutation | Targeted run | Killed? |
| - | ------------ | -------- | ------------ | ------- |
| 1 (M1, **re-injected**) | `supabase/functions/_shared/frameio/runner.ts:80` | `transient = status === undefined \|\| status === 429 \|\| status >= 500` → dropped `\|\| status >= 500` | `npx vitest run …/runner.test.ts` → **1 failed / 16 passed**, failure at `runner.test.ts:191` `expect(fake.state.delays).toEqual([350, 350, 1000, 1000, 1000])` | ✅ **Killed** (round 1: survived) |
| 2 (M2, reused) | `supabase/functions/_shared/frameio/run.ts` | lock conflict `fail(409, LOCK_BUSY_MESSAGE)` → `fail(400, …)` | `…/frameio-create-structure/index.test.ts` → 1 failed / 23 passed | ✅ Killed |
| 3 (M3, reused) | `supabase/functions/_shared/frameio/names.ts` | `slugPart` `replace(/\s+/g,'-')` → `replace(/\s/g,'-')` | `…/names.test.ts` → 1 failed / 9 passed | ✅ Killed |
| 4 (M4, reused) | `supabase/functions/_shared/frameio/plan.ts:62-64` | reuse branch → always `kind:'create'` | `…/plan.test.ts` → 5 failed / 5 passed | ✅ Killed |
| 5 (M5, reused) | `src/components/automacoes/RunResult.tsx:78` | retry button `{failed && (` → `{failed && !!result.failedAt && (` | `…/RunResult.test.tsx` → 1 failed / 9 passed | ✅ Killed |
| 6 (**new**, targets fix 1) | `supabase/functions/_shared/frameio/run.ts:171-178` | deleted the whole EDGE-05 guard (`listFrameioWorkspaces` check + `markReconnect` + 409) | `…/frameio-create-structure/index.test.ts` → 1 failed / 23 passed; failing test = `handleRun — workspace sumido (EDGE-05) > pedido reconexão em vez de falhar genérica, e não toca no Frame.io` | ✅ **Killed** |

**Sensor depth**: 6 mutations across 6 layers (runner / run / names / plan / React component / page-level run handler).
**Outcome**: **6/6 killed, 0 survived** — ✅

**M6 follow-up (round-1 survivor, no fix applied):** the note still holds. `FrameioConnectionCard.tsx:97` — `if (connection.status !== 'connected')` early-returns before rendering `children`, so `AutomacoesPage.tsx`'s connected-gate remains redundant belt-and-braces. The AUTH-06 behaviour stays discriminated by `FrameioConnectionCard.test.tsx:43-44` and `:58-59`. **No coverage fix needed**; leaving it as an optional cleanup, out of scope for this feature.

**Cleanup**: `git worktree remove --force …` succeeded; `git worktree list` shows only the real tree. **`git status --porcelain` after cleanup is byte-identical to the baseline** (`?? .agents/` `?? .claude/` `?? .cursor/` `?? .windsurf/`).

---

## Interactive UAT Results

Not performed — backend/service-integration feature; automated checks suffice per `validate.md` §7.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ diff is 12 files, all map to Fix 1–5 (`run.ts`, `index.ts`, `runner.test.ts`, `index.test.ts`, `FrameioConnectionCard.{tsx,test.tsx}`, `check-bundle-secrets.mjs`, spec/tasks/lessons docs) |
| No abstractions for single-use code | ✅ `listFrameioWorkspaces` is a `RunDeps` injection mirroring the existing `refreshSession`/`markReconnect` pattern (AD-003) |
| No unnecessary flexibility added | ✅ no new config knobs; the scan script has one constant |
| Only touched files required for task | ✅ |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ |
| Would senior engineer approve? | ✅ |
| Tests map to ACs and are non-shallow | ✅ all 4 new tests carry an AC/edge ID in their `describe`/`it` title |
| Spec-anchored outcome check | ✅ asserted values (`409`, `Reconectar Frame.io`, `[350, 350, 1000, 1000, 1000]`, `'nome de projeto inválido'`) match the spec-defined outcome exactly |
| Per-layer Coverage Expectation met | ✅ domain 1:1, edge functions happy+error, DB schema/RLS/RPC/mutex |
| Every test maps to an AC/edge/Done-when | ✅ no unclaimed tests in the new `describe` blocks |
| Documented project quality/testing guidelines followed | `tasks.md` Test Coverage Matrix (`tasks.md:16-29`) + Build gate (`:39`) |

**Observation (non-blocking, no AC impact):** three prose lines still carry the old label — `.specs/features/automations/design.md:130`, `:338`, and the Done-when checkbox at `tasks.md:355` (`Reconectar Frameio`). The code, the tests, and `spec.md` are correct; only this descriptive text is stale. Cosmetic doc drift, not an AC failure.

---

## Edge Cases (summary)

- [x] Project exists, some of the five folders missing → only missing created (`plan.test.ts:148`) — carried over
- [x] Client `name` rejected as a project name → **now directly tested** (`runner.test.ts:248-261`)
- [x] Month exists, project folder missing → only the project branch (`plan.test.ts:167`) — carried over
- [x] Two clients, same `clients.name` → one shared project (`index.test.ts:297`) — carried over
- [x] Connection row exists, Frame.io workspace gone → **now wired and tested** (`run.ts:173`, `index.test.ts:276-300`)
- [x] Leave mid-run, return, click again → second run refused (`schema-automations.test.ts:404`, `index.test.ts:177`) — carried over

---

## Gate Check

- **Gate command** (`tasks.md:39`, Build tier): `npm run test && npm run test:db && npx tsc --noEmit && npm run build && node tests/check-bundle-secrets.mjs`
- All four tiers executed in this round.

| Gate | Result | Exit code |
| ---- | ------ | --------- |
| `npm run test` | 42 files, **445 passed, 0 failed, 0 skipped** | **0** |
| `npm run test:db` | 7 files, **82 passed, 0 failed, 0 skipped** | **0** |
| `npx tsc --noEmit` | clean | **0** |
| `npm run build` | `✓ built in 9.01s` | **0** |
| `node tests/check-bundle-secrets.mjs` | `AUTH-05 ok: FRAMEIO_CLIENT_SECRET ausente…` (and **exit 1** on the marker-injected scratch copy) | **0** (1 when marker present) |

**Test integrity**

| | Files | Tests |
| - | ----- | ----- |
| Before feature (`6e3335e`) | 27 | 246 |
| Round 1 (`3c6ef5e`) | 42 | 441 |
| Round 2 (`HEAD = f6c2e76`) | 42 | **445** |

Delta vs round 1: **+4 tests** (1 network-retry, 1 EDGE-02, 2 EDGE-05), 0 deleted, 0 weakened. `test:db` unchanged at 7 files / 82 tests. `grep` for `.skip`/`xit`/`xdescribe` across the feature's test files → **no hits**.

**Skipped tests**: none.

---

## Fix Plans

None — all five round-1 fixes are applied and verified.

---

## Requirement Traceability Update

| Requirement | Round-1 status | Round-2 status |
| ----------- | -------------- | -------------- |
| MENU-01…03, AUTH-01…04, AUTH-06…08, STRU-01…07, RETY-01, PROJ-01…12, RATE-01, PART-01/02, EDGE-01, EDGE-03, EDGE-04, EDGE-06 | ✅ Verified | ✅ Verified (carried over) |
| AUTH-05 | ⚠️ Needs Fix (bundle conjunct) | ✅ Verified (`tests/check-bundle-secrets.mjs` + gate wiring, proved exit 0/1) |
| AUTH-09 | ⚠️ Needs Fix (label ≠ spec literal) | ✅ Verified (UI + test both `Reconectar Frame.io`) |
| FAIL-01 | ⚠️ Needs Fix (retry count unspecified + unasserted) | ✅ Verified (Assumptions `spec.md:51`; `runner.test.ts:191`/`:203`) |
| EDGE-02 | ⚠️ Needs Fix (project-name path untested) | ✅ Verified (`runner.test.ts:248-261`) |
| EDGE-05 | ❌ Needs Fix (helper unwired) | ✅ Verified (`run.ts:173` + `index.test.ts:276-300`; `spec.md` traceability now `Verified`) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 42/42 ACs matched the spec-defined outcome · 0 spec-precision gaps · 0 partial · 0 uncovered
**Sensor**: 6 mutations injected, **6 killed, 0 survived**
**Gate**: 445 unit + 82 db passed, 0 failed, 0 skipped; `tsc --noEmit` exit 0; `build` exit 0; `check-bundle-secrets.mjs` exit 0 (exit 1 proven with marker)

**What works**: everything round 1 passed, plus the five repaired areas — EDGE-05 reconnect path (`run.ts` → `markReconnect` → `Reconectar Frame.io`, zero Frame.io writes), 5xx **and** status-less retry budget asserted (`[350, 350, 1000, 1000, 1000]`) and recorded in the spec's Assumptions, the exact `Reconectar Frame.io` label in code and test, a build-gate bundle secret scan that provably fails on a hit, and a `createProject` name-rejection test that surfaces the reason with nothing created.

**Issues found**: none blocking. One cosmetic note: `design.md:130`, `design.md:338` and `tasks.md:355` still spell the action `Reconectar Frameio` in prose (code/spec/tests are correct).

**Next steps**: feature is done; optionally tidy the three stale prose strings above.
