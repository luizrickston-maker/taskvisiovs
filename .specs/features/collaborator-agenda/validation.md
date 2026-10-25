# Collaborator Agenda Validation — Cancellation Round

**Date**: 2026-10-25
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `f397c76..HEAD`, HEAD = `5f87e73`. Enumerated with `git log --oneline f397c76..HEAD` — **7 commits**, not the 4 named in the dispatch:

```
5f87e73 docs(spec): hand off the cancellation round
bc7db2e fix(agenda): wire edit and delete into the month grid popover
009a5a0 feat(agenda): notify both parties when an appointment is cancelled
9f024a2 feat(agenda): drop a cancelled appointment from both calendars
71a04be feat(agenda): open the answer actions from every calendar view
9ddd2fe docs(spec): record the cancellation amendment
3edf8ce docs(spec): amend collaborator-agenda for cancellation UX and notices
```

`3edf8ce` / `9ddd2fe` are the spec amendment, `71a04be` + `9f024a2` the COLAB-13/COLAB-14/MGR-13 work, `009a5a0` the ACK-02…ACK-05 notifications, `bc7db2e` the month-grid popover wiring, `5f87e73` the handoff docs. `git diff --stat f397c76..HEAD` touches 21 files, +1051/−106.

**Verifier**: independent sub-agent — author ≠ verifier. Every expected outcome below was re-derived from `spec.md` alone; every `file:line` was opened and re-read in the current tree at `5f87e73`. No citation from any prior report was reused. Gates were re-run by hand, the discrimination sensor ran 12 mutants in a disposable `git worktree`, and the spec/STATE deltas were read from `git diff f397c76..HEAD -- .specs/` rather than from the handoff notes.

**Verdict**: ❌ **FAIL** — 2 of 12 sensor mutants survived. All seven in-scope ACs have spec-matching evidence and all three gates are green; the failure is **test discrimination**, not implementation. The shipped behaviour is correct on every path exercised. Two test-strengthening fix tasks close it (see Fix Plans).

---

## Task Completion

Scope = the seven amended ACs: COLAB-13, COLAB-14, MGR-13, ACK-02, ACK-03, ACK-04, ACK-05. The other 53 ACs were validated in earlier rounds and were only spot-checked here (see Spot-Checks).

| Task / AC | Status | Notes |
| --------- | ------ | ----- |
| COLAB-13 — answer affordance from any calendar view incl. month grid | ✅ Done | Month grid popover added; day/week/popover wired; negative cases covered |
| COLAB-14 — cancelled not rendered on `/colaborador/agenda` | ✅ Done | One `.neq` in the shared hook; page suite's double re-implements it |
| MGR-13 — cancelled not rendered in `/pj/agenda`, own or collaborator's view | ✅ Done | Collaborator branch asserted; own-calendar half is structurally unreachable |
| ACK-02 — confirm sends no WhatsApp | ✅ Done | Client + `KINDS` declaration both asserted |
| ACK-03 — collaborator cancels → WhatsApp to workspace `agenda` recipients | ✅ Done ⚠️ | Faithful; fallback + empty-set outcomes unspecified in spec |
| ACK-04 — manager cancels → WhatsApp to `corporate_team.whatsapp` | ✅ Done | Exact number asserted end-to-end |
| ACK-05 — delivery failure keeps the cancellation and records the attempt | ✅ Done ⚠️ | Both halves asserted; no surfacing requirement exists (spec gap) |
| Personal PJ agenda unaffected by the shared popover | ⚠️ Partial | Renders correctly today, but the regression test does **not** discriminate the guard |

---

## Spec-Anchored Acceptance Criteria

