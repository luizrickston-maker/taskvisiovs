# project-task-creation-fixes Validation

**Date**: 2026-10-22
**Spec**: `.specs/features/project-task-creation-fixes/spec.md`
**Diff range**: `a654bea..HEAD` (4 commits: `27e01d7`, `69bfb08`, `c53fdc0` code + `bd4dbe9` docs)
**Verifier**: independent sub-agent (author ≠ verifier) — re-derived from `spec.md`; prior worker reports treated as claims and re-tested.

---

## Validation

**Result**: FAIL

# ❌ FAIL

All **15/15 acceptance criteria** are covered by real `file:line` evidence and their asserted
values match the spec-defined outcomes. All three gates are green. All **11** discrimination-sensor
mutations were killed. The user's hard constraint (no retroactive change to existing rows) is
respectfully honoured: **zero** files under `supabase/` were touched.

The verdict is FAIL for **one** reason, and only one:

> **Edge Case 3 is not implemented and has no evidence.** The spec requires that a stage deleted
> while a task form is open must not fail the insert. It does fail — verified empirically, not by
> inference. See [Edge Cases](#edge-cases) and [Fix 1](#fix-1-edge-case-3-is-not-implemented).

Nothing else blocks this feature. 15 ACs, gates, sensor, constraint compliance and scope
discipline are all clean.

---

## Task Completion

There is **no `tasks.md` / `design.md`** for this feature: `spec.md:133` records that
"Design and Tasks phases were skipped for this medium-scope repair, so the ACs are the task list".
The three commits below are therefore the full task list, and the gate commands are the three
named in the dispatch rather than a `tasks.md` Gate Check section.

| Commit  | Scope | Tasks | Status     | Notes                                   |
| ------- | ----- | ----- | ---------- | --------------------------------------- |
| `27e01d7` | PRC — project creation | PRC-01…05 | ✅ Done    | Wizard prop + 2 callers + migration scan |
| `69bfb08` | TSK — assignee/workspace | TSK-01…05 | ✅ Done    | Map-then-validate in both forms          |
| `c53fdc0` | STG — stage field/tab    | STG-01…05 | ✅ Done    | Stage message + `Sem etapa` group         |
| `bd4dbe9` | docs (`STATE.md`)        | —        | ✅ Done    | Not code; excluded from the 3 code commits |

---

## Spec-Anchored Acceptance Criteria

Spec-defined outcome is re-derived from `spec.md` independently of the tests.

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | ------------------------- | -------------------- | ---------------------------------- | ------ |
| PRC-01 | WHEN wizard opened from `/pj/projetos` and created THEN persist `is_corporate = true` | insert payload `is_corporate === true`; PJ page supplies `true` | `src/components/projetos/ProjectWizard.test.tsx:123` — `expect(payload.is_corporate).toBe(true)` · caller `src/pages/PJ/ProjetosClientesPage.test.tsx:84` — `expect(wizardProps.at(-1)?.isCorporate).toBe(true)` · impl `ProjectWizard.tsx:208`, `ProjetosClientesPage.tsx:417` | ✅ PASS |
| PRC-02 | WHEN wizard opened from `/projetos` and created THEN persist `is_corporate = false` | insert payload `is_corporate === false`; dashboard supplies `false` | `src/components/projetos/ProjectWizard.test.tsx:128` — `expect(payload.is_corporate).toBe(false)` · caller `src/pages/ProjetosDashboard.test.tsx:57` — `expect(wizardProps.at(-1)?.isCorporate).toBe(false)` · impl `ProjetosDashboard.tsx:300` | ✅ PASS |
| PRC-03 | WHEN a project is created from `/pj/projetos` THEN include it in `corporateProjects` without a reload | new row appears in the page list after a store write, no remount; `is_corporate === false` rows stay out | `src/pages/PJ/ProjetosClientesPage.test.tsx:103` — `expect(await screen.findByText('Projeto do Cliente')).toBeInTheDocument()` after `act(...setState)` at `:99-101` with no re-render · `:104` — `expect(screen.queryByText('Projeto Pessoal')).not.toBeInTheDocument()` · filter impl `ProjetosClientesPage.tsx:66` (`projects.filter(p => p.is_corporate === true)`) | ✅ PASS |
| PRC-04 | WHERE the wizard creates a project, preserve every other payload field unchanged | full-object equality over all 12 create-payload fields | `src/components/projetos/ProjectWizard.test.tsx:141-154` — `expect(payload).toEqual({ user_id, workspace_id, project, task, project_category_id, priority, status, estimated_time, deadline, assigned_to, client_name, is_corporate })` | ✅ PASS |
| PRC-05 | The system SHALL NOT modify any `projects` row that exists before this change | no migration written by this change touches `projects`; migration set pinned to the one pre-existing offender | `tests/db/no-projects-backfill.test.ts:95` — `expect(offenders).toEqual([PRE_EXISTING_BACKFILL])` · `:98-100` — `expect(applied.find(...PRE_EXISTING_BACKFILL)!.sql).not.toMatch(WRITE_IS_CORPORATE)` · `:104` — `expect(applied.filter(({sql}) => WRITE_IS_CORPORATE.test(sql)).map(f => f.file)).toEqual([])` · Verifier-run: `git diff --name-only a654bea..HEAD -- supabase/` → **0 files** | ✅ PASS (via `SPEC_DEVIATION` — see judgment below) |
| TSK-01 | WHEN assignee field empty and submitted THEN persist `assigned_to = null` | `assigned_to === null` on the inserted row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:176` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null })` · `src/components/projetos/ProjectTaskForm.test.tsx:186-187` — `toMatchObject({ assigned_to: null, workspace_id: WORKSPACE_ID, user_id: 'user-1', title: ... })` | ✅ PASS |
| TSK-02 | WHEN assignee select set to "Nenhum (Somente eu)" THEN persist `assigned_to = null` | `assigned_to === null` on the inserted row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:182,186` — `await chooseOption('Selecione um colaborador (opcional)', 'Nenhum (Somente eu)')` then `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null })` · `src/components/projetos/ProjectTaskForm.test.tsx:197,201` | ✅ PASS |
| TSK-03 | WHEN assignee is neither a valid UUID nor an accepted sentinel THEN refuse and display a visible error | submission refused + a visible error is raised | `src/components/areapj/projetos/ClientTaskForm.test.tsx:211` — `expect(toast.error).toHaveBeenCalledWith(INVALID_ASSIGNEE_ERROR)` · `:218` — `expect(onOpenChange).not.toHaveBeenCalled()` · `src/components/projetos/ProjectTaskForm.test.tsx:223,228` · *message text is **not** specified by the spec* — see gaps | ✅ PASS ⚠️ |
| TSK-04 | WHEN a task is created manually THEN persist `workspace_id` on the row | `workspace_id` present and equal to the resolved workspace | `src/components/areapj/projetos/ClientTaskForm.test.tsx:229-233` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ workspace_id: WORKSPACE_ID, user_id: 'user-1', project_id: PROJECT.id })` · `src/components/projetos/ProjectTaskForm.test.tsx:186-189` | ✅ PASS |
| TSK-05 | WHILE validation fails, the system SHALL NOT send an insert request | exactly 0 insert calls on the refused path | `src/components/areapj/projetos/ClientTaskForm.test.tsx:216` — `expect(insertsFor('project_tasks')).toHaveLength(0)` · `src/components/projetos/ProjectTaskForm.test.tsx:227` | ✅ PASS |
| STG-01 | WHEN the project has stages THEN render a stage selector listing them | a selector is rendered and each stage appears as an option | `src/components/areapj/projetos/ClientTaskForm.test.tsx:255-256` — `expect(await screen.findByRole('option', { name: '1. Briefing' })).toBeInTheDocument()` + `expect(screen.getByRole('option', { name: 'Sem etapa' })).toBeInTheDocument()` · `src/components/projetos/ProjectTaskForm.test.tsx:254-255` | ✅ PASS |
| STG-02 | WHEN the project has no stages THEN render a message stating that, instead of nothing | a message is rendered; the field is **not** silently hidden | `src/components/areapj/projetos/ClientTaskForm.test.tsx:266-269` — `expect(screen.getByText('Este projeto ainda não tem etapas. A tarefa ficará sem etapa.')).toBeInTheDocument()` **and** `expect(screen.queryByText('Sem etapa')).not.toBeInTheDocument()` · `src/components/projetos/ProjectTaskForm.test.tsx:267-270` — same shape with the second form's wording · impl `ClientTaskForm.tsx:259-270`, `ProjectTaskForm.tsx:249-260` | ✅ PASS ⚠️ |
| STG-03 | WHEN a task is created with a stage selected THEN persist that `stage_id` | `stage_id === <selected stage id>` on the inserted row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:280` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: STAGE_ID })` · `src/components/projetos/ProjectTaskForm.test.tsx:283-286` — `toMatchObject({ stage_id: STAGE_ID, project_id: PROJECT.id })` | ✅ PASS |
| STG-04 | WHEN the Etapas tab renders a project's tasks THEN show stageless tasks in an explicit `Sem etapa` group rather than omitting them | a group labelled `Sem etapa` exists and contains the stageless task | `src/pages/ProjectDetailPage.test.tsx:175-176` — `expect(screen.getByText('Sem etapa')).toBeInTheDocument()` + `expect(screen.getByText('Tarefa sem etapa')).toBeInTheDocument()` · `:181-189` repeats it for a project with **zero** stages · impl `ProjectDetailPage.tsx:81-84` (`stagelessTasks`), `:589` | ✅ PASS |
| STG-05 | WHEN a task is created from "Adicionar tarefa nesta etapa" THEN pre-fill that stage in the form | form opens with that stage selected **and** the insert carries it | `src/pages/ProjectDetailPage.test.tsx:200-201` — `expect(within(dialog).getAllByRole('combobox').some(t => t.textContent === '1. Briefing')).toBe(true)` · `:209-212` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: STAGE_ID, project_id: PROJECT.id })` · impl `ProjectDetailPage.tsx:220-224` | ✅ PASS |

**Status**: ✅ **15/15 ACs covered and matching the spec-defined outcome** · ⚠️ **2 spec-precision gaps flagged** (TSK-03, STG-02).

### Spec-precision gaps

| AC | Gap | Handling |
| -- | --- | -------- |
| TSK-03 | The spec demands "a visible error" but defines **no message text**. | Assertion pins `INVALID_ASSIGNEE_ERROR` (`ClientTaskForm.tsx:34`, `ProjectTaskForm.tsx:37`) — an implementation-chosen string. The *behaviour* (refuse + visible error + no insert) is spec-defined and matched, so this is flagged, not failed. |
| STG-02 | The spec demands "a message stating that the project has no stages" but defines **no wording**. | Assertions pin the two literal sentences. Both forms also assert `queryByText('Sem etapa')` is absent, which is the precise "instead of rendering nothing" half. Flagged, not failed. |

**Payload / conjunction rule applied.** Every AC above asserts on the *value of the field that
reaches Postgres* (`toMatchObject` / `toEqual` on the captured insert payload), not merely that a
call occurred. Conjunction requirements (TSK-03 = refuse **and** show an error; STG-02 = message
present **and** field absent; STG-04 = present **and** staged task still rendered in its own card)
are asserted as two separate expectations in the same test, not one.

---

## Independent Judgments

### 1. The `SPEC_DEVIATION` recorded by the worker — **JUSTIFIED**

**Claim under test:** Success Criterion 4 ("the migration set contains no `UPDATE` against
`projects`") does not hold for the *pre-change* migration set, because of a top-level
`UPDATE public.projects` in a migration that predates this feature.

**My independent verification — the claim is TRUE:**

- `supabase/migrations/20260601162729_11b97031-274a-4197-914b-2e357c7266bf.sql:8` reads
  `UPDATE public.projects p` / `SET workspace_id = wm.workspace_id` — a genuine top-level statement
  executed on apply. Read directly, not taken from the report.
- Independent raw scan across all 126 migrations
  (`update\s+(?:only\s+)?(?:public\.)?projects`, case-insensitive, multiline) returns **6** hits:
  1 comment (`20260522000031:1`), 1 real top-level `UPDATE` (`20260601162729:8`), and 4 inside
  `$$ … $$` function bodies (`20260716120000_project_stages.sql:189` between `AS $$` at 133 and
  `$$;` at 198; `20260717000000:229`; `20260718000000:243`; `20260718000100:235`) — which never
  execute on apply. The stripper's "exactly one offender" result is **correct**.
- `git diff --name-only a654bea..HEAD -- supabase/` → **0 files**. This change adds no migration
  and edits none.

**Is the resolution honest, or did it weaken the criterion into meaninglessness? Honest.**
Reasoning:

1. **The criterion as I wrote it was factually wrong**, not merely strict — it asserted a property
   of the *pre-change* corpus that was already false before the first commit of this feature. A
   test asserting it verbatim would fail forever and discriminate nothing.
2. **The replacement is a pinning assertion, not a waiver.** `expect(offenders).toEqual([PRE_EXISTING_BACKFILL])`
   names *exactly one* file. Adding any second migration with a top-level `UPDATE projects` fails
   the test. A waiver would have been `expect(offenders.length).toBeLessThanOrEqual(1)` or a
   comment-based skip; this is neither.
3. **The allowlist is by filename**, not by "any UPDATE that happens not to touch `is_corporate`",
   so it cannot silently absorb a new offender.
4. **Two further assertions tighten beyond the original wording**: no migration may write
   `is_corporate` at all (`:104`), and the one tolerated file specifically must not do so
   (`:98-100`). The original criterion never asked for either.
5. **It is grounded in the user's hard constraint.** Rewriting `20260601162729` would have
   violated *"mantem os que ja existe"*. Not rewriting it, while pinning that no new one appears,
   is the only resolution consistent with both the spec's intent and the user's decision.

**Residual observation (non-blocking):** `stripSql` removes `$$ … $$` bodies, so a *top-level*
`DO $$ BEGIN UPDATE public.projects … END $$;` would be stripped and missed — `DO` blocks execute
on apply. No such construct exists in the current corpus (confirmed by the raw scan above), so the
test is correct today, but the evasion surface exists. Worth a note to whoever next touches
`tests/db/no-projects-backfill.test.ts:32-80`.

### 2. The Radix Select `onValueChange('')` quirk — **CORRECTLY DEFERRED**

**Claim under test:** `onValueChange('')` fires when a controlled `Select`'s value matches no item,
wiping `ClientTaskForm`'s project-derived `assigned_to` prefill to `''` before submit. Pre-existing,
deliberately not fixed.

**I verified the claim empirically** with a throwaway probe in a discarded worktree (two variants,
identical except whether the pre-filled value is one of the select's items):

| Case | `parentProject.assigned_to` | Inserted `assigned_to` |
| ---- | --------------------------- | ---------------------- |
| A — value **is** a valid `SelectItem` | `22222222-2222-4222-8222-222222222222` (the team member) | `22222222-2222-4222-8222-222222222222` — **prefill survived** |
| B — value **is not** among the items | `44444444-4444-4444-8444-444444444444` (not in `corporateTeam`) | `null` — **prefilled value was wiped to `''`, then mapped to `null`** |

The claim is **true**, and precisely conditional: the wipe happens exactly when the controlled value
matches no `SelectItem`. Structure confirms it — `ClientTaskForm.tsx:445` `value={formData.assigned_to}`
is fed by `:101` `assigned_to: parentProject?.assigned_to || ''`, and the item set at `:451-455` is
only `corporateTeam` members plus `'none'`. A project's `assigned_to` is the owner's user id, so in
the realistic case it matches nothing and is wiped.

**Scope judgment: correctly deferred.** Reasons:

- It is **not one of the 15 ACs** and not among the three named defects in the Problem Statement.
- It is **pre-existing** at `ClientTaskForm.tsx:445`/`:101`, outside the diff surface — none of the
  three commits introduced it.
- It did **not cause a regression**. Before this fix the `''` produced by the wipe was rejected by
  zod, so the entire submit failed; the prefill loss was unobservable because nothing worked. The
  fix makes the path behave exactly as the spec prescribes (`''` → `null`, TSK-01). The fix is not
  what removes the prefill — Radix is.
- Fixing it requires a design change to the select's value model (e.g. representing "absent" as
  `undefined` rather than `''`, or adding the project assignee as an item), which would be scope
  creep against a spec that enumerates its scope explicitly.

**One process note:** unlike `BriefingReviewPage.tsx` and `CloseProspectModal.tsx`, this defect was
**not** recorded as a `PENDING` in `.specs/STATE.md` during this work. It should be — same treatment
as the other two deferred findings.

---

## Discrimination Sensor

**Sensor depth**: expanded (11 behaviour-level mutations; dispatch minimum was 7).
**Isolation**: temporary `git worktree add --detach` at `…\AppData\Local\Temp\tlc-sensor-1039`,
`node_modules` attached as a **junction**, all faults applied there only. `git stash` was **never**
used. Each mutant was reverted with `git checkout -- <file>` *inside the worktree* and the revert
was asserted by content comparison.

**10 of 11 mutations target code written by the three commits** (dispatch minimum was 4);
M8/M10 target `ProjectDetailPage.tsx` from `c53fdc0`, M3/M4 the caller lines from `27e01d7`.
The three specifically required mutations — hardcoded `is_corporate` (M1), validation reordered
before mapping (M5, M9), and restored `return null` in the stage picker (M6, M11) — are all present.

| # | File:line | Fault injected | Killed? | Killing assertion |
| - | --------- | -------------- | ------- | ----------------- |
| M1 | `src/components/projetos/ProjectWizard.tsx:208` | `is_corporate: isCorporate` → **`is_corporate: true`** (hardcoded — the exact failure mode the spec forbids) | ✅ Killed | 2 failed / 7 — `ProjectWizard.test.tsx` *"persists is_corporate = false … (PRC-02)"*, *"defaults to false when the caller passes no prop (Edge Case)"* |
| M2 | `src/components/projetos/ProjectWizard.tsx:208` | **delete** `is_corporate` from the payload (reproduce the original defect) | ✅ Killed | 4 failed / 4 — PRC-01, PRC-02, Edge Case, PRC-04 *"sends every other field … exactly as before"* |
| M3 | `src/pages/PJ/ProjetosClientesPage.tsx:417` | **remove** the `isCorporate` prop from the PJ page | ✅ Killed | 1 failed / 2 — `ProjetosClientesPage.test.tsx` *"mounts the wizard as a corporate creator"* |
| M4 | `src/pages/ProjetosDashboard.tsx:300` | `isCorporate={false}` → **`{true}`** (the `corporate_count` corruption path) | ✅ Killed | 1 failed / 1 — `ProjetosDashboard.test.tsx` *"mounts the wizard as a personal (non corporate) creator"* |
| M5 | `src/components/areapj/projetos/ClientTaskForm.tsx:121-125` | **reorder: validate the raw form state before mapping** — `taskSchema.safeParse(formData)` (reproduces the original blocking defect) | ✅ Killed | 5 failed / 9 — TSK-01, TSK-02, TSK-04 *"persists workspace_id"*, EC *"refuses when workspace cannot be resolved"*, +1 |
| M6 | `src/components/areapj/projetos/ClientTaskForm.tsx:259-270` | **restore `return null`** in the stage picker | ✅ Killed | 1 failed / 9 — *"states that the project has no stages instead of hiding the field (STG-02)"* |
| M7 | `src/components/areapj/projetos/ClientTaskForm.tsx:157` | **delete** `...(workspaceId ? { workspace_id: workspaceId } : {})` | ✅ Killed | 1 failed / 9 — *"persists workspace_id on the created row"* |
| M8 | `src/pages/ProjectDetailPage.tsx:82` | `tasks.filter(t => !t.stage_id)` → `tasks.filter(() => false)` (restore the omission) | ✅ Killed | 2 failed / 3 — both STG-04 tests, incl. *"reaches the stageless tasks of a project that has no stages at all"* |
| M9 | `src/components/projetos/ProjectTaskForm.tsx:99` | **reorder: validate the raw `assignedTo`** — `if (!UUID_PATTERN.test(assignedTo))`, rejecting both sentinels | ✅ Killed | 4 failed / 8 — TSK-01, TSK-02, EC workspace resolution, STG-03 |
| M10 | `src/pages/ProjectDetailPage.tsx:221` | `setDefaultStageId(stageId)` → **`null`** (break the STG-05 prefill) | ✅ Killed | 1 failed / 3 — *"pre-fills that stage in the task form and persists it on the insert"* |
| M11 | `src/components/projetos/ProjectTaskForm.tsx:249-260` | **restore `return null`** in the stage picker | ✅ Killed | 1 failed / 8 — *"states that the project has no stages instead of hiding the field (STG-02)"* |

**Result: 11/11 killed, 0 survived.** No fix tasks required from the sensor.

**Harness incident, recorded for transparency.** The first harness run died mid-loop on a Windows
`FileNotFoundError` (`npx` is `npx.cmd`), which left `ProjectWizard.tsx` pre-mutated inside the
worktree; M1/M2 consequently reported `ANCHOR-FAIL` on the second pass. I restored the file, confirmed
the anchor, and re-ran M1/M2 as a dedicated pass with `shell=True`. Both were then killed, as shown
above. Every mutation in the table was observed executed against a clean ancestor.

### Isolation verification

| Check | Pre-sensor | Post-sensor |
| ----- | ---------- | ----------- |
| `git status --porcelain` (real tree) | `?? .agents/` `?? .claude/` `?? .cursor/` `?? .windsurf/` | `?? .agents/` `?? .claude/` `?? .cursor/` `?? .windsurf/` — **identical** |
| `git rev-parse HEAD` | `bd4dbe906dc0de71982e0667fa996826419697f6` | `bd4dbe9…` — unchanged |
| `git diff --stat HEAD` | (clean) | (empty) — `.specs/` byte-identical to `HEAD` |
| `git worktree list` | 1 worktree (real) | 1 worktree (real) — both scratches removed |
| real `node_modules` entry count across junction removal | 449 | 449 — untouched |

> **Baseline note:** the dispatch expected ` M .specs/STATE.md` in the pre-sensor baseline. It was
> **not** there: commit `bd4dbe9` had already committed it before I started, so my captured baseline
> was the four untracked skill dirs only. The invariant that matters — porcelain unchanged across
> all sensor work — holds against the baseline *I actually recorded*.

---

## Edge Cases

| # | Edge case (verbatim from `spec.md:103-107`) | Evidence | Result |
| - | ------------------------------------------- | -------- | ------ |
| 1 | IF the wizard is mounted from a page that passes no `is_corporate` prop, THEN default to `false` | `src/components/projetos/ProjectWizard.test.tsx:132-133` — `const payload = await createProjectFrom(undefined); expect(payload.is_corporate).toBe(false)` · default at `ProjectWizard.tsx:46` (`isCorporate = false`) | ✅ Handled |
| 2 | IF `workspace_id` cannot be resolved at insert time, THEN refuse with a visible error rather than writing an unreadable row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:243-245` — `expect(toast.error).toHaveBeenCalledWith('Não foi possível identificar seu workspace.')` **and** `expect(insertsFor('project_tasks')).toHaveLength(0)` · `src/components/projetos/ProjectTaskForm.test.tsx:240-242` | ✅ Handled ⚠️ *(error text not specified by spec)* |
| 3 | IF a stage is deleted while a task form is open, THEN the system SHALL **not fail the insert** — `stage_id` is `ON DELETE SET NULL` | **No committed test. No implementation.** See below. | ❌ **NOT handled** |
| 4 | IF the stage list in the store has not loaded yet, THEN show the no-stages message rather than silently hiding the field | Same code path as an empty list — `ClientTaskForm.tsx:259` / `ProjectTaskForm.tsx:249` branch on `projectStagesList.length === 0`, and `projectStages: []` in the store *is* the unloaded state. Asserted at `ClientTaskForm.test.tsx:266-269` (`seed()` with `stages = []`) and `ProjectTaskForm.test.tsx:267-270` | ✅ Handled |
| 5 | WHEN the assignee select holds a real UUID, THEN pass it through unchanged | `src/components/areapj/projetos/ClientTaskForm.test.tsx:196` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: MEMBER_USER_ID })` · `src/components/projetos/ProjectTaskForm.test.tsx:211` | ✅ Handled |

**Score: 4/5 handled with evidence. Edge Case 3 is not handled.**

### Edge Case 3 — evidence (searched, then measured)

**Search results (all negative — no handling exists):**

- No test in the repository references deleting a stage while a form is open:
  `grep -rn "SET NULL" tests/` → 0 hits; no test file mentions stage deletion.
- No client-side guard on `stage_id` before insert — both forms send it verbatim:
  - `src/components/areapj/projetos/ClientTaskForm.tsx:155` — `stage_id: formData.stage_id || null`
  - `src/components/projetos/ProjectTaskForm.tsx:115` — `stage_id: stageId || null`
- Nothing resets an open form when its stage is deleted:
  `src/pages/ProjectDetailPage.tsx:194-203` (`handleDeleteStage`) only deletes the row and calls
  `deleteProjectStage(stageId)`; it never touches `taskFormOpen`, `defaultStageId`, or the form's
  `formData`. The `useEffect` that would re-seed the form is keyed on
  `[task, open, parentProject?.assigned_to, defaultStageId]` (`ClientTaskForm.tsx:107`) — no stage list.
- The relevant DDL is `supabase/migrations/20260716120000_project_stages.sql:55`:
  `stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL`, added once and never
  relaxed.

**Measured behaviour** (throwaway probe in a discarded worktree — not committed, which is itself
the point: there is no committed test for this case):

```
EC3-CONTROL stage_id = "33333333-3333-4333-8333-333333333333"   (control: stage present)
EC3-AFTER-DELETE trigger text = "1. Briefing"                    (stale id survives the deletion)
EC3-PROBE inserts = 1  payload = {... "stage_id":"33333333-..." ...}   (dangling id is submitted)
EC3-PROBE toast.error calls = 1 [["Erro ao salvar tarefa"]]      (the insert fails)
```

**Method, stated precisely so the evidence can be re-read honestly.** The probe runs in Vitest against
a *mocked* Supabase client, which has no database behind it — so I injected the FK response
(`{ code: '23503', message: 'violates foreign key constraint' }`) that a real Postgres returns for this
statement, rather than producing it by executing SQL. Two things follow, and only two:

- **What the probe proves directly, without any modelling**: the client submits the dangling
  `stage_id` verbatim and performs the insert (the `inserts = 1` / payload line). No code anywhere
  in the diff prevents this — that is a pure code-reading result, and it alone already means the
  system has no mechanism satisfying "SHALL not fail the insert".
- **What is assumed**: that Postgres rejects it. That rests on the DDL actually in the repo
  (`supabase/migrations/20260716120000_project_stages.sql:55`, a plain `ADD COLUMN … REFERENCES …`,
  created `VALID` — not `NOT VALID`), plus standard FK semantics. I did **not** execute this against
  the live `npm run test:db` harness; doing so would have required committing a new test file, which
  the Verifier is forbidden to do.

I first checked whether the same Radix behaviour that wipes `assigned_to` might rescue this case by
resetting the stale stage value. It does **not**: unlike on mount, the stage trigger still reads
`"1. Briefing"` after the item disappears, so the dangling id goes straight to Postgres.

**The spec's stated rationale is incorrect.** `ON DELETE SET NULL` nulls the column on rows that
*already exist* when the referenced stage is deleted. It does **not** let a *pending* insert
reference a row that no longer exists — that insert raises FK `23503` (23503). The em-dash clause at
`spec.md:105` therefore does not deliver the outcome the same sentence requires.

**Scope note:** this edge case is untouched by `a654bea..HEAD` — the behaviour is identical before
and after the three commits. It is nonetheless an explicitly listed requirement of this spec with no
evidence, so it is reported rather than waived.

---

## Gate Check

- **Gate commands** (no `tasks.md` exists; these are the three named in the dispatch):
  1. `npm run test`
  2. `npm run test:db`
  3. `npx tsc --noEmit`
- **Executed**: all three, sequentially, in one run against the unmodified working tree
  (`01:29:53`–`01:30:1x`), **before** any sensor work. The real tree was unchanged afterwards
  (porcelain identical), so these results still stand.

| Gate | Result | Exit code |
| ---- | ------ | --------- |
| `npm run test` | **188 passed**, 0 failed, 0 skipped — 26 test files | **0** |
| `npm run test:db` | **63 passed**, 0 failed, 0 skipped — 6 test files | **0** |
| `npx tsc --noEmit` | no output (clean) | **0** |

All three match the counts reported by the worker (188 / 63 / 0), independently re-derived.

- **Test count before feature**: 161 unit + 61 db (`.specs/STATE.md:79`, pre-feature baseline)
- **Test count after feature**: 188 unit + 63 db
- **Delta**: **+27 unit, +2 db = +29** — exactly the 29 tests in the 7 new test files:
  `ProjectWizard.test.tsx` 4 · `ClientTaskForm.test.tsx` 9 · `ProjectTaskForm.test.tsx` 8 ·
  `ProjectDetailPage.test.tsx` 3 · `ProjetosClientesPage.test.tsx` 2 · `no-projects-backfill.test.ts` 2 ·
  `ProjetosDashboard.test.tsx` 1.
- **Tests deleted**: **0** (`git diff --diff-filter=D --name-only a654bea..HEAD` → empty).
- **Assertions weakened**: none — every one of the 29 is new; no pre-existing assertion was touched.
- **Failures / skips**: none.

---

## Code Quality

| Principle | Status | Note |
| --------- | ------ | ---- |
| No features beyond what was asked | ✅ | Every changed file maps to an AC or an edge case |
| No abstractions for single-use code | ✅ | `renderStageTask` (`ProjectDetailPage.tsx:226`) is extracted because it is used **twice** — stage cards and the new `Sem etapa` card. Without it the 65-line renderer would be duplicated |
| No unnecessary "flexibility" added | ✅ | One optional prop (`isCorporate`) with a documented default; no config surfaces |
| Only touched files required for task | ✅ | 6 source files + 7 test files + spec/STATE. Nothing else |
| Didn't "improve" unrelated code | ✅ | The only incidental change is `toast.error((validation.error as any).errors[0].message)` → `.issues[0]` at `ClientTaskForm.tsx:127`, on a line already being rewritten; removes an `any` cast rather than changing behaviour |
| Matches existing patterns/style | ⚠️ | Two forms now encode "valid UUID" twice: `ClientTaskForm.tsx:44` uses zod `.uuid()`, `ProjectTaskForm.tsx:39` uses a hand-rolled `UUID_PATTERN`. They accept slightly different sets (the hand-rolled form explicitly allows the nil and max UUIDs). Both satisfy TSK-03, and `ProjectTaskForm` had no schema at all before, so importing zod there would be a larger change — but it is a duplicated rule worth consolidating |
| Would a senior engineer approve? | ✅ | Yes — surgical, commented in the project's Portuguese comment style, no dead code |
| Tests map to ACs and are non-shallow | ✅ | Spot-checked PRC-04: `toEqual` over the whole 12-field payload, driven through all three wizard steps, asserting the object that reaches Postgres — not component state |
| Spec-anchored outcome check | ✅ | 15/15 asserted values match `spec.md`; 2 string-level precision gaps flagged |
| Per-layer coverage expectation | ✅ | Domain/unit: 1:1 AC→test mapping across both form implementations; DB layer: `no-projects-backfill.test.ts` for PRC-05/SC4. No route/e2e layer exists in this repo for these UI flows (see `STATE.md` AD-004) |
| Every test in scope maps to an AC / edge case / Done-when | ✅ | 29/29 claimed in test-file header comments; 0 unclaimed tests found |
| Documented project quality/testing guidelines followed | ✅ | `references/coding-principles.md` (skill) + `.specs/STATE.md` AD-004 (Vitest harness) and AD-005 (db harness). `npm run lint` was **not** part of this feature's gate set; STATE.md:77 tracks lint debt separately (202 pre-existing) |

---

## Requirement Traceability

`spec.md`'s Status column already read `Verified` for all 15 ACs **before** this Verifier ran — it
was set by the author during Execute, not by an independent check. I did not edit `spec.md`
(the Verifier is read-only except for this report). Statuses **re-derived here**:

| Requirement | `spec.md` says | Verifier status |
| ----------- | -------------- | --------------- |
| PRC-01…05 | Verified | ✅ Verified (PRC-05 via justified `SPEC_DEVIATION`) |
| TSK-01…05 | Verified | ✅ Verified (TSK-03 ⚠️ precision gap on message text) |
| STG-01…05 | Verified | ✅ Verified (STG-02 ⚠️ precision gap on wording) |
| Edge Case 1 | listed | ✅ Verified |
| Edge Case 2 | listed | ✅ Verified (⚠️ message text undefined) |
| **Edge Case 3** | listed | ❌ **Needs Fix** |
| Edge Case 4 | listed | ✅ Verified |
| Edge Case 5 | listed | ✅ Verified |
| Success Criterion 1 | `[x]` | ✅ Verified (PRC-01 + PRC-03) |
| Success Criterion 2 | `[x]` | ✅ Verified (TSK-01/02 + TSK-03) |
| Success Criterion 3 | `[x]` | ✅ Verified (STG-04) |
| Success Criterion 4 | `[x]` + `SPEC_DEVIATION` | ✅ Verified — deviation judged honest (§1) |

---

## Fix Plans

### Fix 1: Edge Case 3 is not implemented

- **Root cause**: `spec.md:105` claims `ON DELETE SET NULL` makes a pending insert safe. It does not —
  that clause only nulls rows that already exist at deletion time; a *pending* insert of the same
  dangling key still violates the FK at `supabase/migrations/20260716120000_project_stages.sql:55`.
  Neither form checks the id against the live stage list before inserting
  (`ClientTaskForm.tsx:155`, `ProjectTaskForm.tsx:115`), and nothing resets an open form when its
  stage is deleted (`ProjectDetailPage.tsx:194-203`). The probe shows the client sending the dangling
  id and taking the error path (`toast.error('Erro ao salvar tarefa')`); see the method note above
  for exactly which half of that is measured versus modelled.
- **Two acceptable resolutions — the orchestrator/user must choose, the Verifier may not edit `spec.md`:**
  - **(a) Implement it** — before insert, drop `stage_id` when it is no longer present in the
    project's stages (equivalently: render the existing "no stages"/stale-stage message and null the
    field). Touches `ClientTaskForm.tsx:155` and `ProjectTaskForm.tsx:115`. Add a test that empties
    `projectStages` after selection and asserts the insert still succeeds.
  - **(b) Correct the spec** — if the intended guarantee really is only "an *existing* task keeps
    `stage_id = NULL` when its stage is deleted" (which `ON DELETE SET NULL` does provide), then
    `spec.md:105` should say that instead, and the edge case closes as already-satisfied.
- **Verify**: a test that deletes the stage from the store while the form is open, submits, and
  asserts **1 insert with `stage_id: null`** (option a) — or a corrected `spec.md:105` (option b).
- **Priority**: **Minor** — it is one of five edge cases, requires a race (stage deleted during an
  open form), and is unchanged by `a654bea..HEAD`. It is not blocking any of the 15 ACs, and the
  two reported production defects are fully fixed. It is blocking only because the spec lists it as
  a requirement and the evidence is zero.

### Non-blocking observations (no fix task opened)

1. **Record the Radix `onValueChange('')` quirk as a `PENDING` in `.specs/STATE.md`** — the two other
   deferred defects from this investigation were logged there; this third one was not (§2).
2. **Consolidate the duplicate UUID rule** across `ClientTaskForm.tsx:44` (zod) and
   `ProjectTaskForm.tsx:39` (regex) — they accept slightly different sets.
3. **Harden `stripSql` against `DO $$ … $$;`** in `tests/db/no-projects-backfill.test.ts:32-80` —
   such a block executes on apply but is currently stripped before the scan (§1).

---

## Interactive UAT

Not performed. This Verifier is a sub-agent with no interactive channel to the user, and the
feature's observable behaviour is fully specified by the 15 ACs, all of which are exercised by
committed tests plus an 11-mutation sensor. If the orchestrator wants human sign-off on the UI
messages (the two ⚠️ precision gaps — the exact wording of the "no stages" sentence and the invalid
assignee error), that is a short interactive pass over the two forms and the Etapas tab.

---

## Summary

**Overall**: ❌ **Not Ready** — one spec'd edge case is unimplemented and untested.

**Spec-anchored check**: **15/15 ACs matched spec-defined outcome** · **2 spec-precision gaps flagged**
(TSK-03, STG-02 — exact message wording undefined by spec; behaviour itself matched)
**Edge cases**: **4/5** (EC3 not handled — no evidence, empirically disproven)
**Gate**: 188 passed / 63 passed / tsc exit 0 — **all exit 0**, 0 failed, 0 skipped, +29 tests, 0 deleted
**Sensor**: **11 injected, 11 killed, 0 survived**
**SPEC_DEVIATION**: **justified** — pinned to exactly one pre-existing file + a blanket `is_corporate` ban; the original criterion was factually false of the pre-change corpus
**Radix quirk**: **correctly deferred** — pre-existing, outside the 15 ACs, outside the diff surface; claim verified empirically. Should be logged as a `PENDING`.
**Constraint**: **respected** — 0 files under `supabase/` touched, 0 migrations added or modified, no existing `projects` row modified; the wizard's *edit* path deliberately omits `is_corporate`, so editing a legacy row leaves it `false`.

**What works** — the two reported production defects are genuinely fixed:
- Projects created from `/pj/projetos` now persist `is_corporate = true` and appear on that page
  immediately; `/projetos` still creates `false` rows, so `corporate_count` is safe.
- Manual task creation works with `''` and `'none'` sentinels, carries `workspace_id`, refuses a
  malformed assignee visibly without sending an insert, explains an empty stage list instead of
  hiding the field, and surfaces stageless tasks in a `Sem etapa` group on the Etapas tab.

**Issues found**:
1. Edge Case 3 (`spec.md:105`) — not implemented, no test, and the spec's `ON DELETE SET NULL`
   rationale does not produce the stated outcome. → **Fix 1**, Minor.

**Next steps**: route Fix 1 to an implementer as a single fix task (choose resolution (a) or (b)
with the user first), then re-dispatch the Verifier. This is iteration 1 of the bounded 3.
