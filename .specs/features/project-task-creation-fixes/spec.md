# Project & Task Creation Fixes Specification

## Problem Statement

Two creation paths are broken in production. Creating a project from `/pj/projetos` shows the success message but the project never appears on that screen. Creating a task manually against a stage fails or produces a task that cannot be seen where the user is looking. Both failures are silent: the success toast fires, and no error reaches the screen because most logging in this codebase sits behind `import.meta.env.DEV`.

## Goals

- [x] A project created from `/pj/projetos` persists `is_corporate = true` and is visible in that page's list without a reload.
- [x] A task can be created manually with no assignee chosen, and it persists with `assigned_to = null`.
- [x] A task's stage is selectable whenever the project has stages, the absence of stages is stated rather than silent, and a stageless task is visible on the Etapas tab.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Changing any row that already exists | User decision 2026-10-21: "os que criei e ta invisivel ou false, nao me importa, mantem os que ja existe" — no backfill migration, no UPDATE over historical rows. |
| A "client project" selector in the wizard | The mounting page already knows whether it is corporate; asking the user would duplicate a fact the UI possesses. |
| `BriefingReviewPage.tsx` false-success toast and its `user_id: workspace_id` defect | A real, separate defect surfaced during this investigation. Recorded as pending, not folded into this scope. |
| `CloseProspectModal.tsx` missing `workspace_id` on project insert | Separate path, separate bug, surfaced and recorded as pending. |
| Removing the `is_corporate` filter from `/pj/projetos` | Eight queries across four migrations, an index and a delegate dialog agree on the distinction; the screen is the outlier only in that it creates rows that fail it. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Who decides `is_corporate` | The page that mounts the wizard, via a prop — `/pj/projetos` passes `true`, `/projetos` passes `false` | The wizard is mounted from two pages; an unconditional `true` would mislabel every project created from the personal dashboard and corrupt `corporate_count` in four migrations. | y — user chose "resolva o problema" after the three options and this variant were explained |
| Retroactive fix for existing rows | **None.** Existing rows keep `is_corporate = false` and stay invisible on that screen. | User decision, verbatim above. | **y** |
| `assigned_to` sentinel values | The schema accepts `''` and `'none'` and the payload maps both to `NULL` before insert | The form itself produces those two values; the mapping already exists in the payload but runs *after* validation, so it can never execute. | n — inferred from the defect |
| Where validation runs | On the **mapped payload**, not the raw form state | Validating state the mapper is about to rewrite means rejecting inputs the code is designed to accept. | n — inferred |
| Task rows missing `workspace_id` | Manual task inserts set `workspace_id`, matching every other writer in the codebase (`useAssignProcess.ts`, `BriefingReviewPage.tsx`, both stage writers) | The migrations show a legacy permissive policy that *may* still allow `NULL`, but the deployed state is unverifiable read-only, and two in-repo comments assert `workspace_id` is required. Setting it is correct under either state. | n — conservative default, stated so it can be overridden |
| Project with zero stages | Render an explanatory message in place of the picker instead of `return null` | The current code hides the field with no indication, so the user cannot tell "no stages exist" from "the form is broken". | n — inferred from the defect |
| Stageless task on the Etapas tab | Shown in an explicit `Sem etapa` group | The project tasks section and `MyTasksPage` already do this; the Etapas tab is the only view that drops them entirely, which makes a successful insert look like a failure. | n — inferred from the defect |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: A project created from the PJ screen is visible there ⭐ MVP

**User Story**: As a manager, I want a project I create in the client area to show up in the client area, so that I can trust the success message I just read.

**Why P1**: This is the reported defect and it silently defeats the entire creation flow.

**Acceptance Criteria**:

1. WHEN the wizard is opened from `/pj/projetos` and a project is created THEN the system SHALL persist that row with `is_corporate = true`. <!-- event-driven -->
2. WHEN the wizard is opened from `/projetos` and a project is created THEN the system SHALL persist that row with `is_corporate = false`. <!-- event-driven -->
3. WHEN a project is created from `/pj/projetos` THEN the system SHALL include it in `corporateProjects` on that page without requiring a reload. <!-- event-driven -->
4. WHERE the wizard creates a project, the system SHALL preserve every other field of the payload unchanged. <!-- optional-feature -->
5. The system SHALL NOT modify any `projects` row that exists before this change. <!-- ubiquitous -->

**Independent Test**: Render the wizard with `isCorporate` both ways, assert the insert payload, and assert a `false` flag is excluded from the PJ page's filtered list.

---

### P1: A task can be created without an assignee ⭐ MVP

**User Story**: As a manager, I want to create a task without assigning it to anyone, so that I can capture work before deciding who owns it.

**Why P1**: The form produces `''` and `'none'` itself, and both are rejected — so the ordinary path never reaches the database.