Spec-defined outcomes were re-derived from `spec.md` at these lines: COLAB-13 `:165`, COLAB-14 `:166`, MGR-13 `:112`, ACK-02 `:214`, ACK-03 `:215`, ACK-04 `:216`, ACK-05 `:217`.

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | ------------------------- | -------------------- | ---------------------------------- | ------ |
| COLAB-13 | WHEN the collaborator taps a `pending` appointment rendered by **any** calendar view, **including the month grid**, THEN an affordance exposing **both** confirm and cancel opens | Popover/dialog containing a confirm control and a cancel control, reachable from month, week and day | Month: `src/components/agenda/views/views.test.tsx:323` — `expect(popover.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument()`; `:324` same for `/Cancelar/`; `:327` `expect(onConfirm).toHaveBeenCalledWith(PENDING_APPOINTMENT)`; `:330` `expect(onCancel).toHaveBeenCalledWith(PENDING_APPOINTMENT)`; `:333` `expect(onDaySelect).not.toHaveBeenCalled()` (tap belongs to the popover). Day: `views.test.tsx:192`/`:195` clicks + `:193`/`:196` payload asserts, `:189` `expect(popover.getAllByRole('button')).toHaveLength(2)`. Week: `views.test.tsx:244`/`:247` + `:245`/`:248`. Page-level month: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:240` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, `:242` `expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'confirm' })`, `:245` `…action: 'cancel'`. Gating negatives: `views.test.tsx:351`/`:352` `queryByRole(/Confirmar|Cancelar/)` `.not.toBeInTheDocument()` for `status:'confirmed'`; `views.test.tsx:370`/`:371` same for a personal event **with both callbacks supplied** | ✅ PASS |
| COLAB-14 | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in `/colaborador/agenda`, neither in the calendar nor in the appointment list | Absence in both surfaces; row itself untouched | Query-level exclusion: `src/hooks/useCollaboratorAppointments.ts:83` — `.neq('status', 'cancelled')`; asserted at `src/hooks/useCollaboratorAppointments.test.tsx:444` — `expect(calls.of('neq')[0].args).toEqual(['status', 'cancelled'])`. Page surfaces: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:194` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`; `:195` `expect(screen.queryByText('Cancelado pela agenda')).not.toBeInTheDocument()`; `:197` `expect(document.querySelectorAll('.grid.grid-cols-7 .truncate')).toHaveLength(1)` (calendar cell count); `:199`/`:200` `expect(screen.getAllByRole('button', { name: /Confirmar|Cancelar/ })).toHaveLength(1)` (list count) | ✅ PASS *(chain is two-step — see note 1)* |
| MGR-13 | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in the manager's `/pj/agenda`, **whether viewing their own calendar or a collaborator's** | Absence in both modes | Collaborator mode: `src/pages/PJ/AgendaPage.test.tsx:501-505` — `expect(calls.log).toContainEqual({ table: 'collaborator_appointments', method: 'neq', args: ['status', 'cancelled'] })`; `:506` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`; `:507` `expect(calls.updates()).toHaveLength(0)`. Shared filter: `useCollaboratorAppointments.test.tsx:444` (above). Own mode: **structurally unreachable** — `src/pages/PJ/AgendaPage.test.tsx:217` `expect(calls.from('collaborator_appointments')).toHaveLength(0)` (the edge case "SHALL not query `collaborator_appointments` at all"), plus `src/hooks/useCollaboratorAppointments.ts:77` `if (!target) return []` / `:91` `enabled: !!user?.id && !!target`. That view reads `time_blocks`, which carry no `status` | ✅ PASS *(own-mode half is vacuous — see note 2)* |
| ACK-02 | WHEN a collaborator **confirms** an appointment THEN the system SHALL send **no** WhatsApp message | Zero invocations of the WhatsApp path | `src/hooks/useCollaboratorAppointments.test.tsx:269-278` — `it('sends nothing when the collaborator confirms (ACK-02)')` → `expect(invokeMock).not.toHaveBeenCalled()` (`:278`). Server side has no confirm reason at all: `supabase/functions/notify-appointment/notify-appointment.test.ts:434-441` — `expect(declared.match(/"[a-z_]+"/g)).toEqual(['"created"','"cancelled_by_collaborator"','"cancelled_by_manager"'])` | ✅ PASS |
| ACK-03 | WHEN a collaborator cancels an appointment THEN the system SHALL send a WhatsApp to the **creating manager's workspace's** active `agenda` notification recipients | Delivered to the workspace's `notification_recipients` rows where `types @> {agenda}` and `is_active`, resolved from `collaborator_appointments.workspace_id` | Client names the reason: `useCollaboratorAppointments.test.tsx:290-291` — `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' } })`. Delivery to the recipients (never to the collaborator): `notify-appointment.test.ts:493` — `expect(calls.map(numberOn)).toEqual(['5511888880002', '5511888880003'])`; `:494` `expect(messageOf(calls[0])).toContain('Maria cancelou um compromisso')`; `:495` `expect(messageOf(calls[0])).toContain(PJ_DEEP_LINK)`. **Workspace scoping**: `:500-510` — `appointment.workspace_id: 'workspace-owning'` → `expect(state.recipientLookups).toEqual(['workspace-owning'])`. **Table/filter fidelity**: `:613-615` — `expect(indexSource).toContain('.from("notification_recipients")')`, `.toContain('.eq("is_active", true)')`, `.toContain('.contains("types", ["agenda"])')`. Wiring: `src/hooks/useCollaboratorAppointments.ts:297-300` `if (action === 'cancel') { await notifyCancellation(appointment.id, 'cancelled_by_collaborator'); }`; `supabase/functions/notify-appointment/index.ts:118-128` the query; `supabase/functions/_shared/notify-appointment.ts:196-210` the resolution | ✅ PASS ⚠️ Spec-precision gap A |
| ACK-04 | WHEN a manager cancels an appointment THEN the system SHALL send a WhatsApp to the collaborator's `corporate_team.whatsapp` | Delivered to exactly the collaborator's own digits-only number | Client: `useCollaboratorAppointments.test.tsx:387-398` — `it('names the cancellation reason so the collaborator is told (ACK-04)')` → `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' } })` (`:396-397`). End-to-end number: `notify-appointment.test.ts:465-466` — `expect(calls).toHaveLength(1)`; `expect(numberOn(calls[0])).toBe('5511999990001')` (the fake collaborator's `whatsapp` at `notify-appointment.test.ts:68`). Copy: `:468-473` asserts `Olá Maria,` / `seu gestor cancelou` / date / range / `COLLABORATOR_AGENDA_URL`. Trigger: `src/hooks/useCollaboratorAppointments.ts:241` `await notifyCancellation(id, 'cancelled_by_manager')`. Message builder: `supabase/functions/_shared/collaborator-agenda.ts:108-115` | ✅ PASS |
| ACK-05 | WHEN a cancellation notification cannot be delivered THEN the system SHALL **keep the cancellation persisted** AND **record the failed attempt** | `status` stays `cancelled`; one `appointment_notification_log` row with the failure status/response | Server (both halves): `notify-appointment.test.ts:549-555` — `expect(state.appointment?.status).toBe('cancelled')`; `expect(state.attempts).toEqual([{ attempt: 1, status: 'failed', providerResponse: expect.stringContaining('agzap_500') }])`; `expect(result.body.notify_status).toBe('failed')`. Client keeps the write and swallows the delivery error: `useCollaboratorAppointments.test.tsx:295-311` `it('keeps the cancellation when the notification call fails (ACK-05)')` → `await expect(result.current.mutateAsync({…action:'cancel'})).resolves.toMatchObject({ status: 'cancelled' })` (`:304-307`), `expect(calls.of('update')).toHaveLength(1)` (`:311`); manager side `:401-413` with the same two asserts. Implementation: `src/hooks/useCollaboratorAppointments.ts:21-33` (`try { await supabase.functions.invoke(…) } catch { /* ACK-05 */ }`) and `supabase/functions/_shared/notify-appointment.ts:252-253` (`recordAttempt` runs on every outcome) | ✅ PASS ⚠️ Spec-precision gap B |

