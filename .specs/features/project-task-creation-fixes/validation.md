# project-task-creation-fixes Validation

**Date**: 2026-10-22
**Spec**: `.specs/features/project-task-creation-fixes/spec.md`
**Diff range**: `a654bea..HEAD` — **6 commits** (`git log --oneline a654bea..HEAD`):
`27e01d7` (PRC), `69bfb08` (TSK), `c53fdc0` (STG), `bd4dbe9` (docs: STATE agenda), `8d79987`
(docs: spec rationale + round-1 report), `65fe1ad` (Edge Case 3 guard).
The dispatch listed 5; the range actually contains 6 — `bd4dbe9` is a docs-only commit that sits
between `c53fdc0` and `8d79987`. No code, no test, no `supabase/` file.
**Verifier**: independent sub-agent, **round 2**, distinct from the round-1 Verifier and from the author. Re-derived from `spec.md`; round 1's report treated as a set of claims and re-tested.

---

## Validation

**Result**: PASS

# ✅ PASS

Round 1 failed on exactly one gap — **Edge Case 3 unimplemented and untested**. That gap is now
**closed**. Commit `8d79987` corrects the spec's false `ON DELETE SET NULL` rationale and `65fe1ad`
implements the guard in both task forms with two committed tests each. Round 2 independently
re-derived **15/15 ACs** and **5/5 Edge Cases** with real `file:line` evidence, re-ran all three
gates, and ran **12 own mutations — 12 killed, 0 survived**. Round 1's other conclusions
(SPEC_DEVIATION justified, Radix quirk correctly deferred) were re-verified from source, not inherited.

**Hard constraint honoured**: `git diff --name-only a654bea..HEAD -- supabase/` → **empty**.
No migration added, none modified, no existing `projects` row touched.

---

## Task Completion

There is **no `tasks.md` / `design.md`**: `spec.md:133` records "Design and Tasks phases were skipped
for this medium-scope repair, so the ACs are the task list". The six commits below are the task list.

| Commit  | Scope | ACs | Status | Notes |
| ------- | ----- | --- | ------ | ----- |
| `27e01d7` | PRC — project creation | PRC-01…05 | ✅ Done | `isCorporate` prop + 2 callers + migration scan |
| `69bfb08` | TSK — assignee / workspace | TSK-01…05 | ✅ Done | Map-then-validate in both forms; `workspace_id` |
| `c53fdc0` | STG — stage field / tab | STG-01…05 | ✅ Done | No-stages message + `Sem etapa` group |
| `bd4dbe9` | docs (`STATE.md`) | — | ✅ Done | Not code |
| `8d79987` | docs (`spec.md:105` + `STATE.md` + `LESSONS.md`) | EC3 | ✅ Done | Corrected the EC3 rationale; logged 2 PENDings |
| `65fe1ad` | EC3 guard | EC3 | ✅ Done | `stageStillExists` in both forms + 4 tests |

---

## Spec-Anchored Acceptance Criteria

