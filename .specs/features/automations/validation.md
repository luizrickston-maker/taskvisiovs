# Automations Validation

**Date**: 2026-11-18
**Spec**: `.specs/features/automations/spec.md`
**Diff range**: `6e3335e..3c6ef5e` (18 commits: spec + T1–T17)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ❌ FAIL

---

## Task Completion

| Task | Status  | Notes                              |
| ---- | ------- | ---------------------------------- |
| T1   | ✅ Done | Gate `npm run test && npm run test:db` checked in tasks.md:118 |
| T2   | ✅ Done | tasks.md:148                       |
| T3   | ✅ Done | tasks.md:179                       |
| T4   | ✅ Done | tasks.md:211                       |
| T5   | ✅ Done | tasks.md:239                       |
| T6   | ✅ Done | tasks.md:271                       |
| T7   | ✅ Done | tasks.md:300                       |
| T8   | ✅ Done | tasks.md:328                       |
| T9   | ✅ Done | tasks.md:358                       |
| T10  | ✅ Done | tasks.md:391                       |
| T11  | ✅ Done | tasks.md:422                       |
| T12  | ✅ Done | tasks.md:450                       |
| T13  | ✅ Done | tasks.md:479                       |
| T14  | ✅ Done | tasks.md:508                       |
| T15  | ✅ Done | tasks.md:538                       |
| T16  | ✅ Done | tasks.md:566                       |
| T17  | ✅ Done | tasks.md:594                       |

0 unchecked boxes in `tasks.md` (115 checked). No task blocked or partial.

---

## Spec-Anchored Acceptance Criteria

42 criteria = P1 (21) + P2 (12) + P3 (3) + Edge cases (6).

### P1: Conectar o Frame.io e criar a estrutura de cliente novo