**Status**: 7/7 in-scope ACs matched the spec-defined outcome · **2 spec-precision gaps flagged** (below).

### Spec-precision gaps

| ID | Where the spec is silent | What the code does | Why it matters |
| -- | ------------------------- | ------------------ | -------------- |
| **A** | ACK-03 (`spec.md:215`) names only "the workspace's active `agenda` notification recipients". It defines **no** outcome for a workspace with **zero** such recipients, and **no** fallback recipient. | `notify-appointment.ts:200-209`: use `notification_recipients` when non-empty, otherwise `workspaces.notify_whatsapp`; if both empty → `no_whatsapp`, attempt still recorded (`notify-appointment.test.ts:513-529`, `:558-576`). | Not a deviation — the fallback is this repository's documented compatibility rule (`supabase/migrations/20260626160000_notification_recipients.sql:3-6`, "as functions caem no número legado se não houver destinatário configurado para o tipo") and is byte-for-byte the rule `process-agenda-reminders/index.ts:74-82` already uses. But it is *unspecified*, so a future change to it has no spec to be checked against. |
| **B** | ACK-05 (`spec.md:217`) says "record the failed attempt" and nothing more. Unlike NOTIF-02 (`spec.md:129`), which requires the manager to get "a resend affordance", ACK-05 defines **no surfacing** requirement. | The failure lands only in `appointment_notification_log`. `handleNotifyAppointment` deliberately **skips** `setNotifyStatus` for non-`created` kinds (`notify-appointment.ts:256-258`), so `collaborator_appointments.notify_status` keeps reflecting the *creation* verdict and is actively misleading. No UI reads `appointment_notification_log`. | See judgement (b): this is the exact case the 2026-10-22 amendment exists to prevent — "must not vanish silently". |

---

## Spot-Checks (out-of-scope ACs, not re-derived in full)

Five ACs from the earlier rounds were re-opened to confirm nothing in this round broke them:

- **MGR-04** — `src/hooks/useCollaboratorAppointments.test.tsx:181` `rejects.toThrow('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.')` matches `spec.md:102` verbatim. ✅
- **COLAB-04** — `tests/db/behavior-collaborator-agenda.test.ts:321,326,429` assert `messageIncludes: 'Esta solicitação já foi respondida.'`, matching `spec.md:155`. ✅
- **NOTIF-01 / NOTIF-09** — deep link `https://taskvisiovs.vercel.app/colaborador/agenda` asserted at `supabase/functions/_shared/collaborator-agenda.test.ts:41`; observation ordering (between range and link) now asserted for the cancellation messages too, `:100-107`. ✅
- **SYNC-03** — `tests/db/schema-collaborator-agenda.test.ts:602-603` `it('publishes both tables with REPLICA IDENTITY FULL')`. ✅
- **MGR-11 / own-calendar edge case** — `AgendaPage.test.tsx:248-262` restores the personal view with no residual rows; `:217` proves the feature tables are never queried. ✅

---

## The constraint that matters most — the personal PJ agenda

**Claim under test**: `EventPopoverContent` is shared with `AgendaPJ.tsx` (`mode="edit"`), which supplies neither `onConfirm` nor `onCancel`, so the personal agenda must render exactly as before.

**Implementation gate** — `src/components/agenda/views/EventPopoverContent.tsx:43-44`:

```ts
const canAnswer =
  event.kind === 'appointment' && event.status === 'pending' && !!onConfirm && !!onCancel;
```

and the conditional block at `:78-95`, which is the **only** DOM this round added.

**What the personal agenda supplies**: nothing. `AgendaPJ.tsx:279-284` passes `mode="edit"`, `onDaySelect`, `onAddAt`, `onEdit`, `onRequestDelete` — **no** `onConfirm`/`onCancel`, to either `AgendaMonthView` or `AgendaDayView`. Its events come from `mapTimeBlockToCalendarEvent` (`CalendarEvent.ts:145-154`), which sets `kind: 'personal'` and **no** `status`.

**Evidence it is unaffected:**

| Surface | Evidence |
| ------- | -------- |
| No answer buttons, day view | `src/components/agenda/AgendaPJ.test.tsx:92-105` `it('never offers the collaborator answer actions (COLAB-13 gate)')` → `:102` `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()`; `:103` same for `/Cancelar/`; `:105` `expect(popover.getAllByRole('button')).toHaveLength(2)` — exactly Editar + the unnamed delete icon, so **any** added button fails |
| No answer buttons, month view | `AgendaPJ.test.tsx:84` `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()` inside `it('keeps edit and delete working from the month grid popover')` |
| Its own actions still work | `AgendaPJ.test.tsx:86-89` — `Editar` opens `Editar Compromisso` with `Título *` = `Reunião com cliente` |
| Shared component, callbacks supplied | `views.test.tsx:355-371` `it('offers no answer actions for a personal event even with the callbacks supplied')` → `:370`/`:371` both `.not.toBeInTheDocument()` while `:369` `expect(popover.getByRole('button', { name: /Editar/ })).toBeInTheDocument()` |