Spec-defined outcome re-derived from `spec.md` independently of the tests. Line numbers are against
**HEAD** (`65fe1ad`) and were read from the files, not copied from round 1. Only
`ClientTaskForm.test.tsx` shifted since round 1's report: `65fe1ad` inserted 3 comment lines at
`:14-16`, so everything after `:13` moves by +3. The 4 comment lines `65fe1ad` added to
`ProjectTaskForm.test.tsx` sit at `:289-292`, after all its cited assertions, so those are unchanged.

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | ------------------------- | -------------------- | ---------------------------------- | ------ |
| PRC-01 | WHEN wizard opened from `/pj/projetos` and created THEN persist `is_corporate = true` | insert payload `is_corporate === true`; PJ page supplies `true` | `src/components/projetos/ProjectWizard.test.tsx:123` — `expect(payload.is_corporate).toBe(true)` · caller `src/pages/PJ/ProjetosClientesPage.test.tsx:84` — `expect(wizardProps.at(-1)?.isCorporate).toBe(true)` · impl `ProjectWizard.tsx:208` (`is_corporate: isCorporate`), caller `ProjetosClientesPage.tsx:417` (`isCorporate`) | ✅ PASS |
| PRC-02 | WHEN wizard opened from `/projetos` and created THEN persist `is_corporate = false` | insert payload `is_corporate === false`; dashboard supplies `false` | `src/components/projetos/ProjectWizard.test.tsx:128` — `expect(payload.is_corporate).toBe(false)` · caller `src/pages/ProjetosDashboard.test.tsx:57` — `expect(wizardProps.at(-1)?.isCorporate).toBe(false)` · impl `ProjetosDashboard.tsx:300` (`isCorporate={false}`) | ✅ PASS |
| PRC-03 | WHEN a project is created from `/pj/projetos` THEN include it in `corporateProjects` without a reload | new row appears in the page list from a store write alone; `is_corporate === false` rows stay out | `src/pages/PJ/ProjetosClientesPage.test.tsx:103` — `expect(await screen.findByText('Projeto do Cliente')).toBeInTheDocument()` after `act(...setState)` at `:99-101` with **no re-render / no reload** · `:104` — `expect(screen.queryByText('Projeto Pessoal')).not.toBeInTheDocument()` · filter impl `ProjetosClientesPage.tsx:66` (`projects.filter(p => p.is_corporate === true)`) | ✅ PASS |
| PRC-04 | WHERE the wizard creates a project, preserve every other payload field unchanged | full-object equality over every field of the create payload | `src/components/projetos/ProjectWizard.test.tsx:141-154` — `expect(payload).toEqual({ user_id, workspace_id, project, task, project_category_id, priority, status, estimated_time, deadline, assigned_to, client_name, is_corporate })` | ✅ PASS |
| PRC-05 | The system SHALL NOT modify any `projects` row that exists before this change | no migration written by this change touches `projects`; the migration set contains no top-level `UPDATE projects` beyond the one pre-existing backfill | `tests/db/no-projects-backfill.test.ts:95` — `expect(offenders).toEqual([PRE_EXISTING_BACKFILL])` · `:98-100` — `expect(applied.find(...PRE_EXISTING_BACKFILL)!.sql).not.toMatch(WRITE_IS_CORPORATE)` · `:104-106` — `expect(applied.filter(({sql}) => WRITE_IS_CORPORATE.test(sql)).map(f => f.file)).toEqual([])` · Verifier-run `git diff --name-only a654bea..HEAD -- supabase/` → **0 files** | ✅ PASS (via justified `SPEC_DEVIATION`, §Judgments) |
| TSK-01 | WHEN assignee field empty and submitted THEN persist `assigned_to = null` | `assigned_to === null` on the row that reaches Postgres | `src/components/areapj/projetos/ClientTaskForm.test.tsx:179` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null })` · `src/components/projetos/ProjectTaskForm.test.tsx:186-191` — `toMatchObject({ assigned_to: null, workspace_id: WORKSPACE_ID, user_id: 'user-1', title: 'Implementar autenticação' })` | ✅ PASS |
| TSK-02 | WHEN assignee select set to "Nenhum (Somente eu)" THEN persist `assigned_to = null` | `assigned_to === null` on the inserted row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:185` — `await chooseOption('Selecione um colaborador (opcional)', 'Nenhum (Somente eu)')`, then `:189` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null })` · `src/components/projetos/ProjectTaskForm.test.tsx:197,201` — same for `'Ninguém (Apenas eu)'` | ✅ PASS |
| TSK-03 | WHEN assignee is neither a valid UUID nor an accepted sentinel THEN refuse and display a visible error | submission refused **and** a visible error raised **and** no insert | `src/components/areapj/projetos/ClientTaskForm.test.tsx:214` — `expect(toast.error).toHaveBeenCalledWith(INVALID_ASSIGNEE_ERROR)` · `:219` — `expect(insertsFor('project_tasks')).toHaveLength(0)` · `:221` — `expect(onOpenChange).not.toHaveBeenCalled()` · `src/components/projetos/ProjectTaskForm.test.tsx:223,227,228` (same three) | ✅ PASS ⚠️ |
| TSK-04 | WHEN a task is created manually THEN persist `workspace_id` on the row | `workspace_id` present and equal to the resolved workspace | `src/components/areapj/projetos/ClientTaskForm.test.tsx:232-236` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ workspace_id: WORKSPACE_ID, user_id: 'user-1', project_id: PROJECT.id })` · `src/components/projetos/ProjectTaskForm.test.tsx:186-191` | ✅ PASS |
| TSK-05 | WHILE validation fails, the system SHALL NOT send an insert request | exactly 0 insert calls on the refused path | `src/components/areapj/projetos/ClientTaskForm.test.tsx:219` — `expect(insertsFor('project_tasks')).toHaveLength(0)` · `src/components/projetos/ProjectTaskForm.test.tsx:227` | ✅ PASS |
| STG-01 | WHEN the project has stages THEN render a stage selector listing them | a selector is rendered and each stage appears as an option | `src/components/areapj/projetos/ClientTaskForm.test.tsx:258-259` — `expect(await screen.findByRole('option', { name: '1. Briefing' })).toBeInTheDocument()` **and** `expect(screen.getByRole('option', { name: 'Sem etapa' })).toBeInTheDocument()` · `src/components/projetos/ProjectTaskForm.test.tsx:254-255` (same two) | ✅ PASS |
| STG-02 | WHEN the project has no stages THEN render a message stating that, instead of nothing | a message stating the project has no stages is rendered **and** the field is not silently hidden | `src/components/areapj/projetos/ClientTaskForm.test.tsx:269-272` — `expect(screen.getByText('Este projeto ainda não tem etapas. A tarefa ficará sem etapa.')).toBeInTheDocument()` **and** `expect(screen.queryByText('Sem etapa')).not.toBeInTheDocument()` · `src/components/projetos/ProjectTaskForm.test.tsx:267-270` — same shape with that form's wording · impl `ClientTaskForm.tsx:268-277`, `ProjectTaskForm.tsx:257-266` | ✅ PASS ⚠️ |
| STG-03 | WHEN a task is created with a stage selected THEN persist that `stage_id` | `stage_id === <selected stage id>` on the inserted row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:283` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: STAGE_ID })` · `src/components/projetos/ProjectTaskForm.test.tsx:283-286` — `toMatchObject({ stage_id: STAGE_ID, project_id: PROJECT.id })` | ✅ PASS |
| STG-04 | WHEN the Etapas tab renders a project's tasks THEN show stageless tasks in an explicit `Sem etapa` group rather than omitting them | a group labelled `Sem etapa` exists and contains the stageless task | `src/pages/ProjectDetailPage.test.tsx:175-176` — `expect(screen.getByText('Sem etapa')).toBeInTheDocument()` **and** `expect(screen.getByText('Tarefa sem etapa')).toBeInTheDocument()` · `:181-189` repeats it for a project with **zero** stages · impl `ProjectDetailPage.tsx:81-84` (`stagelessTasks = tasks.filter(t => !t.stage_id)`), `:589` | ✅ PASS |
| STG-05 | WHEN a task is created from "Adicionar tarefa nesta etapa" THEN pre-fill that stage in the form | the form opens with that stage selected **and** the insert carries it | `src/pages/ProjectDetailPage.test.tsx:199-201` — `expect(within(dialog).getAllByRole('combobox').some(t => t.textContent === '1. Briefing')).toBe(true)` · `:209-212` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: STAGE_ID, project_id: PROJECT.id })` · impl `ProjectDetailPage.tsx:220-224` | ✅ PASS |

**Status**: ✅ **15/15 ACs covered, asserted values match the spec-defined outcome** ·
⚠️ **2 spec-precision gaps flagged** (TSK-03, STG-02) — behaviour matched, message wording undefined by spec.

### Spec-precision gaps

| AC | Gap | Handling |
| -- | --- | -------- |
| TSK-03 | The spec demands "a visible error" but defines **no message text**. | Both tests also pin the literal (`:216-218`, `:224-226`), an implementation-chosen string. The *behaviour* (refuse + visible error + no insert + dialog stays open) is spec-defined and fully asserted, so this is flagged, not failed. |
| STG-02 | The spec demands "a message stating that the project has no stages" but defines **no wording**. | The two forms use different sentences; each test pins its own. Both also assert `queryByText('Sem etapa')` is absent — the precise "instead of rendering nothing" half. Flagged, not failed. |

**Payload / conjunction rule applied.** Every AC asserts on the *value of the field that reaches
Postgres* (`toMatchObject` / `toEqual` over the captured insert payload), never merely that a call
occurred. Each conjunction requirement (TSK-03 = refuse **and** error **and** no insert; STG-02 =
message present **and** field absent; STG-04 = stageless present **and** staged task still in its own
card; EC3 = insert succeeds **and** `stage_id` null **and** no error toast) is asserted as separate
expectations inside the same test.

---

## Edge Cases

Judged against the **current** `spec.md:103-107`, including the reworded Edge Case 3.

| # | Edge case (verbatim) | Evidence | Result |
| - | -------------------- | -------- | ------ |
| 1 | IF the wizard is mounted from a page that passes no `is_corporate` prop, THEN the system SHALL default to `false` | `src/components/projetos/ProjectWizard.test.tsx:132-134` — `const payload = await createProjectFrom(undefined); expect(payload.is_corporate).toBe(false)` · default at `ProjectWizard.tsx:46` (`isCorporate = false`) | ✅ Handled |
| 2 | IF `workspace_id` cannot be resolved at insert time, THEN refuse the submission with a visible error rather than writing an unreadable row | `src/components/areapj/projetos/ClientTaskForm.test.tsx:245-248` — `expect(toast.error).toHaveBeenCalledWith('Não foi possível identificar seu workspace.')` **and** `expect(insertsFor('project_tasks')).toHaveLength(0)` · `src/components/projetos/ProjectTaskForm.test.tsx:239-242` (same two) · impl `ClientTaskForm.tsx:136-139`, `ProjectTaskForm.tsx:146-150` | ✅ Handled ⚠️ *(error text undefined by spec)* |
| 3 | IF a stage is deleted while a task form is open, THEN the system SHALL not fail the insert — **the form SHALL null `stage_id` before submitting when the selected stage no longer appears in the live stage list** | impl `ClientTaskForm.tsx:148-150` `const stageStillExists = !!formData.stage_id && projectStages.some((s) => s.project_id === projectId && s.id === formData.stage_id)` → `:164` `stage_id: stageStillExists ? formData.stage_id : null`; `ProjectTaskForm.tsx:116-117` → `:123`. Tests: `ClientTaskForm.test.tsx:290-307` — selects `1. Briefing`, then `act(() => useAppStore.setState({ projectStages: [] }))` at `:297-299`, submit → `:302` `expect(insertsFor('project_tasks')).toHaveLength(1)` · `:303` `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: null })` · `:305` `expect(toast.error).not.toHaveBeenCalled()` · `:306` `expect(onOpenChange).toHaveBeenCalledWith(false)` · `ProjectTaskForm.test.tsx:293-314` same shape · negative half `:309-318` / `:316-326` (`selected no stage at all` → `stage_id: null`) | ✅ **Handled — round-1 gap CLOSED** |
| 4 | IF the stage list in the store has not loaded yet, THEN show the no-stages message rather than silently hiding the field | Same branch as an empty list: `ClientTaskForm.tsx:268` / `ProjectTaskForm.tsx:257` branch on `projectStagesList.length === 0`, and `projectStages: []` (`useAppStore.ts:89`) *is* the unloaded state. Asserted at `ClientTaskForm.test.tsx:265-272` (`seed()` with default `stages = []`) and `ProjectTaskForm.test.tsx:261-270` | ✅ Handled |
| 5 | WHEN the assignee select holds a real UUID, THEN pass it through unchanged | `src/components/areapj/projetos/ClientTaskForm.test.tsx:192-199` — `expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: MEMBER_USER_ID })` · `src/components/projetos/ProjectTaskForm.test.tsx:204-211` | ✅ Handled |

**Score: 5/5 handled with evidence.**

### Is Edge Case 3 genuinely closed?

Three things had to be true, and I checked all three myself:

1. **A mechanism exists that produces the spec-defined outcome.** Both forms refuse to emit a
   `stage_id` that is not in the live list (`ClientTaskForm.tsx:148-150,164`,
   `ProjectTaskForm.tsx:116-117,123`). The predicate matches the spec's wording exactly —
   "no longer appears in the live stage list" — including the `project_id` scope, so a stage from
   another project with a coincidental id does not keep the key alive.
2. **Committed tests exercise the real sequence** (stage present → selected → stage removed from the
   store → submit), not a synthetic call. Both assert the *conjunction*: 1 insert **and**
   `stage_id: null` **and** no error toast **and** the dialog closes. Round 1's measured failure mode
   (dangling id submitted, `toast.error('Erro ao salvar tarefa')`) is now the negative of two of those.
3. **The tests discriminate.** Confirmed empirically by mutations **M1** and **M12** below, which
   restore the pre-fix `stage_id: formData.stage_id || null` / `stage_id: stageId || null` verbatim.
   Both are killed — M1 at `ClientTaskForm.test.tsx:303`, M12 at `ProjectTaskForm.test.tsx:307` —
   because without the guard the insert carries `STAGE_ID` and the `stage_id: null` assertions fail.

**Residual (non-blocking, and not a gap against the spec as written).** The store is the only source
consulted. In production the list *is* live for the user who deletes the stage:
`ProjectDetailPage.tsx:194` `handleDeleteStage` → `:201` `deleteProjectStage(stageId)` →
`src/stores/slices/projectsSlice.ts:96-98` `projectStages: state.projectStages.filter((s) => s.id !== id)`.
Two situations the spec does not describe would still emit a dangling id: (i) a *second* user deletes
the stage, since the first user's store is never re-synced; (ii) a page reload between selection and
submit, which re-seeds `formData.stage_id` from `defaultStageId` (`ClientTaskForm.tsx:104`) before the
stages have loaded, so the guard nulls it and the prefill is silently dropped. Both are outside the
edge case as worded ("while a task form is open", in the store's live list). Recorded in Fix Plans as
an observation, not a blocking gap.

---

## Discrimination Sensor

**Sensor depth**: expanded — **12 behaviour-level mutations** (dispatch minimum 7), every one of them
**executed and observed**. **12 of 12 target code written by `65fe1ad` / `27e01d7` / `69bfb08` /
`c53fdc0`** (dispatch minimum 4).

**Isolation**: temporary `git worktree add --detach` at
`C:\Users\Luiz Rickston\AppData\Local\Temp\tlc-sensor-r2b`, `node_modules` attached as a **junction**
(452 entries). Every fault was applied in that worktree only, reverted with `git checkout -- <file>`,
and the revert asserted byte-identical to the pre-mutation snapshot by the harness; after the full
loop the worktree's own `git status --porcelain` was **empty**. **`git stash` was never used.** Raw
logs: `<scratch>/out/M1..M12.log` (deleted with the scratch).

The four dispatch-required mutations are **M1/M12** (restore verbatim `stage_id` in one form each),
**M2** (hardcode `is_corporate: true` regardless of prop), **M4/M10** (reorder validation before
mapping, in both forms) and **M6/M7** (restore `return null` in the empty-stage picker, both forms).

Each row reports the **full-gate** outcome: `npm run test` over all 192 tests; "Killed" = exit 1.

| # | File:line | Fault injected | Result | Killing assertion / failing tests |
| - | --------- | -------------- | ------ | --------------------------------- |
| M1 | `src/components/areapj/projetos/ClientTaskForm.tsx:164` | restore **verbatim `stage_id: formData.stage_id \|\| null`** (the pre-`65fe1ad` line — round 1's gap) | ✅ **Killed** `1 failed \| 191 passed (192)`, exit 1 | `ClientTaskForm.test.tsx:303` `expect(insertsFor('project_tasks')[0]).toMatchObject({ stage_id: null })` — received `stage_id: "33333333-3333-4333-8333-333333333333"` |
| M2 | `src/components/projetos/ProjectWizard.tsx:208` | `is_corporate: isCorporate` → **`is_corporate: true`** (hardcode regardless of the prop) | ✅ **Killed** `2 failed \| 190`, exit 1 | *"persists is_corporate = false when the caller asks for a personal project (PRC-02)"*; *"defaults to false when the caller passes no prop (Edge Case)"* |
| M3 | `src/components/projetos/ProjectWizard.tsx:208` | **delete** `is_corporate` from the payload (reproduce the original production defect) | ✅ **Killed** `4 failed \| 188`, exit 1 | PRC-01, PRC-02, Edge Case 1, and PRC-04 *"sends every other field of the create payload exactly as before"* |
| M4 | `src/components/areapj/projetos/ClientTaskForm.tsx:121-124` | **reorder: validate the raw `formData`** before mapping — `taskSchema.safeParse(formData)` | ✅ **Killed** `7 failed \| 185`, exit 1 | TSK-01, TSK-02, TSK-04 *"persists workspace_id on the created row"*, EC *"refuses … when the workspace cannot be resolved"*, STG-03, EC3 (both) |
| M5 | `src/components/areapj/projetos/ClientTaskForm.tsx:117` | map **only** `'none'` → `null`, dropping the `''` branch (the second sentinel) | ✅ **Killed** `6 failed \| 186`, exit 1 | TSK-01 *"persists assigned_to = null when the assignee field is empty"*, TSK-04, EC workspace refusal, STG-03, EC3 (both) — TSK-02 survives by design, as it drives `'none'` |
| M6 | `src/components/areapj/projetos/ClientTaskForm.tsx:268-277` | **restore `return null`** in the empty-stage picker | ✅ **Killed** `1 failed \| 191`, exit 1 | *"states that the project has no stages instead of hiding the field (STG-02)"* |
| M7 | `src/components/projetos/ProjectTaskForm.tsx:257-266` | **restore `return null`** in the empty-stage picker | ✅ **Killed** `1 failed \| 191`, exit 1 | *"states that the project has no stages instead of hiding the field (STG-02)"* |
| M8 | `src/components/areapj/projetos/ClientTaskForm.tsx:166` | **delete** `...(workspaceId ? { workspace_id: workspaceId } : {})` | ✅ **Killed** `1 failed \| 191`, exit 1 | *"persists workspace_id on the created row"* (TSK-04) |
| M9 | `src/components/projetos/ProjectTaskForm.tsx:154` | `.insert({ ...taskData, user_id: user.id, workspace_id: workspaceId })` → **`.insert({ ...taskData, user_id: user.id })`** | ✅ **Killed** `1 failed \| 191`, exit 1 | *"persists assigned_to = null for the 'Ninguém (Apenas eu)' sentinel and carries workspace_id"* (TSK-04, second form) |
| M10 | `src/components/projetos/ProjectTaskForm.tsx:99` | **reorder: validate the raw `assignedTo`** — `if (!UUID_PATTERN.test(assignedTo))`, rejecting both sentinels before mapping | ✅ **Killed** `7 failed \| 185` across **2 test files**, exit 1 | TSK-01, TSK-02, TSK-04, EC workspace refusal, STG-03, EC3 (both), plus `ProjectDetailPage` STG-05 |
| M11 | `src/pages/ProjectDetailPage.tsx:82` | `tasks.filter(t => !t.stage_id)` → **`tasks.filter(() => false)`** (restore the stageless-task omission) | ✅ **Killed** `2 failed \| 190`, exit 1 | both STG-04 tests, incl. *"reaches the stageless tasks of a project that has no stages at all"* |
| M12 | `src/components/projetos/ProjectTaskForm.tsx:123` | restore **verbatim `stage_id: stageId \|\| null`** (the pre-`65fe1ad` line) | ✅ **Killed** `1 failed \| 191`, exit 1 | `ProjectTaskForm.test.tsx:307` `toMatchObject({ stage_id: null, project_id: PROJECT.id })` — received `stage_id: "33333333-3333-4333-8333-333333333333"` |

**Result: 12/12 killed, 0 survived, 0 anchor failures.** No fix task is required by the sensor.
M1 and M12 are the direct regression tests for round 1's only gap and did not exist as mutable
targets until `65fe1ad`; M4/M5/M9/M10 are re-targeted or new relative to round 1's set; the rest
re-derive round 1's equivalent faults against the current tree.

### Isolation verification

| Check | Pre-sensor | Post-sensor |
| ----- | ---------- | ----------- |
| `git status --porcelain` (real tree) | ` M .specs/features/project-task-creation-fixes/validation.md` + `?? .agents/` `?? .claude/` `?? .cursor/` `?? .windsurf/` | **identical** — `diff` of the two listings is empty |
| `git rev-parse HEAD` | `65fe1ad44f24c4fa7547ab91aa294915de635604` | `65fe1ad…` — unchanged |
| `git worktree list` | 1 worktree (real) | 1 worktree (real) — both scratches removed |
| real `node_modules` entries | 452 (`Get-ChildItem -Force`) before each junction attach | 452 after each junction removal; 449 by `ls -1` post-cleanup |

> **Baseline note.** The dispatch expected the pre-sensor baseline to be the four untracked skill
> directories only. It also carries ` M .specs/features/project-task-creation-fixes/validation.md` —
> this Verifier's own sanctioned report write, captured *before* any sensor work. The invariant that
> matters — porcelain unchanged across the whole sensor run — holds against the baseline actually
> recorded.
>
> **Junction-safety note.** Both worktrees' `node_modules` were junctions into the real tree, so the
> junction was removed with `cmd /c rmdir` (removes the reparse point only) **before**
> `git worktree remove --force`; the entry count was re-measured immediately afterwards each time.

---

## Gate Check

- **Gate commands** (no `tasks.md`; the three named in the dispatch):
  1. `npm run test` (= `vitest run`)
  2. `npm run test:db` (= `vitest run --config tests/db/vitest.config.ts`)
  3. `npx tsc --noEmit`
- **Executed**: all three, run by this Verifier against the implementation tree, **before** any sensor
  work began. Counts below are read from the runners' own summary lines, not from round 1's report.

| Gate | Result | Exit code |
| ---- | ------ | --------- |
| `npm run test` | **192 passed**, 0 failed, 0 skipped — 26 test files | **0** |
| `npm run test:db` | **63 passed**, 0 failed, 0 skipped — 6 test files | **0** |
| `npx tsc --noEmit` | no output (clean) | **0** |

All three match the dispatch's expected counts (192 / 63 / 0), independently re-derived. Round 1
reported **188** unit at `bd4dbe9`; `65fe1ad` then added two tests (one Edge-Case test per form), and
188 + 4 = 192 — its number was consistent with the tree it measured.

- **Test count before feature**: measured, not assumed. `git worktree add --detach` at `a654bea`
  (with `node_modules` junctioned), same commands:
  - `npm run test` → **161 passed**, 0 failed, **20 test files**, exit **0**
  - `npm run test:db` → **61 passed**, 0 failed, **5 test files**, exit **0**
- **Test count after feature**: **192 unit + 63 db** (26 + 6 files)
- **Delta**: **+31 unit, +2 db = +33**
- **Attribution — reconciles exactly.** All seven test files in the range are **new** (`git diff
  --stat a654bea..HEAD` shows insertions only, zero deletions, for each of them). Their counts sum to
  the delta with nothing left over:
  `ProjectWizard.test.tsx` **4** + `ClientTaskForm.test.tsx` **11** + `ProjectTaskForm.test.tsx`
  **10** + `ProjectDetailPage.test.tsx` **3** + `ProjetosClientesPage.test.tsx` **2** +
  `ProjetosDashboard.test.tsx` **1** = **31** unit; `tests/db/no-projects-backfill.test.ts` **2** = the
  **+2** db. Each file's count was read from the gate run's own per-file line.
- **Test count before feature (documented)**: `.specs/STATE.md` pre-feature baseline — 161 unit /
  61 db. **Independently reproduced by the runs above.**
- **Tests deleted**: **0** (`git diff --diff-filter=D --name-only a654bea..HEAD` → empty).
- **Assertions weakened**: none. Every assertion in scope is new; no pre-existing assertion was edited
  (`git diff a654bea..HEAD` touches only the seven new test files, so no pre-existing test could have
  been weakened).
- **Failures / skips**: none in any gate.

---

## Independent Judgments

### (a) Is the reworded Edge Case 3 honest, or was the requirement softened to fit? — **Honest. It was hardened.**

Old (`a654bea`), from round 1's committed report quoting the pre-`8d79987` spec:

> IF a stage is deleted while a task form is open, THEN the system SHALL not fail the insert —
> `stage_id` is `ON DELETE SET NULL`.

New (`spec.md:105`):

> IF a stage is deleted while a task form is open, THEN the system SHALL not fail the insert — the
> form SHALL null `stage_id` before submitting when the selected stage no longer appears in the live
> stage list. Note that `ON DELETE SET NULL` does **not** provide this: it nulls rows that already
> exist at deletion time, while a pending insert of a now-dangling key still violates the FK constraint.

Tested against the softening hypothesis on four axes:

| Axis | Finding |
| ---- | ------- |
| Did the **outcome** change? | **No.** "SHALL not fail the insert" is byte-identical. |
| Did the requirement get **easier**? | **No — it got strictly stronger.** The old text was a *result* clause with a claimed automatic mechanism. The new text **adds a second SHALL** ("the form SHALL null `stage_id` before submitting when…") that did not exist before. A reader of the old spec could implement nothing and claim the DB covers it; a reader of the new spec cannot. |
| Is the new clause **more testable**? | **Yes.** "The insert does not fail" is a race-dependent outcome; "null `stage_id` when the stage is absent from the live list" is a deterministic, directly assertable behaviour. The fix's two tests assert exactly that. |
| Was the rationale change **factually correct**? | **Yes, and I verified it independently** rather than accepting round 1. `supabase/migrations/20260716120000_project_stages.sql:55` declares `stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL` as a plain valid FK; `ON DELETE SET NULL` rewrites rows *already stored* when the parent is deleted and cannot make a *pending* insert of a dangling key succeed — that insert raises FK `23503`. The old rationale was therefore false, and leaving it in place would have permanently excused a real defect. |

On the one legitimate worry — that "null when the selected stage no longer appears in the live stage
list" describes the implementation it preceded: the commit timestamps are `8d79987` (spec) at
**02:32:37** and `65fe1ad` (code) at **02:42:54**, so the spec correction landed **10 minutes before**
the code. And the new clause is not the *only* way to satisfy the unchanged outcome (one could
re-fetch stages server-side at submit, or catch `23503` and retry with `stage_id = null`); it is the
minimal client-side reading, chosen while the outcome clause was left untouched. Softening would look
like narrowing the outcome, adding "best effort", or deleting the requirement. None of those happened.

**Verdict: the rewording is an honest correction of a false rationale that strengthens the
requirement. Round 1's Fix 1 option (a) was chosen over the weaker option (b).**

### (b) The `SPEC_DEVIATION` on Success Criterion 4 — **JUSTIFIED** (re-verified from source)

Round 1's claim under test: the pre-change migration set already carries one top-level
`UPDATE public.projects`, so the Success Criterion as literally worded was already false before
`27e01d7`. **I re-derived this myself:**

- `supabase/migrations/20260601162729_11b97031-274a-4197-914b-2e357c7266bf.sql:8` reads
  `UPDATE public.projects p` / `SET workspace_id = wm.workspace_id` — a genuine top-level statement
  executed on apply. Read directly, not taken from round 1's report.
- My own raw scan of all **126** migrations for `^\s*update\s+(only\s+)?(public\.)?projects\b`
  (case-insensitive, line-anchored) returns **5** hits. Four are inside `$$ … $$` function bodies and
  never execute on apply — confirmed by locating the enclosing `AS $$` / `$$;` pair in each:
  `20260716120000_project_stages.sql` (UPDATE 189, inside 133–198),
  `20260717000000_import_project_plan_rpc.sql` (229, inside 19–257),
  `20260718000000_fix_import_project_plan_tasks.sql` (229, inside 13–243),
  `20260718000100_init_stage_task_order.sql` (235, inside 17–249). Exactly **one** file —
  `20260601162729` — is a real applied offender. The test's "exactly one" result is correct.
- `git diff --name-only a654bea..HEAD -- supabase/` → **empty**. This change adds no migration and
  edits none, so the pre-change corpus *is* the current corpus and the offender predates the feature.

**Is the resolution honest, or did it hollow out the criterion? Honest.** The test is a **pinning
assertion, not a waiver**: `expect(offenders).toEqual([PRE_EXISTING_BACKFILL])` names *exactly one
file by name* (`no-projects-backfill.test.ts:29,95`), so any second top-level `UPDATE projects` — in
a new migration or an edit to any existing one — fails it. A waiver would have been
`toBeLessThanOrEqual(1)` or a comment-based skip; neither appears. Two assertions tighten *beyond*
the original wording: no migration may write `is_corporate` at all (`:103-107`), and the tolerated
file specifically must not do so (`:98-100`). Rewriting `20260601162729` to satisfy the literal
criterion would have violated the user's hard constraint ("mantem os que ja existe"); pinning it is
the only resolution consistent with both the criterion's intent and the user's decision.

**Residual (non-blocking).** `stripSql` (`:32-80`) strips `$$ … $$` bodies, and a top-level
`DO $$ BEGIN UPDATE public.projects … END $$;` **does** execute on apply but would be stripped and
missed. No such construct exists in the current corpus (my scan located all four `UPDATE`s inside
function declarations, none inside `DO`), so the test is correct today; the evasion surface is real.
Already logged as a non-blocking observation in Fix Plans.

### (c) The Radix `onValueChange('')` quirk — **in scope for logging, correctly out of scope for fixing; the logging gap is now closed**

The defect: `ClientTaskForm.tsx:453-455` renders a controlled `Select` with
`value={formData.assigned_to}`, and `:101` seeds that from `parentProject?.assigned_to || ''`. A
project's `assigned_to` is its owner's user id, which is **not** one of the items at `:461-469`
(those are `'none'` plus `corporateTeam` members). When the controlled value matches no item, Radix
fires `onValueChange('')` on mount and wipes the prefill.

**Scope verdict: not a fix target here, correctly deferred.** It is not one of the 15 ACs, not one of
the three named defects in the Problem Statement, and it is **pre-existing** at `ClientTaskForm.tsx:453`
/`:101` — outside the diff surface, introduced by none of the six commits. It caused no regression:
before `69bfb08` the `''` produced by the wipe was rejected by zod, so nothing reached the database
and the prefill loss was unobservable; after it, the path behaves exactly as TSK-01 prescribes
(`''` → `null`). Radix removes the prefill, not the fix. Repairing it needs a change to the select's
value model (represent absence as `undefined`, or add the project assignee as an item) — a design
change the spec's explicit Out-of-Scope table does not authorise.

**The round-1 process finding is now resolved.** Round 1 noted this defect had been deferred *without
being logged*, unlike `BriefingReviewPage.tsx` and `CloseProspectModal.tsx`. Commit `8d79987` added
the missing entry to `.specs/STATE.md:75-76` — a `PENDING (found, out of scope, not started)` naming
`ClientTaskForm.tsx:445`/`:101` and attributing the empirical verification to round 1 — plus a second
entry for the duplicated `assigned_to` UUID rules at `:76`. **Both deferred findings are now recorded
consistently with the project's other out-of-scope defects. Nothing further is required.**

---

## Code Quality

| Principle | Status | Note |
| --------- | ------ | ---- |
| No features beyond what was asked | ✅ | Every changed file maps to an AC, an edge case, or the spec correction. `65fe1ad` touches exactly two source files, both named by Edge Case 3 |
| No abstractions for single-use code | ✅ | `renderStageTask` (`ProjectDetailPage.tsx:226`) is used **twice** — stage cards and the new `Sem etapa` card. Without it the 65-line renderer would be duplicated |
| No unnecessary "flexibility" added | ✅ | One optional prop (`isCorporate`) with a documented default; no config surfaces |
| Only touched files required for task | ✅ | 6 source files + 7 test files + spec/STATE/LESSONS. Nothing else; `supabase/` untouched |
| Didn't "improve" unrelated code | ✅ | The only incidental change is `toast.error(...errors[0])` → `...issues[0]` at `ClientTaskForm.tsx:126`, on a line already being rewritten; removes an `any` cast, behaviour-neutral under zod 4 |
| Matches existing patterns/style | ⚠️ | Two forms encode "valid UUID" twice: `ClientTaskForm.tsx:44` (zod `.uuid()`) and `ProjectTaskForm.tsx:39` (hand-rolled `UUID_PATTERN`). They accept slightly different sets (the regex explicitly allows the nil and max UUIDs). Both satisfy TSK-03 and `ProjectTaskForm` had no schema before, but it is a duplicated rule. Now logged at `STATE.md:76` |
| Would a senior engineer approve? | ✅ | Surgical, commented in the project's Portuguese style, no dead code. The EC3 guard is 3 lines of predicate plus one ternary in each form |
| Tests map to ACs and are non-shallow | ✅ | Spot-checked PRC-04: `toEqual` over the whole 12-field payload, driven through all three wizard steps, asserting the object that reaches Postgres — not component state |
| Spec-anchored outcome check | ✅ | 15/15 asserted values match `spec.md`; 2 string-level precision gaps flagged, not silently passed |
| Per-layer coverage expectation | ✅ | Domain/unit: 1:1 AC→test mapping across **both** form implementations (the spec's ACs name "the system", so both call sites are covered, not one). DB layer: `no-projects-backfill.test.ts` for PRC-05/SC4. No route/e2e layer exists in this repo for these UI flows (`STATE.md` AD-004) |
| Every test maps to an AC / edge case / Done-when | ✅ | 0 unclaimed tests. Every `it(...)` in the seven test files cites its AC or Edge Case in the file-header comment or the test body; the two newest (`65fe1ad`) name Edge Case 3 explicitly |
| Documented guidelines followed | ✅ | `references/coding-principles.md` (skill) + `.specs/STATE.md` AD-004 (Vitest harness) and AD-005 (db harness). `npm run lint` is not in this feature's gate set; `STATE.md` tracks the 202 pre-existing lint problems separately |

---

## Anything contradicting `spec.md`, or implemented differently from the ask

Nothing found. Specifically checked:

- No assertion anywhere contradicts a spec-defined outcome. The two ⚠️ gaps are cases where the spec
  defines *no* outcome, not cases where a test asserts the wrong one.
- No AC is implemented by a mechanism the spec forbids. PRC-01/02 use a prop from the mounting page —
  which the spec's Assumptions table (`:33`) chose over an unconditional `true` precisely to avoid
  corrupting `corporate_count`. TSK-01/02 map both sentinels before validating, which is what
  `:35-36` require. STG-02 renders a message rather than `return null`, matching `:38`.
- The wizard's **edit** path deliberately omits `is_corporate` (`ProjectWizard.tsx` spreads `taskData`
  without it), so editing a legacy row leaves it `false` — consistent with PRC-05 and the Out-of-Scope
  row "Changing any row that already exists".
- Hard constraint holds: `git diff --name-only a654bea..HEAD -- supabase/` → empty; no migration
  added or modified; the only write to any `projects` row in the range is the wizard's own `insert`.

---

## Requirement Traceability

`spec.md`'s Status column already read `Verified` for all 15 ACs before round 1 ran — it was set by
the author during Execute. This Verifier did not edit `spec.md`. Statuses **re-derived here**:

| Requirement | `spec.md` says | Verifier status |
| ----------- | -------------- | --------------- |
| PRC-01…05 | Verified | ✅ Verified (PRC-05 via justified `SPEC_DEVIATION`) |
| TSK-01…05 | Verified | ✅ Verified (TSK-03 ⚠️ precision gap on message text) |
| STG-01…05 | Verified | ✅ Verified (STG-02 ⚠️ precision gap on wording) |
| Edge Case 1 | listed | ✅ Verified |
| Edge Case 2 | listed | ✅ Verified (⚠️ message text undefined) |
| **Edge Case 3** | listed (reworded) | ✅ **Verified — round-1 gap closed** |
| Edge Case 4 | listed | ✅ Verified |
| Edge Case 5 | listed | ✅ Verified |
| Success Criterion 1 | `[x]` | ✅ Verified (PRC-01 + PRC-03) |
| Success Criterion 2 | `[x]` | ✅ Verified (TSK-01/02 + TSK-03) |
| Success Criterion 3 | `[x]` | ✅ Verified (STG-04) |
| Success Criterion 4 | `[x]` + `SPEC_DEVIATION` | ✅ Verified — deviation re-verified as honest |

---

## Fix Plans

**No blocking fixes.** The single round-1 fix task (Edge Case 3) is implemented, tested and
mutation-killed. The items below are non-blocking observations for future work.

### Observation 1: `stripSql` misses a top-level `DO $$ … $$;`

- **Where**: `tests/db/no-projects-backfill.test.ts:32-80`. `DO $$ BEGIN UPDATE public.projects …
  END $$;` executes on apply but its body is stripped before the scan.
- **Impact**: an evasion route for PRC-05 / Success Criterion 4. No such construct exists today
  (§Judgments b), so nothing is currently missed.
- **Priority**: Minor. Consider stripping only `CREATE [OR REPLACE] FUNCTION` bodies.

### Observation 2: EC3 guard is store-local

- **Where**: `ClientTaskForm.tsx:148-150`, `ProjectTaskForm.tsx:116-117`.
- **Impact**: exactly the two situations the spec does not describe — a stage deleted by *another*
  user (this client's store is never re-synced) and a page reload between selection and submit
  (`defaultStageId` is re-seeded at `ClientTaskForm.tsx:104` before stages load, so the guard nulls it
  and the prefill is dropped silently).
- **Priority**: Minor. Would need server-side re-validation at submit, which is beyond Edge Case 3
  as worded.

### Observation 3: consolidate the duplicate UUID rule

- **Where**: `ClientTaskForm.tsx:44` (zod) vs `ProjectTaskForm.tsx:39` (regex). Already logged at
  `STATE.md:76`.

---

## Interactive UAT

Not performed. This Verifier is a sub-agent with no interactive channel to the user, and the
feature's observable behaviour is fully enumerated by the 15 ACs and 5 edge cases, all of which are
covered by committed tests plus a 12-mutation sensor. If the orchestrator wants human sign-off on the
UI strings (the two ⚠️ precision gaps — the "no stages" sentence and the invalid-assignee error),
that is a short interactive pass over the two forms and the Etapas tab.

---

## Summary

**Overall**: ✅ **Ready**

**Round-1 gap**: **closed** — Edge Case 3 is implemented (`ClientTaskForm.tsx:148-150,164`,
`ProjectTaskForm.tsx:116-117,123`), tested (`ClientTaskForm.test.tsx:290-307`, `309-318`;
`ProjectTaskForm.test.tsx:293-314`, `316-326`) and mutation-killed (M1, M12).

**Spec-anchored check**: **15/15 ACs matched spec-defined outcome** · **5/5 Edge Cases handled** ·
**2 spec-precision gaps flagged** (TSK-03, STG-02 — exact wording undefined by the spec; the
behaviour itself is fully asserted)
**Gate**: `npm run test` **192 passed / 26 files / exit 0**, `npm run test:db` **63 passed / 6 files /
exit 0**, `npx tsc --noEmit` **exit 0** — 0 failed, 0 skipped, **+31 unit / +2 db** over the same two
commands measured at `a654bea` (161 / 61), 0 tests deleted
**Sensor**: **12 injected, 12 killed, 0 survived** — all 12 on code from the four fix commits
**SPEC_DEVIATION**: **justified** — re-verified from the migration corpus myself; pinned to exactly one
named pre-existing file plus a blanket `is_corporate` ban
**Radix quirk**: **correctly deferred**, and now logged as `PENDING` at `STATE.md:75-76` — round 1's
process finding is resolved
**Constraint**: **respected** — `git diff --name-only a654bea..HEAD -- supabase/` is empty; no
migration added or modified; no existing `projects` row modified

**What works** — the two reported production defects are genuinely fixed, and the previously-open
edge case is too:
- Projects created from `/pj/projetos` persist `is_corporate = true` and appear on that page without a
  reload; `/projetos` still creates `false` rows, so `corporate_count` stays safe; an unconverted
  caller defaults to `false`.
- Manual task creation works with `''` and `'none'` sentinels, carries `workspace_id`, refuses a
  malformed assignee visibly with no insert, explains an empty stage list instead of hiding the field,
  surfaces stageless tasks in a `Sem etapa` group on the Etapas tab, pre-fills a stage from
  "Adicionar tarefa nesta etapa", and now **survives a stage deleted while the form is open** by
  sending `stage_id = null`.

**Next steps**: none required to close the feature. Optional: act on the three non-blocking
observations (`stripSql` / `DO` blocks, store-local EC3 guard, duplicate UUID rule).