| # | Criterion (WHEN/IF/WHILE THEN SHALL) | Spec-defined outcome | `file:line` + assertion | Result |
| - | ------------------------------------- | -------------------- | ----------------------- | ------ |
| 1 | WHEN admin loads app THEN sidebar SHALL include "Automações" → `/pj/automacoes` | link present with href `/pj/automacoes` | `src/components/layout/AppSidebar.test.tsx:89` — `expect(link).toHaveAttribute('href', '/pj/automacoes')` | ✅ PASS |
| 2 | WHEN user is not a workspace admin THEN sidebar SHALL NOT include it | link absent (sibling `Ferramentas` still present) | `src/components/layout/AppSidebar.test.tsx:98` — `expect(screen.queryByRole('link', { name: /Automações/ })).not.toBeInTheDocument()` | ✅ PASS |
| 3 | WHEN non-admin navigates to `/pj/automacoes` THEN SHALL NOT render connection or creation actions | no connect button, no client form, no video form | `src/pages/PJ/AutomacoesPage.test.tsx:211-214` — `expect(hasConnect()).toBe(false); expect(hasClientForm()).toBe(false); expect(hasVideoForm()).toBe(false); expect(screen.queryByRole('combobox')).toBeNull()` | ✅ PASS |
| 4 | WHEN admin activates connect THEN navigate to Adobe authorize URL carrying `response_type`, `client_id`, `redirect_uri`, scope, `state` | exact URL + exact param set | `src/components/automacoes/FrameioConnectionCard.test.tsx:81` — `expect(url.origin+url.pathname).toBe('https://ims-na1.adobelogin.com/ims/authorize/v2')`; `:87-96` — `response_type='code'`, `client_id`, `redirect_uri`, `scope`, `state` + exact key list; `:103` — `expect(FRAMEIO_SCOPE).toBe('openid email profile offline_access additional_info.roles')` | ✅ PASS |
| 5 | IF `state` differs THEN abort and SHALL NOT write a connection row | abort before any server call | `src/pages/Auth/FrameioCallbackPage.test.tsx:48-49` — `expect(screen.getByText('Conexão cancelada'))…; expect(invoke).not.toHaveBeenCalled()`; also `:56-57` (no stored state) | ✅ PASS |
| 6 | WHEN Adobe returns `code` THEN exchange with `grant_type=authorization_code` + `code`/`client_id`/`client_secret`/`redirect_uri` to `…/ims/token/v3` | exact form body + exact endpoint | `supabase/functions/frameio-connect/index.test.ts:143` — `expect(params.get('grant_type')).toBe('authorization_code')` + `:137-147` exact key set; `:226` — `expect(IMS_TOKEN_URL).toBe('https://ims-na1.adobelogin.com/ims/token/v3')` | ✅ PASS |
| 7 | WHEN exchange succeeds THEN store exactly one row per `workspace_id` with account id, workspace id, access token, expiry, refresh token | one row; all five fields persisted | `supabase/functions/frameio-connect/index.test.ts:184` — `expect(calls.saved).toHaveLength(1)`; `:185-190` account/workspace ids; `:210` — `expect(calls.saved[0].access_token_expires_at).toBe('2026-11-18T12:30:00.000Z')`; `tests/db/schema-automations.test.ts:246-256` — duplicate `workspace_id` → `23505 / frameio_connections_workspace_id_key`; `supabase/functions/frameio-connect/index.test.ts:290` — `onConflict: 'workspace_id'` | ✅ PASS |
| 8 | `client_secret` exclusively from Edge Function env; NOT in client source, built bundle, or any `VITE_*` | zero occurrences in `src/`; no `VITE_*FRAMEIO`; read only via `Deno.env.get` | `supabase/functions/frameio-connect/index.test.ts:265-269` — `expect(offenders).toEqual([])` (walk of `src/`); `:272-277` — `expect(offenders).toEqual([])` + `vite.config.ts` not matched; `:280-284` — `toContain("env: (name) => Deno.env.get(name)")`, `not.toContain('VITE_')` | ⚠️ PARTIAL — conjunct "in the built bundle" has **no** evidence (no `dist/` scan anywhere; `npm run build` not part of this gate run). Conjects 1 and 3 are pinned. |
| 9 | WHEN no stored connection THEN show connection action and NOT structure-creation actions | connect button shown, forms hidden | `src/pages/PJ/AutomacoesPage.test.tsx:109-111` — `findByRole('button',{name:'Conectar Frame.io'})` + `expect(hasClientForm()).toBe(false)`; `src/components/automacoes/FrameioConnectionCard.test.tsx:43-44` | ✅ PASS |
| 10 | WHEN stored connection THEN show connected state AND structure-creation actions | workspace badge + both forms, no connect button | `src/pages/PJ/AutomacoesPage.test.tsx:119-123` — `findByRole('button',{name:'Criar estrutura'})`, `expect(hasConnect()).toBe(false)`, `hasClientForm()`, `hasVideoForm()`, `getByText('Produção')`; `FrameioConnectionCard.test.tsx:51-52` | ✅ PASS |
| 11 | WHEN admin creates THEN ensure project named exactly `clients.name`, creating if absent | project created with the client's name when missing | `supabase/functions/_shared/frameio/runner.test.ts:250-261` — `expect(fake.state.createsProject).toBe(1)`; `supabase/functions/frameio-create-structure/index.test.ts:288-295` — `expect(log.createdProject).toEqual(['Cliente Xyz'])` | ✅ PASS |
| 12 | WHEN project exists/created THEN ensure `Contratos`,`Artes`,`Textos e Roteiros`,`Relatórios`,`Vídeos` directly under root, creating only absent ones | exact five names at `path: []` | `supabase/functions/_shared/frameio/plan.test.ts:57-65` — `expect(planClientStructure()).toEqual([{path:[],name:'Contratos'},…])`; `runner.test.ts:71` — `expect(res.created).toEqual(ALL)` | ✅ PASS |
| 13 | IF folder with target name exists under that parent THEN reuse, SHALL NOT create a second | no `create` for an existing sibling; reuse carries id | `supabase/functions/_shared/frameio/plan.test.ts:120-143` — `expect(kinds(steps).create).toEqual([PROJECT_NAME,'Brutos','Cenas de Apoio','Editados'])` for the *other-month* collision + control `expect(kinds(complete).create).toBeUndefined()` | ✅ PASS |
| 14 | IF run stops partway and is re-run THEN create only missing and SHALL NOT report an error | `status:'ok'`, zero creates, everything in `existing` | `supabase/functions/_shared/frameio/runner.test.ts:83-92` — `expect(res.status).toBe('ok'); expect(res.created).toEqual([]); expect(res.existing).toEqual(ALL); expect(fake.state.creates).toEqual([])`; `:94-100` partial re-run | ✅ PASS |
| 15 | WHILE run in flight THEN submitting control disabled AND no second concurrent run for same client | button disabled; DB mutex refuses second `running` row | `src/components/automacoes/ClientStructureForm.test.tsx:84-97` — `getByRole('button',{name:'Criando...'})` `toBeDisabled()` + `expect(onRun).not.toHaveBeenCalled()`; `tests/db/schema-automations.test.ts:404-414` — `expectFailure(…, {code:'23505', constraint:'frameio_runs_one_live_per_client'})`; `supabase/functions/frameio-create-structure/index.test.ts:177-185` — `expect(res.status).toBe(409)` | ✅ PASS (both conjuncts) |
| 16 | WHEN >1 folder THEN one-at-a-time with ≥350 ms between consecutive requests | every recorded delay ≥ 350 | `supabase/functions/_shared/frameio/runner.test.ts:80` — `expect(fake.state.delays.every((ms) => ms >= 350)).toBe(true)` (+ `:79` count = 5) | ✅ PASS |
| 17 | WHEN every item present THEN success message listing created and marking already-existing | separate `Criado:` and `Já existia:` lines | `src/components/automacoes/RunResult.test.tsx:40-43` — `line('Criado:').textContent` contains `Contratos`/`Vídeos`, `line('Já existia:')` contains `Artes` | ✅ PASS |
| 18 | IF API answers 401 THEN refresh once and retry that call once | exactly one refresh, run still succeeds | `supabase/functions/_shared/frameio/runner.test.ts:128` — `expect(fake.state.refreshes).toBe(1)` + `expect(res.status).toBe('ok')`; `:141` — second 401 does **not** refresh again, `expect(res.status).toBe('failed')` | ✅ PASS (both conjuncts) |
| 19 | IF unreachable or HTTP 5xx after permitted retries THEN failure message naming the step + `Tentar novamente` | `Falhou em <etapa>` + retry button | `src/components/automacoes/RunResult.test.tsx:85-87` — `expect(screen.getByText('Falhou em'))` + `getByText('Artes')`; `:114-118` — `getByRole('button',{name:'Tentar novamente'})` → `onRetry` called; `supabase/functions/_shared/frameio/runner.test.ts:176-189` — 503 → `failedAt:'Artes'` | ⚠️ Spec-precision gap + weak evidence — see "Spec-precision gaps" |
| 20 | WHILE token within 5 min of expiry THEN refresh with `grant_type=refresh_token` before next call | boundary at exactly 5 min; refreshed before first Frame.io call | `supabase/functions/_shared/frameio/tokens.test.ts:10` — `needsRefresh(12:04:59)→true`; `:14` — `12:05:00→true` (boundary); `:18` — `12:30→false`; `supabase/functions/frameio-create-structure/index.test.ts:205-223` — `expect(log.refreshes).toEqual(['rt-velho'])` + `expect(log.frameioContexts[0].accessToken).toBe('at-novo')` | ✅ PASS |
| 21 | IF refresh token rejected THEN mark connection as requiring reconnection AND display `Reconectar Frame.io` action | `requires_reconnect=true` **and** the action labelled `Reconectar Frame.io` | `supabase/functions/frameio-create-structure/index.test.ts:235` — `expect(log.marked).toEqual(['ws-tv-1'])`; `supabase/functions/_shared/frameio/tokens.test.ts:40` — `classifyTokenError(…,'invalid_grant')→'reconnect'`; `tests/db/schema-automations.test.ts:384` — `expect(rows.rows[0].requires_reconnect).toBe(true)`; `src/components/automacoes/FrameioConnectionCard.test.tsx:58` — `expect(screen.getByRole('button', { name: 'Reconectar Frameio' }))` | ⚠️ PARTIAL — action is rendered as **`Reconectar Frameio`**, the spec literal is **`Reconectar Frame.io`**. The test pins the implemented (deviant) label, so the spec-defined outcome is not matched. |