**Two honest qualifications:**

1. **The month grid is not literally "as before".** Commit `bc7db2e` gave the month chip a `Popover` (`AgendaMonthView.tsx:98-121`) and wired the personal agenda's own `onEdit`/`onRequestDelete` into it (`AgendaPJ.tsx:281-282`). So the personal agenda's month popover now contains two of its own buttons where previously the chip had no popover at all. This was **necessary**, not gratuitous: with `mode="edit"`, an unwired popover would have rendered a working-looking `Editar` that no-ops — the same dead-button defect the `!!onConfirm && !!onCancel` conjunct exists to prevent. It is deliberate, named in the commit, and tested (`AgendaPJ.test.tsx:76-90`). It adds **no collaborator answer action**. Reported as a scope observation, not a violation: the spec's out-of-scope row (`spec.md:27`) excludes modifying personal `time_blocks` **semantics**, and none changed.
2. **The required regression test exists in form but not in force.** This is sensor finding **M5** below: removing the `!!onConfirm && !!onCancel` conjunct leaves **all 220 tests green**, and a probe proved the *manager's* `/pj/agenda` would then render two dead `Confirmar`/`Cancelar` buttons. `AgendaPJ.test.tsx:92-105` cannot catch it, because AgendaPJ fails **both** conjuncts at once and no fixture isolates either one. **The test the task requires is present, and it is not discriminating.** → Fix Task 1.

**Not the personal agenda, but the same gate — the live exposure.** `src/pages/PJ/AgendaPage.tsx:213-218` and `:227` render the **collaborator's** calendar with `mode="read"` and **no** `onConfirm`/`onCancel`, over events that *are* `kind:'appointment'` + `status:'pending'` (`CalendarEvent.ts:113-114`). For that consumer the callback conjunct is the **sole** guard — and `grep -n "dialog\|popover\|Confirmar" src/pages/PJ/AgendaPage.test.tsx` returns exactly one unrelated hit (`:183`, the create-appointment dialog). Nothing asserts what that popover contains.

---

## The authorized test change (2026-10-22)

Requirement change: a `cancelled` appointment no longer renders; the two suites that asserted a rendered `Cancelado` badge must now assert its **absence**.

Full inventory of removed assertion lines across the range (`git diff f397c76..HEAD -- '*.test.ts*' | grep "^-" | grep expect`):

| Removed | Replaced by | Authorised? |
| ------- | ----------- | ----------- |
| `AgendaPage.test.tsx` — `expect(await screen.findByText('Cancelado')).toBeInTheDocument()` | `:506` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()` **+** `:501-505` the `neq` query assertion | ✅ **Updated to absence, not deleted.** The old `expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument()` was dropped; it is subsumed — with no row there is no button, and `:507` `expect(calls.updates()).toHaveLength(0)` (retained) still proves no write |
| `ColaboratorAgendaPage.test.tsx` — `expect(screen.getByText('Cancelado')).toBeInTheDocument()` | `:194` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()` **+** `:195` the row's own title **+** `:197` calendar cell count **+** `:199-200` button counts | ✅ **Updated to absence, not deleted.** The two old `queryByRole(…).not.toBeInTheDocument()` negatives became `expect(screen.getAllByRole('button', { name: /Confirmar/ })).toHaveLength(1)` / `/Cancelar/` `toHaveLength(1)` — a *stronger* counting form. COLAB-07's plain negative form survives intact for `confirmed` at `ColaboratorAgendaPage.test.tsx:175-182` |
| `useCollaboratorAppointments.test.tsx` — `it('sends no notification on any path (MGR-09)')` + `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` | `:344-350` `it('sends no notification on an edit (MGR-09)')` → `expect(invokeMock).not.toHaveBeenCalled()` after actually running `useUpdateAppointment` | ✅ Not part of the "cancelled renders" authorisation, but **directly required by ACK-04 superseding MGR-09's cancel half** (`spec.md:114`). The old source-regex was impossible to keep — the file legitimately now contains `functions.invoke`. The replacement is a *behavioural* test where the old one was a source scan, so it is stricter, not weaker. Note the old regex also matched `AGZAP` anywhere in the file; that particular source-level guard is not carried forward |
| `notify-appointment.test.ts` — `it('exposes exactly one operation and accepts nothing but POST')` | Same test, **renamed** to `…one handler…`; both assertions (`Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS','handleNotifyAppointment'])`, `indexSource` contains `req.method !== "POST"`) **unchanged** | ✅ Name only. The comment was updated because a `kind` was added; the runtime surface is still one handler |

**No other assertion was altered.** Every other change in the diff is an *addition* (new `it(` blocks) or a mechanical mock enabler (`'neq'` added to the fake builder method lists in `useCollaboratorAppointments.test.tsx:39`, `AgendaPage.test.tsx:32`, `realtime-query-config.test.tsx:21`).

**No test still contradicts `spec.md`.** `grep -rn "Cancelado" --include=*.test.*` across `src`, `tests`, `supabase` returns only the four absence assertions above plus two comment lines and one fixture title.

**Test-count integrity**: `git grep -c -E "^\s*(it|test)\("` → `f397c76` = **248**, `HEAD` = **276** (**+28**, 4 removed / 32 added). No count decreased. Executed counts per `STATE.md`: 161 → 220 unit, 61 → 63 db.

---