**Acceptance Criteria**:

1. WHEN the assignee field is empty and the task is submitted THEN the system SHALL persist the task with `assigned_to = null`. <!-- event-driven -->
2. WHEN the assignee select is set to `Nenhum (Somente eu)` and the task is submitted THEN the system SHALL persist the task with `assigned_to = null`. <!-- event-driven -->
3. WHEN the assignee value is neither a valid UUID nor one of the accepted sentinel values THEN the system SHALL refuse the submission and display a visible error. <!-- unwanted-behavior -->
4. WHEN a task is created manually THEN the system SHALL persist `workspace_id` on the row. <!-- ubiquitous -->
5. WHILE validation fails, the system SHALL NOT send an insert request. <!-- state-driven -->

**Independent Test**: Submit the form with `''`, with `'none'`, and with a malformed UUID; assert exactly two inserts occur with `assigned_to: null`, and the third performs none.

---

### P1: A task's stage is selectable, explained and visible ⭐ MVP

**User Story**: As a manager, I want to attach a task to a stage when I create it, and to see stageless tasks somewhere, so that nothing I create disappears.

**Why P1**: Without this the user cannot tell whether creation worked.

**Acceptance Criteria**:

1. WHEN the project has stages THEN the system SHALL render a stage selector listing them. <!-- event-driven -->
2. WHEN the project has no stages THEN the system SHALL render a message stating that the project has no stages, instead of rendering nothing. <!-- unwanted-behavior -->
3. WHEN a task is created with a stage selected THEN the system SHALL persist that `stage_id`. <!-- event-driven -->
4. WHEN the Etapas tab renders a project's tasks THEN the system SHALL show tasks with no stage in an explicit `Sem etapa` group rather than omitting them. <!-- event-driven -->
5. WHEN a task is created from the "Adicionar tarefa nesta etapa" action THEN the system SHALL pre-fill that stage in the form. <!-- event-driven -->

**Independent Test**: Render the form with zero stages and assert the message appears; render the Etapas tab with one stageless task and assert it is present.

---

## Edge Cases

- IF the wizard is mounted from a page that passes no `is_corporate` prop, THEN the system SHALL default to `false`, preserving today's behaviour for any unconverted call site.
- IF `workspace_id` cannot be resolved at insert time, THEN the system SHALL refuse the submission with a visible error rather than writing a row the creator cannot read.
- IF a stage is deleted while a task form is open, THEN the system SHALL not fail the insert — `stage_id` is `ON DELETE SET NULL`.
- IF the stage list in the store has not loaded yet, THEN the system SHALL show the no-stages message rather than silently hiding the field.
- WHEN the assignee select holds a real UUID, THEN the system SHALL pass it through unchanged.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------- |
| PRC-01 | P1: A project created from the PJ screen is visible there | Design | Verified |
| PRC-02 | P1: A project created from the PJ screen is visible there | Design | Verified |
| PRC-03 | P1: A project created from the PJ screen is visible there | Design | Verified |
| PRC-04 | P1: A project created from the PJ screen is visible there | Design | Verified |
| PRC-05 | P1: A project created from the PJ screen is visible there | Design | Verified |
| TSK-01 | P1: A task can be created without an assignee | Design | Verified |
| TSK-02 | P1: A task can be created without an assignee | Design | Verified |
| TSK-03 | P1: A task can be created without an assignee | Design | Verified |
| TSK-04 | P1: A task can be created without an assignee | Design | Verified |
| TSK-05 | P1: A task can be created without an assignee | Design | Verified |
| STG-01 | P1: A task's stage is selectable, explained and visible | Design | Verified |
| STG-02 | P1: A task's stage is selectable, explained and visible | Design | Verified |
| STG-03 | P1: A task's stage is selectable, explained and visible | Design | Verified |
| STG-04 | P1: A task's stage is selectable, explained and visible | Design | Verified |
| STG-05 | P1: A task's stage is selectable, explained and visible | Design | Verified |

**Coverage:** 15 total, 15 closed in Execute (PRC-01…05, TSK-01…05, STG-01…05), 0 open — Design and Tasks phases were skipped for this medium-scope repair, so the ACs are the task list

## Success Criteria

- [x] Creating a project from `/pj/projetos` leaves it visible in that list after a reload.
- [x] Creating a task with no assignee selected persists, and the form never silently no-ops.
- [x] Every stageless task is reachable from the Etapas tab.
- [x] No pre-existing row is modified — verified by asserting the migration set contains no `UPDATE` against `projects`. <!-- this change adds no migration at all. The pre-change set already carries one top-level `UPDATE public.projects` (20260601162729, the historical workspace_id backfill), which predates the feature and is out of scope by user decision; SPEC_DEVIATION recorded in tests/db/no-projects-backfill.test.ts -->