### P2: Criar projeto de vídeo para cliente existente

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| 1 | WHEN admin activates video action THEN ensure `Vídeos` under client project root | `{path: [], name: 'Vídeos'}` first step | `supabase/functions/_shared/frameio/plan.test.ts:69-77` — `expect(planVideoProject(EXAMPLE)).toEqual([{path:[],name:'Vídeos'},…])` | ✅ PASS |
| 2 | WHEN `Vídeos` exists THEN ensure `AAAA-MM-NomeMes` under it | `{path:['Vídeos'], name:'2026-11-Novembro'}` | `plan.test.ts:69-77` (same array) + `:93` — `expect(specs[1].name).toBe('2026-11-Novembro')` | ✅ PASS |
| 3 | WHEN month exists THEN ensure `AAAA-MM-DD_DiaSemana-Tipo-NomeProjeto` under it | `{path:['Vídeos', month], name:'2026-11-05_Quinta-Video-Lancamento'}` | `plan.test.ts:69-77` + `:94` — `expect(specs[2].name).toBe('2026-11-05_Quinta-Video-Lancamento')` | ✅ PASS |
| 4 | WHEN project folder exists THEN ensure `Brutos`, `Cenas de Apoio`, `Editados` under it | three siblings at depth 3 | `plan.test.ts:80-90` — `expect(material).toHaveLength(3)`; `expect(key(material[0].path)).toBe('Vídeos/…/…')`; `expect(material.every(s=>s.path.length===3)).toBe(true)` | ✅ PASS |
| 5 | IF folder with target name exists under that parent THEN reuse, no second | zero creates on full tree | `plan.test.ts:107-118` — `expect(kinds(steps).create).toBeUndefined(); expect(kinds(steps).reuse).toEqual(specs.map(s=>s.name))` (runs for **both** plans) | ✅ PASS |
| 6 | IF run stops partway and re-run for same client/date/type/name THEN only missing created, no error | branch-level partial creation | `plan.test.ts:167-181` — `expect(kinds(steps).reuse).toEqual(['Vídeos', MONTH_NAME])`, `expect(kinds(steps).create).toEqual([PROJECT_NAME,'Brutos','Cenas de Apoio','Editados'])`; `:183-191` whole branch | ✅ PASS |
| 7 | `NomeMes` = full Portuguese month, first letter uppercased | `Novembro` for 2026-11 | `supabase/functions/_shared/frameio/names.test.ts:62-64` — `expect(buildMonthFolderName('2026-11-05')).toBe('2026-11-Novembro')`; `:66-72` all 12 months, 12 distinct | ✅ PASS |
| 8 | `DiaSemana` ∈ `Segunda…Domingo` | 7 exact literals | `names.test.ts:82-89` — loop over `WEEKDAY_TABLE` → `expect(...).toBe(`${date}_${expected}-Video-Reel`)` + `expect(new Set(weekdays).size).toBe(7)` | ✅ PASS |
| 9 | Replace each whitespace **run** in `Tipo`/`NomeProjeto` with a single hyphen, preserving accents and every other character | `'Video   Tutorial'→'Video-Tutorial'`; `'Lançamento'` intact | `names.test.ts:92-105` — `expect(slugPart('Video   Tutorial')).toBe('Video-Tutorial')` (3 spaces, tab, newline each → one `-`); `:107-125` — `expect(slugPart('Lançamento')).toBe('Lançamento')`, `expect(slugPart('São Paulo — Verão')).toBe('São-Paulo-—-Verão')` | ✅ PASS (both conjuncts) |
| 10 | IF no Frame.io project for client THEN display `Crie primeiro a estrutura do cliente` AND NOT create any folder or project | exact message; zero writes | `supabase/functions/_shared/frameio/runner.test.ts:245` — `expect(res.error).toBe('Crie primeiro a estrutura do cliente')`; `:246-247` — `expect(fake.state.createsProject).toBe(0); expect(fake.state.creates).toEqual([])`; `frameio-create-structure/index.test.ts:276-286` — `409`, `NO_PROJECT_MESSAGE`, `log.createdProject`/`log.created` empty; `src/components/automacoes/VideoProjectForm.test.tsx:173-179` — alert text + `expect(toast.success).not.toHaveBeenCalled()` | ✅ PASS (both conjuncts) |
| 11 | WHILE run in flight THEN control disabled AND no second concurrent run for same client/date/type/name | disabled button; mutex across both flows | `src/components/automacoes/VideoProjectForm.test.tsx:159-164` — `getByRole('button',{name:'Criando...'}))` `toBeDisabled()` + `expect(onRun).not.toHaveBeenCalled()`; `tests/db/schema-automations.test.ts:404` (mutex) and `:489-500` — `holds the mutex across both flows` → `23505 / frameio_runs_one_live_per_client` | ✅ PASS (both conjuncts) |
| 12 | WHEN every item present THEN success message listing created and marking already-existing | same as STRU-07 | `src/components/automacoes/RunResult.test.tsx:40-43` (shared `RunResult` for both flows) | ✅ PASS |