## Discrimination Sensor

**Depth**: expanded (12 mutants; the mandated 4 + 8). **Isolation**: `git worktree add "C:/Users/Luiz Rickston/tvc-scratch" HEAD` (detached at `5f87e73`), with a Windows **directory junction** from the scratch `node_modules` to the real one so the runner resolved deps without copying them. **Baseline captured before any mutation**: `git status --porcelain` = `?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`. Scratch baseline run: 7 files / 103 tests green before the first mutant. **Never `git stash`.** Every mutant restored with `git checkout HEAD -- <path>` (not `git checkout -- <path>`, which restores from a mutated index after a `git checkout <commit> -- <path>` — caught and corrected during M8).

| # | Mutation | File:line | Targets | Killed? |
| - | -------- | --------- | ------- | ------- |
| **M1** | Drop the `event.kind === 'appointment'` conjunct → `canAnswer = event.status === 'pending' && !!onConfirm && !!onCancel` | `EventPopoverContent.tsx:43-44` | **this round (COLAB-13 gate)** | ❌ **SURVIVED** — all 31 tests in `views` + `AgendaPJ` + `ColaboratorAgendaPage` passed, exit 0 |
| **M2** | Drop `.neq('status', 'cancelled')` from the shared read | `useCollaboratorAppointments.ts:83` | **this round (COLAB-14, MGR-13)** | ✅ Killed — 2 failures: `useCollaboratorAppointments.test.tsx:432` and `AgendaPage.test.tsx:488` |
| **M3** | ACK-03 recipient → literal `"5511911112222"` instead of the table lookup + legacy fallback | `_shared/notify-appointment.ts:200-204` | **this round (ACK-03)** | ✅ Killed — 5 failures (`:479`, `:500`, `:513`, `:558`, `:612`) |
| **M4** | ACK-05 rollback — remove the `try/catch` so a delivery failure rejects the mutation (the cancellation is no longer kept from the caller's side) | `_shared`→`useCollaboratorAppointments.ts:21-33` | **this round (ACK-05)** | ✅ Killed — 2 failures: `useCollaboratorAppointments.test.tsx:295` and `:401` |
| **M5** | Drop the `!!onConfirm && !!onCancel` conjunct → `canAnswer = event.kind === 'appointment' && event.status === 'pending'` | `EventPopoverContent.tsx:43-44` | **this round (COLAB-13 gate / personal-agenda guard)** | ❌ **SURVIVED** — **full suite green: 26 files, 220 tests, exit 0** |
| **M6** | ACK-03 message links to `COLLABORATOR_AGENDA_URL` instead of `PJ_AGENDA_URL` | `_shared/collaborator-agenda.ts:100` | **this round (ACK-03)** | ✅ Killed — 2 failures (`collaborator-agenda.test.ts` cancellation block; `notify-appointment.test.ts:479`) |
| **M7** | Notify unconditionally — remove `if (action === 'cancel')` so a **confirm** also sends | `useCollaboratorAppointments.ts:297-300` | **this round (ACK-02)** | ✅ Killed — `useCollaboratorAppointments.test.tsx:269` |
| **M8** | Revert `AgendaMonthView.tsx` to its pre-round version — month grid has no popover at all | `AgendaMonthView.tsx` @ `f397c76` | **this round (COLAB-13 month grid)** | ✅ Killed — 5 failures across `views.test.tsx`, `ColaboratorAgendaPage.test.tsx`, `AgendaPJ.test.tsx` |
| **M9** | Remove `await notifyCancellation(id, 'cancelled_by_manager')` — manager cancels silently | `useCollaboratorAppointments.ts:241` | **this round (ACK-04)** | ✅ Killed — 2 failures (`:387`, `:401`) |
| **M10** | Drop `.eq("is_active", true)` from the recipient query | `notify-appointment/index.ts:123` | **this round (ACK-03)** | ✅ Killed — `notify-appointment.test.ts:612` (source-fidelity test) |
| **M11** | Withhold `onCancel` from the collaborator page's month view | `ColaboratorAgendaPage.tsx:126` | **this round (COLAB-13 month grid, page wiring)** | ✅ Killed — `ColaboratorAgendaPage.test.tsx:228` |
| **M12** | Swap the two-direction dispatch: `cancelled_by_manager` takes the workspace-recipient branch, `cancelled_by_collaborator` falls through to the collaborator | `_shared/notify-appointment.ts:196` | **this round (ACK-03 ↔ ACK-04)** | ✅ Killed — 5 failures |

**Result**: **12 injected, 10 killed, 2 survived (M1, M5)** → ❌ **FAIL**

### The two survivors, diagnosed

**M5 — the significant one.** The conjunct removed is load-bearing for a **live** consumer: `AgendaPage.tsx:213-218` / `:227` renders `kind:'appointment'` + `status:'pending'` events with `mode="read"` and no answer callbacks. An ad-hoc probe (written in the scratch worktree, run under M5, then deleted) rendered exactly that configuration:

- **under M5**: `PROBE confirmar= true cancelar= true buttons= 2`
- **under clean `HEAD`**: `getAllByRole('button')` throws — *"Unable to find an accessible element with the role button"* → **0 buttons**

So the conjunct is the only thing keeping two dead buttons out of the manager's collaborator view, and **no test in the 220 detects its removal.** Shipped code is correct; the test suite is not discriminating.

**M1 — latent.** `CalendarEvent.ts` is the only producer of these events: `mapAvailabilityToCalendarEvent` (`:90`) and `mapTimeBlockToCalendarEvent` (`:153`) set **no** `status`; only `mapAppointmentToCalendarEvent` (`:114`) does, and it always sets `kind: 'appointment'`. So today `status === 'pending'` *implies* `kind === 'appointment'`, and the conjunct is redundant defence-in-depth. No current code path can produce a non-appointment `pending` event — but no fixture exists that would notice if one appeared.

Both survivors are on the **same line** of the **same** component, and both are the personal/shared-agenda guard the task named as "the constraint that matters most".

---

## Independent Judgements

### (a) Is resolving the recipient from `notification_recipients` (+ `notify_whatsapp` fallback) faithful to ACK-03 as written?

**Yes — faithful for any recipient, not just the user's number.** ACK-03 (`spec.md:215`): *"send a WhatsApp message to the creating manager's workspace's active `agenda` notification recipients."*

- **By workspace, not by person.** `notify-appointment/index.ts:118-128` queries `notification_recipients` with `workspace_id = appointment.workspace_id`, `is_active = true`, `types ⊇ ['agenda']` — the recipient set is derived from the row, never from a constant. `notify-appointment.test.ts:500-510` pins it (`workspace_id: 'workspace-owning'` → `recipientLookups === ['workspace-owning']`), and **M10** (dropping `is_active`) was killed by the source-fidelity test at `:612-617`.
- **Matches the spec's possessive exactly.** `collaborator_appointments.workspace_id` *is* the creating manager's workspace (MGR-05, `spec.md:103`), so "the creating manager's workspace's recipients" resolves correctly.
- **No hardcoded number survives.** `notify-appointment.test.ts:183-184` assert neither source file matches `/55\d{10}/`; **M3** (literal recipient) was killed by 5 tests.
- **Authorization is correct.** The recipients are read with `service_role` because the *collaborator* cancelling is not a workspace member (`index.ts:115-117`); the appointment itself is read under the caller's own RLS (`index.ts:95-103`), so only a party who can already read the row — the collaborator, per COLAB-09 — can trigger ACK-03 at all. That is exactly the authorized actor.
- **The fallback is out-of-spec but not out-of-repository.** `workspaces.notify_whatsapp` (`notify-appointment.ts:202-204`) is not named in ACK-03. It is, however, the compatibility rule the `notification_recipients` migration itself documents (`20260626160000_notification_recipients.sql:3-6`) and the rule `process-agenda-reminders/index.ts:74-82` already applies for the same `agenda` type — and migration `20260626180000_agenda_reminders.sql:58-61` seeds `agenda` onto the `Gestor` recipient, so the primary path is live in production. **Verdict: faithful; flagged as spec-precision gap A, not a deviation.**

*Observation, out of spec scope:* there is no rate limit. Each invocation runs `nextAttempt` → `attempt + 1`, so repeated calls each send a message; `claimAttempt` only dedupes **concurrent** invocations of the *same* attempt (NOTIF-04). That is the pre-existing creation-path property, now reachable on cancellation too. No AC covers it.

### (b) Does hiding `cancelled` lose information anyone needs?

**The happy path is adequately paired; the failure path is not.**

Pairing as shipped — both directions covered:

| Direction | In-app | WhatsApp |
| --------- | ------ | -------- |
| Collaborator responds | **ACK-01** — DB trigger writes to the creating manager (`supabase/migrations/20261019150000_collaborator_appointment_ack_notification.sql:1`) | ACK-03 on cancel; **nothing** on confirm (ACK-02) |
| Manager cancels | Realtime refresh, if the panel is open (`spec.md:43`) | **ACK-04** to `corporate_team.whatsapp` |

So when delivery succeeds nobody loses the event silently — which is what the 2026-10-22 amendment asked for.

**The hole — and it is exactly the amendment's stated purpose.** When the WhatsApp **fails**, ACK-05 keeps the cancellation and records the attempt — but:

1. The record lands only in `appointment_notification_log`, and **no UI reads that table.**
2. `handleNotifyAppointment` **skips** `setNotifyStatus` for non-`created` kinds (`notify-appointment.ts:256-258`), so `collaborator_appointments.notify_status` still reports the *creation* verdict — actively misleading if anything did read it.
3. Contrast **NOTIF-02** (`spec.md:129`), which explicitly requires "a resend affordance to the manager" for a failed *creation*. **ACK-05 has no equivalent**, so no `Reenviar` exists for a failed cancellation notice.

Net effect: a manager cancels while WhatsApp is down → the appointment **vanishes from the collaborator's calendar with no trace**, and the manager sees nothing telling them the notice never went. That is precisely the "must not vanish silently" outcome the amendment was written to prevent, defeated in the one case it should cover.

**Judgement: the pairing is adequate for successful delivery, and there is a real gap for failed delivery.** Not a spec violation — ACK-05's letter is met — but spec-precision gap B with a concrete fix. Recommended: either (i) a spec amendment extending NOTIF-02's affordance to cancellation notices, or (ii) an app-level fix surfacing `appointment_notification_log` rows for `cancelled_by_*` kinds. Recorded as a Minor fix task, not a Blocker: data is never lost (the row persists), and the failure window is an external outage.

*What is **not** a gap:* no history/audit view for cancelled rows. The row survives in the DB (`useCollaboratorAppointments.ts:63-64` "only the read path hides it"); no AC ever asked for a cancelled-history surface.

### (c) Was no migration genuinely needed?

**Yes — verified independently, not taken from the handoff.**

- `git log --name-only f397c76..HEAD -- supabase/migrations/` → **empty**. Zero migration files in the range.
- Every object the round reads already exists and predates it:
  - `notification_recipients` — `supabase/migrations/20260626160000_notification_recipients.sql:7-14` (`workspace_id`, `whatsapp`, `types text[]`, `is_active`).
  - `workspaces.notify_whatsapp` — `supabase/migrations/20260623120000_task_status_notify.sql`.
  - `collaborator_appointments.workspace_id` — `20261019120000_collaborator_agenda_schema.sql`, needed because `getAppointment` now selects it (`index.ts:98`).
  - `appointment_notification_log` + its `UNIQUE(appointment_id, attempt)` — pre-existing, reused unchanged by `claimAttempt` (`index.ts:150-161`).
- The change is therefore **code-only**: one edge function + two `_shared` modules + client TypeScript. The `supabase functions deploy notify-appointment` PENDING in `STATE.md:73` is correctly identified as a **deploy**, not a migration — and is correctly still open.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| COLAB-13 | Verified (author) | ❌ **Needs Fix** — AC evidence ✅; guard not discriminated (M5, M1) |
| COLAB-14 | Verified (author) | ✅ **Verified** |
| MGR-13 | Verified (author) | ✅ **Verified** |
| ACK-02 | Verified (author) | ✅ **Verified** |
| ACK-03 | Verified (author) | ⚠️ **Verified with spec-precision gap A** |
| ACK-04 | Verified (author) | ✅ **Verified** |
| ACK-05 | Verified (author) | ⚠️ **Verified with spec-precision gap B** |

`spec.md` was **not** edited by this Verifier (read-only over the real tree apart from this file). Reverting COLAB-13 to "Needs Fix" is left to the orchestrator's fix round.

---

## Gate Check

- **Gate commands** (from `tasks.md` Gate Check Commands, run by hand at `5f87e73`):

| Gate | Command | Result | Exit |
| ---- | ------- | ------ | ---- |
| Unit | `npm run test` | **26 files, 220 passed, 0 failed, 0 skipped** | **0** |
| Database | `npm run test:db` | **6 files, 63 passed, 0 failed, 0 skipped** | **0** |
| Types | `npx tsc --noEmit` | no output | **0** |

- **Test count before this round**: 248 `it(`/`test(` declarations at `f397c76` (executed: 161 unit / 61 db per `STATE.md`)
- **Test count after**: 276 declarations at `5f87e73` (executed: 220 unit / 63 db)
- **Delta**: **+28 declarations, +59 executed unit, +2 executed db** — no decrease
- **Skipped tests**: **none** in any of the three gates
- **Failures**: **none**
- **Test integrity**: 4 `it(` lines removed, all replaced by stronger assertions (enumerated above); no assertion weakened without an explicit, spec-backed reason

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ — the round adds only COLAB-13/14, MGR-13, ACK-02…05; the month-popover wiring for `AgendaPJ` is the minimum that keeps the shared component coherent (see qualification 1) |
| No abstractions for single-use code | ✅ — one `notifyCancellation` helper used by two call sites; `NOTIFY_FUNCTION` re-exported rather than duplicated (`AppointmentNotifier.tsx:21`, `useCollaboratorAppointments.ts:14`) |
| No unnecessary "flexibility" added | ✅ — `kind` is a closed 3-value union validated against `KINDS` (`index.ts:52-56`, `:76-80`); a `kind`-less body still means `created` for old clients |
| Only touched files required for task | ✅ — `git diff --stat` = 21 files, all on the appointment/agenda path; `realtime-query-config.test.tsx` changed by one line (mock gained `neq`) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — Portuguese comments citing AC ids, `file:line` in doc blocks, injected deps per AD-003 |
| Tests map to ACs, non-shallow | ✅ — every new `it(` names its AC; payload-level asserts (`kind`, recipient list, `status`) rather than call-existence |
| Spec-anchored outcome check | ⚠️ 2 spec-precision gaps (A, B) — flagged, not silently passed |
| Per-layer coverage | ✅ — pure domain (`_shared`) 1:1 with ACK-02…05; client hooks 1:1 with the four client-side ACs; DB suite unchanged and green |
| No unclaimed tests | ✅ — every test touched in the range names an AC or is a declared mock enabler |
| **Discrimination sensor** | ❌ **2/12 mutants survived** |

**Documented guidelines**: `references/coding-principles.md` (via `validate.md §6`) and `references/lessons.md`. No project-local `CLAUDE.md` quality rules apply.

---

## Edge Cases

- [x] **Cancelled row keeps its DB record** — hidden only at read time (`useCollaboratorAppointments.ts:63-64`); `AgendaPage.test.tsx:507` proves no write happens either.
- [x] **Delivery failure never rolls back a cancellation** — `notify-appointment.test.ts:549-555` + `useCollaboratorAppointments.test.tsx:304-311` / `:406-413`; killed by **M4**.
- [x] **Manager's own calendar still never queries the feature table** — `AgendaPage.test.tsx:217`, unaffected by the new `.neq` (query disabled when no collaborator selected).
- [x] **Confirm still sends nothing while cancel sends** — `useCollaboratorAppointments.test.tsx:278` vs `:290`; **M7** killed.
- [x] **Two cancellation directions never cross** — `notify-appointment.test.ts:493` (recipients, not the collaborator) vs `:466` (the collaborator's digits); **M12** killed.
- [x] **Month-grid tap does not leak to day selection** — `views.test.tsx:333` `expect(onDaySelect).not.toHaveBeenCalled()`.
- [x] **Personal agenda popover button count pinned** — `AgendaPJ.test.tsx:105` `toHaveLength(2)`.
- [ ] **Personal/shared-agenda guard actually discriminated** — ❌ **NOT handled**; **M5** and **M1** both survived → Fix Task 1.

---

## Fix Plans

### Fix 1 (Major — closes survivors M5 *and* M1): isolate each conjunct of the `canAnswer` gate

- **Root cause**: `EventPopoverContent.tsx:43-44` is a four-conjunct compound gate, and no fixture varies **one** conjunct at a time. `AgendaPJ.test.tsx:92-105` fails two conjuncts at once (no callbacks *and* never `kind:'appointment'`), so it cannot tell which one it is testing; `views.test.tsx:355-371` supplies callbacks but the personal event also has no `status`, so it cannot isolate `kind` from `status`; and **no test at all** renders an `appointment` + `pending` event with the callbacks withheld — which is exactly what `AgendaPage.tsx:213-218`/`:227` does in production.
- **Fix task**: add two tests.
  1. Render `AgendaMonthView` (and `AgendaDayView`) with `events=[PENDING_APPOINTMENT]`, `mode="read"`, **no** `onConfirm`/`onCancel` → `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()` and the `/Cancelar/` equivalent. This kills **M5** and is the regression test the personal-agenda constraint requires; it also covers `AgendaPage`'s consumer directly.
  2. Render with `events=[{ ...PENDING_APPOINTMENT, kind: 'unavailability' }]` (or a `personal` event), `status: 'pending'`, **both callbacks supplied** → both `.not.toBeInTheDocument()`. This kills **M1** and pins each conjunct independently.
  3. Optionally mirror (1) as a whole-page assertion in `AgendaPage.test.tsx` (open the month popover for a collaborator's pending appointment and assert no answer buttons) so the real consumer, not just the component, is guarded.
- **Verify**: re-run the sensor — both M1 and M5 must be killed; `npm run test` must stay at 220 + the new cases, 0 failed; `npx tsc --noEmit` exit 0.
- **Done when**: `git worktree` re-injection of both conjunct-drop mutants produces ≥1 failing test each, and `git status --porcelain` still matches the 4-line baseline.
- **Priority**: **Major** — a user-visible dead-button regression in `/pj/agenda` is currently undetectable.

### Fix 2 (Minor — spec-precision gap B): surface a failed cancellation notice

- **Root cause**: ACK-05 requires only that the attempt be *recorded*; nothing reads `appointment_notification_log`, and `setNotifyStatus` is deliberately skipped for cancellations (`notify-appointment.ts:256-258`), so a failed cancellation notice is invisible in every UI — while the amendment's whole purpose was that a cancellation "must not vanish silently".
- **Fix task**: amend ACK-05 (`spec.md:217`) to require surfacing — mirroring NOTIF-02's "resend affordance" — for `cancelled_by_collaborator` / `cancelled_by_manager` rows; then surface it (e.g. reuse the existing `AppointmentNotifier` path with the cancellation kinds).
- **Verify**: a test asserting a failed cancellation attempt produces a visible manager-facing affordance, plus a `sendWhatsApp`-style resend action; the existing `notify-appointment.test.ts:531-556` stays green.
- **Priority**: **Minor** — no data loss; only the external-outage path is affected.

### Fix 3 (Cosmetic — spec hygiene, no code): note COLAB-07's vacuous half

- **Root cause**: `spec.md:158` (COLAB-07) still reads "WHILE an appointment is `confirmed` or `cancelled`, … render no confirm or cancel action". Since COLAB-14 removes cancelled rows entirely, that half is now vacuously true and COLAB-14 has effectively superseded it — the same way MGR-09, NOTIF-07 and ACK-02 were annotated. It was **not** annotated.
- **Fix task**: add a one-line supersession note under `spec.md:158` pointing at COLAB-14. No code, no test.
- **Priority**: Cosmetic. Does not block.

---

## Summary

**Overall**: ❌ **Not Ready** — 2 surviving mutants, both on the round's central guard.

**Spec-anchored check**: **7/7 in-scope ACs matched the spec-defined outcome** · **2 spec-precision gaps flagged** (A: ACK-03 fallback/empty-set; B: ACK-05 surfacing).
**Gate**: **220 unit + 63 db passed, 0 failed, 0 skipped; `tsc --noEmit` exit 0** — all three re-run by hand.
**Sensor**: **12 injected, 10 killed, 2 survived (M1, M5)** in an isolated `git worktree`, real-tree porcelain verified unchanged.
**Personal agenda**: **no collaborator answer action, proven by `AgendaPJ.test.tsx:92-105`** — but the guard behind it is not discriminated, and the month grid did gain its own popover + two personal-action buttons (deliberate, `bc7db2e`, tested).

**What works**: month/week/day answer actions with correct payloads; two-direction cancellation notification with workspace-scoped recipients and no hardcoded number; confirm sends nothing; delivery failure never undoes a cancellation in either direction; `cancelled` excluded from both pages at one shared query; personal agenda clean; no migration needed; supersession annotations present for MGR-09, NOTIF-07 and ACK-02; authorized badge-assertion rewrites are **reversions to absence, not deletions**, with nothing else altered.

**Issues found**: Fix 1 (Major — isolate the `canAnswer` conjuncts), Fix 2 (Minor — surface failed cancellation notices), Fix 3 (Cosmetic — annotate COLAB-07).

**Next steps**: route Fix 1 → implementer → re-dispatch the Verifier on the same range plus the fix commits (iteration 1 of 3). Fix 2 needs a spec amendment before code; Fix 3 is docs-only.