### P3: Resiliência diante de falhas do Frame.io

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| 1 | IF HTTP 429 THEN wait `Retry-After`, else 1 s, retry up to 3 times | exact delay sequence | `supabase/functions/_shared/frameio/runner.test.ts:159` — `expect(fake.state.delays).toEqual([350, 250, 250, 250])` (Retry-After honoured, 3 retries); `:171` — `expect(fake.state.delays).toEqual([350, 1000, 1000, 1000])` (absent → 1 s) | ✅ PASS |
| 2 | IF run fails after ≥1 item created THEN display items created AND items not created | both lists rendered | `src/components/automacoes/RunResult.test.tsx:76-80` — `line('Criado:').toContain('Contratos')` **and** `line('Não criado:').toContain('Artes')`/`'Vídeos'`; `runner.test.ts:180-184` — `expect(res.created).toEqual(['Contratos'])` + `expect(res.remaining).toEqual([...])` | ✅ PASS (both conjuncts) |
| 3 | IF run fails on the very first item THEN display nothing was created AND offer `Tentar novamente` | `Nada foi criado.` + retry button wired | `src/components/automacoes/RunResult.test.tsx:98-108` — `expect(screen.getByText(NOTHING_CREATED)).toBeInTheDocument()` + `getByRole('button',{name:RETRY_LABEL})` → `expect(onRetry).toHaveBeenCalledTimes(1)`; `runner.test.ts:191-201` — `expect(res.created).toEqual([])` | ✅ PASS (both conjuncts) |

### Edge cases

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| EDGE-01 | IF project exists but one of the five folders missing THEN create only the missing folders | only the hole is filled | `supabase/functions/_shared/frameio/plan.test.ts:148-166` — `expect(kinds(steps).create).toEqual(['Editados'])` with `Brutos`/`Cenas de Apoio` present | ✅ PASS |
| EDGE-02 | IF client `name` contains a character Frame.io rejects as a project name THEN surface Frame.io's error AND NOT create a partial project | raw reason shown; no partial project | `supabase/functions/_shared/frameio/runner.test.ts:203-217` — `expect(res.error).toBe('nome de pasta inválido')` (folder-name rejection); `:219-231` — pre-project failure `expect(res.created).toEqual([])`; `src/components/automacoes/RunResult.test.tsx:122-124` — `getByText('Frame.io 503: indisponível')` | ⚠️ PARTIAL — no test makes **`createProject`** fail (the fake supports `fail('createProject')` at `runner.test.ts:34-36` but nothing calls it), so the AC's actual scenario (rejected *project* name → no partial project) has no direct evidence. |
| EDGE-03 | IF month folder exists but project folder does not THEN create only project folder + material folders | project branch only | `plan.test.ts:167-181` — `reuse: ['Vídeos', MONTH_NAME]`, `create: [PROJECT_NAME, 'Brutos', 'Cenas de Apoio', 'Editados']` | ✅ PASS |
| EDGE-04 | IF two clients share `clients.name` THEN treat as one Frame.io project (name is the only key) | existing project reused, never recreated | `supabase/functions/frameio-create-structure/index.test.ts:297-307` — `expect(log.createdProject).toEqual([])` when a project named `Cliente Xyz` exists; `:288-295` creation path | ✅ PASS |
| EDGE-05 | IF connection row exists but its Frame.io workspace no longer exists THEN display `Reconectar Frame.io` rather than an empty success | UI shows reconnect, not success | **no evidence.** `workspaceStillPresent` exists at `supabase/functions/_shared/frameio/tokens.ts:47` and is unit-tested at `supabase/functions/_shared/frameio/tokens.test.ts:68-78`, but `grep -rn workspaceStillPresent supabase/ src/` finds **no production caller** — the helper is dead code and nothing ever flips `requires_reconnect` because a stored workspace vanished. Spec traceability already lists EDGE-05 as `Pending`. | ❌ NOT COVERED |
| EDGE-06 | WHEN user leaves mid-run and returns and clicks again before the first completes THEN SHALL NOT start a second run | second attempt refused | `tests/db/schema-automations.test.ts:404-414` — `23505 / frameio_runs_one_live_per_client`; `:443-470` — stale row released only after the 10-minute sweep; `supabase/functions/frameio-create-structure/index.test.ts:177-185` — `expect(res.status).toBe(409)` + `expect(log.frameioContexts).toEqual([])` (no Frame.io call) | ✅ PASS |

**Status**: ❌ Gaps present — 37/42 fully matched, 4 partial, 1 not covered.

---

## Spec-precision gaps

| AC | Gap |
| -- | --- |
| **FAIL-01 (P1-19)** | The spec says "after the permitted retries" but never states how many retries are permitted for an unreachable/5xx call (only RATE-01 fixes a count, and only for 429). No assertion pins the 5xx retry count either — see sensor M1. The "unreachable" (network, no HTTP status) branch has **no** test at all: every fault in `runner.test.ts` throws `FrameioHttpError` with a status. |

No other AC's asserted value was found to be vaguer than the spec text it maps to.

---

## Payload / conjunction rule

| AC | Conjuncts | Evidence per conjunct |
| -- | --------- | ---------------------- |
| **STRU-05** | (a) submitting control disabled in flight; (b) no second concurrent run for the same client | (a) `ClientStructureForm.test.tsx:84-97` ✅ · (b) `tests/db/schema-automations.test.ts:404-414` + `frameio-create-structure/index.test.ts:177-185` ✅ |
| **AUTH-09** | (a) mark connection as requiring reconnection; (b) display `Reconectar Frame.io` | (a) `frameio-create-structure/index.test.ts:235` + `tests/db/schema-automations.test.ts:384` ✅ · (b) `FrameioConnectionCard.test.tsx:58` — asserts **`Reconectar Frameio`** (no period) ≠ spec literal ❌ |
| **EDGE-06** | leaving mid-run → returning → clicking again must not start a second run | mechanism pinned at three layers: DB partial unique index (`schema-automations.test.ts:404`), stale sweep (`:443`), function-level 409 with no Frame.io call (`index.test.ts:177-185`) ✅ |
| **AUTH-05** | (a) not in client source; (b) not in the built bundle; (c) not in any `VITE_*` | (a) `index.test.ts:265-269` ✅ · (b) **no evidence** (no `dist/` scan) ❌ · (c) `index.test.ts:272-277` ✅ |
| **EDGE-02** | (a) surface Frame.io's error message; (b) no partial project | (a) `runner.test.ts:203-217` ✅ · (b) only via a *generic* pre-project failure (`runner.test.ts:219-231`), never for a rejected project name ❌ |
| **PROJ-09** | whitespace runs → single hyphen **and** accents/other chars preserved | (a) `names.test.ts:92-105` ✅ · (b) `names.test.ts:107-125` ✅ |
| **PROJ-10** | show exact message **and** create no folder or project | `runner.test.ts:245-247` ✅ + `index.test.ts:276-286` ✅ + `VideoProjectForm.test.tsx:173-179` ✅ |
| **PART-01** | show created **and** not-created | `RunResult.test.tsx:76-80` ✅ |
| **PART-02** | say nothing was created **and** offer retry | `RunResult.test.tsx:98-108` ✅ |
| **RATE-01** | honour `Retry-After` **or** 1 s, **and** retry up to 3 times | `runner.test.ts:159` ✅ + `:171` ✅ |

---

## Discrimination Sensor

Scratch: temporary git worktree at `HEAD` = `3c6ef5e` (`taskvisiovs-sensor`), `node_modules` junctioned to the real tree. Real worktree `git status --porcelain` captured **before** (`?? .agents/ ` `.claude/` `.cursor/` `.windsurf/`) and **after** — identical; worktree removed with `--force` afterwards. `git stash` never used.

| # | File (layer) | Mutation | Targeted run | Killed? |
| - | ------------ | -------- | ------------ | ------- |
| 1 | `supabase/functions/_shared/frameio/runner.ts:80` | `const transient = status === undefined \|\| status === 429 \|\| status >= 500` → dropped `\|\| status >= 500` (5xx no longer retried) | `npx vitest run …/runner.test.ts` → **15 passed, 0 failed** | ❌ **Survived** |
| 2 | `supabase/functions/_shared/frameio/run.ts:141` | lock conflict `fail(409, LOCK_BUSY_MESSAGE)` → `fail(400, …)` | `npx vitest run …/frameio-create-structure/index.test.ts` → 1 failed / 21 passed | ✅ **Killed** |
| 3 | `supabase/functions/_shared/frameio/names.ts:77` | `slugPart` `replace(/\s+/g,'-')` → `replace(/\s/g,'-')` (a run of 3 spaces becomes 3 hyphens) | `npx vitest run …/names.test.ts` → 1 failed / 9 passed | ✅ **Killed** |
| 4 | `supabase/functions/_shared/frameio/plan.ts:62-64` | `planSteps` reuse branch → always emits `kind:'create'` | `npx vitest run …/plan.test.ts` → 5 failed / 5 passed | ✅ **Killed** |
| 5 | `src/components/automacoes/RunResult.tsx:78` | retry button `{failed && (` → `{failed && !!result.failedAt && (` | `npx vitest run …/RunResult.test.tsx` → 1 failed / 9 passed | ✅ **Killed** |
| 6 | `src/pages/PJ/AutomacoesPage.tsx:105` | form gate `connection?.status === 'connected'` → `connection != null` | `npx vitest run …/AutomacoesPage.test.tsx` → **8 passed, 0 failed** | ❌ **Survived** |

**Sensor depth**: 6 mutations across 6 layers (runner / run / names / plan / React component / page).
**Result**: **4/6 killed, 2 survived** — ❌ FAIL

### Survivor analysis

- **M1 (real test weakness).** Nothing in `runner.test.ts` asserts a delay count for a 5xx. `:176-189` only checks `status/created/failedAt/remaining/error`, which are identical whether the 503 is retried 3 times or not at all. So FAIL-01's "after the permitted retries" is not discriminated, and the unreachable/network branch (`status === undefined`) is never exercised at all. → fix task A.
- **M6 (redundant guard, AC still protected).** `AutomacoesPage`'s connected-gate is belt-and-braces: `FrameioConnectionCard` early-returns before rendering children whenever `connection.status !== 'connected'` (`FrameioConnectionCard.tsx:84`), and `FrameioConnectionCard.test.tsx:43-44` / `:58-59` pin that directly. The AUTH-06 behaviour is therefore still discriminated — just not by the line that was mutated. The mutation survived because the guard is duplicated, not because the AC is untested. → not a coverage fix; note for a cleanup decision (out of scope here).

---

## Interactive UAT Results

Not performed — backend/service-integration feature; automated checks are sufficient per `validate.md` §7 (user-facing flows are button/selector only and are covered by component tests).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ diff is 42 files, all under the spec's scope; no unrelated "improvements" (`src/App.tsx` and `AppSidebar.tsx` changes are route/menu wiring only) |
| No abstractions for single-use code | ✅ `FrameioApi`/`RunnerOptions` injection is justified by AD-003 and reused across 4 test suites |
| No unnecessary flexibility added | ✅ no config knobs beyond spec'd `folderIntervalMs` |
| Only touched files required for task | ✅ |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ `SECURITY DEFINER` RPC + no-policy RLS mirror `appointment_notification_log`; TanStack mutation + toast matches `useCollaboratorAppointments` |
| Would senior engineer approve? | ✅ with the gaps below |
| Tests map to ACs and are non-shallow | ✅ spot-check STRU-06: asserts the *exact* delay array, not just "was called" |
| Spec-anchored outcome check | ⚠️ AUTH-09 label deviates from the spec literal; FAIL-01 retry count unspecified |
| Per-layer coverage met | ✅ domain 1:1 (`names`/`plan`/`runner`/`tokens` → ACs), edge functions cover happy + every Error-Handling row, DB covers schema/RLS/RPC/mutex |
| Every test in scope maps to an AC/edge/Done-when | ✅ all `describe` titles in the feature's test files carry an AC/edge ID; no unclaimed tests found |
| Documented project quality/testing guidelines followed | `tasks.md` Test Coverage Matrix (lines 16–29) + `design.md` AD-003/AD-006/AD-009 |

---

## Edge Cases (summary)

- [x] Project exists, some of the five folders missing → only missing created (`plan.test.ts:148`)
- [ ] Client `name` rejected as a project name → **partial evidence only**; no test drives `createProject` failure
- [x] Month exists, project folder missing → only the project branch (`plan.test.ts:167`)
- [x] Two clients, same `clients.name` → one shared project (`index.test.ts:297`)
- [ ] Connection row exists, Frame.io workspace gone → **no evidence**; helper is unwired (`tokens.ts:47`)
- [x] Leave mid-run, return, click again → second run refused (`schema-automations.test.ts:404`, `index.test.ts:177`)

---

## Gate Check

- **Gate command** (tasks.md:39, Build tier): `npm run test && npm run test:db && npx tsc --noEmit && npm run build`
- Executed here: `npm run test`, `npm run test:db`, `npx tsc --noEmit` (per verifier brief). `npm run build` **not** run — noted as an open item for the orchestrator.

| Gate | Result | Exit code |
| ---- | ------ | --------- |
| `npm run test` | 42 files, **441 passed, 0 failed, 0 skipped** | **0** |
| `npm run test:db` | 7 files, **82 passed, 0 failed, 0 skipped** | **0** |
| `npx tsc --noEmit` | clean | **0** |

**Test integrity**

| | Files | Tests |
| - | ----- | ----- |
| Before feature (`6e3335e`) | 27 | 246 |
| After feature (`3c6ef5e`) | 42 | 441 |
| Delta | **+15** | **+195** |

`test:db` before: 6 files / 63 tests → after: 7 files / 82 tests (**+19**). No test deleted, none weakened, none skipped (grep for `.skip`/`xit`/`xdescribe` in the feature's test files returns nothing).

**Skipped tests**: none.

---

## Fix Plans (gaps found)

### Fix 1: EDGE-05 is not implemented — dead helper

- **Root cause**: `workspaceStillPresent` (`supabase/functions/_shared/frameio/tokens.ts:47`) has no production caller, so a connection whose stored Frame.io workspace disappeared is never flagged and the UI never offers `Reconectar Frame.io`. Spec traceability already reads `Pending`.
- **Fix task**: wire `workspaceStillPresent` into `frameio-connect`/`frameio-create-structure` (whenever the account's workspace list is fetched) so a missing stored workspace sets `requires_reconnect = true`; add a test asserting the UI shows the reconnect action for that state.
- **Priority**: Major

### Fix 2: 5xx / unreachable retries are not asserted (sensor M1 survived)

- **Root cause**: `runner.test.ts:176-189` asserts the outcome of a 503 but never the retry count; no test throws a status-less error at all.
- **Fix task**: assert `fake.state.delays` for the 5xx path (expect `[350, 1000, 1000, 1000]`), and add one case where the fake throws a plain `Error` (network unreachable) asserting the same retry shape and the honest `failedAt`.
- **Priority**: Major

### Fix 3: `Reconectar Frameio` ≠ spec literal `Reconectar Frame.io`

- **Root cause**: `FrameioConnectionCard.tsx:112` renders `Reconectar Frameio`; the spec (P1-21, Edge case 5) requires `Reconectar Frame.io`. The test pins the deviant string.
- **Fix task**: align the label with the spec (the sibling button already says `Conectar Frame.io`) and update `FrameioConnectionCard.test.tsx:58`.
- **Priority**: Minor

### Fix 4: AUTH-05 "built bundle" conjunct untested

- **Root cause**: the secret scan walks `src/` and `vite.config.ts` only; nothing inspects build output.
- **Fix task**: run `npm run build` in the gate and assert `FRAMEIO_CLIENT_SECRET` is absent from `dist/**`.
- **Priority**: Minor

### Fix 5: EDGE-02 project-name rejection untested

- **Root cause**: `runner.test.ts:34-36` exposes `fail('createProject', …)` but no test uses it.
- **Fix task**: add a case where `createProject` throws `422` with a name-rejection message; assert the message surfaces and `creates`/`listedParents` stay empty (no partial project).
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status         |
| ----------- | --------------- | ------------------ |
| MENU-01…03, AUTH-01…04, AUTH-06…08, STRU-01…07, RETY-01, PROJ-01…12, RATE-01, PART-01/02, EDGE-01, EDGE-03, EDGE-04, EDGE-06 | Verified (as written by author) | ✅ Verified (independently re-derived) |
| AUTH-05 | Verified | ⚠️ Needs Fix (built-bundle conjunct) |
| AUTH-09 | Verified | ⚠️ Needs Fix (action label ≠ spec literal) |
| FAIL-01 | Verified | ⚠️ Needs Fix (retry count unspecified in spec + unasserted) |
| EDGE-02 | Verified | ⚠️ Needs Fix (project-name rejection path untested) |
| EDGE-05 | Pending | ❌ Needs Fix (unimplemented, helper unwired) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 37/42 ACs matched the spec-defined outcome · 1 spec-precision gap · 4 partial · 1 uncovered
**Sensor**: 6 mutations injected, 4 killed, 2 survived
**Gate**: 441 unit + 82 db passed, 0 failed, 0 skipped; `tsc --noEmit` exit 0

**What works**: menu/routing, OAuth state machine, code exchange and single-row-per-workspace persistence, secret isolation from the client, the whole idempotent plan/runner core (throttle ≥350 ms, 401 refresh-once, 429 `Retry-After`/1 s ×3, honest partial results), name builders for all 12 months / 7 weekdays, token-refresh skew, DB schema + zero-policy RLS + admin-only RPC + one-live-run mutex.

**Issues found**: EDGE-05 not implemented (Fix 1); 5xx/unreachable retries unasserted (Fix 2); `Reconectar Frameio` label deviates from spec (Fix 3); built-bundle secret scan missing (Fix 4); project-name rejection untested (Fix 5).

**Next steps**: route Fix 1–5 to the implementer; re-verify (max 3 fix→re-verify iterations). Also run `npm run build` as the last tier of the Build gate.
