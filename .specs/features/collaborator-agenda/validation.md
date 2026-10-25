# Collaborator Agenda Validation — Cancellation Round, Round 2

**Date**: 2026-10-25
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `f397c76..HEAD`, HEAD = `7ec85f7`. Enumerated with `git log --oneline f397c76..HEAD` — **10 commits**:

```
7ec85f7 feat(agenda): surface the cancellation notice and its resend
32bd661 docs(spec): pin the cancellation-failure notice text
3133849 test(agenda): discriminate the popover answer gate
5f87e73 docs(spec): hand off the cancellation round
bc7db2e fix(agenda): wire edit and delete into the month grid popover
009a5a0 feat(agenda): notify both parties when an appointment is cancelled
9f024a2 feat(agenda): drop a cancelled appointment from both calendars
71a04be feat(agenda): open the answer actions from every calendar view
9ddd2fe docs(spec): record the cancellation amendment
3edf8ce docs(spec): amend collaborator-agenda for cancellation UX and notices
```

`git diff --stat f397c76..HEAD` = **27 files, +1984 / −463**. Since round 1 (at `5f87e73`) the added range is `5f87e73..7ec85f7` = `3133849` (COLAB-15/16 tests + spec), `32bd661` (ACK-06…08 pinned text + the round-1 report), `7ec85f7` (the cancellation notice itself).

**Verifier**: independent sub-agent — **author ≠ verifier, and distinct from the round-1 Verifier**. Every expected outcome below was re-derived from `spec.md` alone. No citation, line number or conclusion from round 1's `validation.md` was reused: round 1's report was treated as a claim and re-tested from the current tree. The three gates were re-run by hand. The discrimination sensor ran **14 mutants in a disposable `git worktree`** created for this round.

**Scope**: the twelve cancellation-round ACs — **COLAB-13, COLAB-14, COLAB-15, COLAB-16, MGR-13, ACK-02, ACK-03, ACK-04, ACK-05, ACK-06, ACK-07, ACK-08**.

**Verdict**: ❌ **FAIL** — **1 of 14 mutants survived**. Twelve of twelve ACs have spec-matching evidence, round 1's two survivors are both genuinely killed, and all three gates are green. The failure is again **test discrimination**, not implementation: a delivery that cannot be verified at all is reported to the user as delivered, and no test notices. One test-strengthening fix closes it.

---

## Task Completion

| Task / AC | Status | Notes |
| --------- | ------ | ----- |
| COLAB-13 — answer affordance from any calendar view incl. month grid | ✅ Done | month / week / day / page-level, plus gating negatives |
| COLAB-14 — `cancelled` not rendered on `/colaborador/agenda` | ✅ Done | one `.neq` in the shared hook, discriminated |
| COLAB-15 — `/pj/agenda` renders a `pending` appointment with **no** answer action | ✅ Done | **new in `3133849`**; kills round-1 M5 |
| COLAB-16 — a non-appointment event gets no answer action | ✅ Done | **new in `3133849`**; kills round-1 M1 |
| MGR-13 — `cancelled` not rendered in `/pj/agenda`, either mode | ✅ Done | collaborator half asserted; own half structurally vacuous (`time_blocks` carry no `status`) |
| ACK-02 — confirm sends no WhatsApp | ✅ Done | client + `KINDS` declaration |
| ACK-03 — collaborator cancels → WhatsApp to workspace `agenda` recipients | ✅ Done ⚠️ | faithful; empty-set / legacy-fallback outcome still unspecified in spec |
| ACK-04 — manager cancels → WhatsApp to `corporate_team.whatsapp` | ✅ Done | exact number asserted end-to-end |
| ACK-05 — failed delivery keeps the cancellation and records the attempt | ✅ Done ⚠️ | both halves asserted; **surfacing** requirement now exists as ACK-06…08 (round-1 gap B closed) |
| ACK-06 — delivered first attempt → notice `Compromisso cancelado.` | ✅ Done | **new in `7ec85f7`**, verbatim on both pages |
| ACK-07 — failed delivery → failure notice + `Tentar novamente` | ✅ Done ⚠️ | rendered + verbatim; **the "could not verify" failure mode is not discriminated (M3b)** |
| ACK-08 — retry re-attempts, success replaces the failure notice | ✅ Done | same appointment + same act asserted; replacement, not addition |
| Personal PJ agenda + `/pj/agenda` unaffected by the shared popover | ✅ Unaffected | proven, and now discriminated (see below) |

---

## Spec-Anchored Acceptance Criteria

Spec-defined outcomes were re-derived from `spec.md` at: COLAB-13 `:165`, COLAB-14 `:166`, COLAB-15 `:168`, COLAB-16 `:169`, MGR-13 `:112`, ACK-02 `:217`, ACK-03 `:218`, ACK-04 `:219`, ACK-05 `:220`, ACK-06 `:221`, ACK-07 `:222`, ACK-08 `:223`.

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | ------------------------- | -------------------- | ---------------------------------- | ------ |
| **COLAB-13** | WHEN the collaborator taps a `pending` appointment rendered by **any** calendar view, **including the month grid**, THEN an affordance exposing **both** confirm and cancel opens | A popover carrying a confirm control and a cancel control, reachable from month, week and day, whose activation reaches the respond mutation with the tapped row | **Month (component)**: `src/components/agenda/views/views.test.tsx:304` `it('opens the answer actions when a pending appointment chip is tapped (COLAB-13)')` → `:322` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, **`:323` `expect(popover.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument()`**, `:324` same for `/Cancelar/`, `:327` `expect(onConfirm).toHaveBeenCalledWith(PENDING_APPOINTMENT)`, `:330` `expect(onCancel).toHaveBeenCalledWith(PENDING_APPOINTMENT)`, `:333` `expect(onDaySelect).not.toHaveBeenCalled()`. **Day**: `views.test.tsx:170` `it('answers a pending appointment from the popover in read mode (COLAB-13)')` → `:189` `expect(popover.getAllByRole('button')).toHaveLength(2)`, `:192`/`:193` click + payload, `:195`/`:196` likewise. **Week**: `views.test.tsx:228` → `:244`/`:245`, `:247`/`:248`. **Page-level month grid**: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:236` `it('answers from the month grid, where the tap used to do nothing (COLAB-13)')` → `:248` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, **`:251` `expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'confirm' })`**, `:254` `… action: 'cancel'`. **Gating negatives**: `views.test.tsx:336` `it('offers no answer actions for an appointment that is no longer pending (COLAB-13)')` → `:351`/`:352` both `.not.toBeInTheDocument()` | ✅ PASS |
| **COLAB-14** | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in `/colaborador/agenda`, neither in the calendar nor in the appointment list | Absence in both surfaces; the row itself is untouched | **Query-level exclusion**: `src/hooks/useCollaboratorAppointments.ts:124` — `.neq('status', 'cancelled')`; asserted at `src/hooks/useCollaboratorAppointments.test.tsx:519` `it('excludes a cancelled appointment for both pages that read here (COLAB-14, MGR-13)')` → **`:531` `expect(calls.of('neq')[0].args).toEqual(['status', 'cancelled'])`**. **Page surfaces**: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:195` `it('shows a cancelled appointment nowhere — neither calendar nor list (COLAB-14)')` → `:202` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`, `:203` the row's own title `not.toBeInTheDocument()`, `:205` `expect(document.querySelectorAll('.grid.grid-cols-7 .truncate')).toHaveLength(1)` (calendar cell count), `:207`/`:208` `expect(screen.getAllByRole('button', { name: /Confirmar\|Cancelar/ })).toHaveLength(1)` (list count). **Discrimination**: M5 / M5b killed | ✅ PASS |
| **COLAB-15** | WHEN the manager's `/pj/agenda` renders a `pending` appointment, THEN the system SHALL **not** render the confirm or the cancel action for it | Zero answer controls in the popover the manager actually gets — month grid **and** day timeline — because that consumer supplies no callbacks | `src/pages/PJ/AgendaPage.test.tsx:591` `describe('AgendaPage — the popover withholds the answer actions (COLAB-15)')`. **Month**: `:592` `it('offers no confirm or cancel on a pending appointment from the month grid')` → `:609` `expect(popover.getByText('Pendente')).toBeInTheDocument()` (fixture present), **`:613` `expect(popover.queryAllByRole('button')).toHaveLength(0)`**, `:614`/`:615` `/Confirmar/` and `/Cancelar/` `.not.toBeInTheDocument()`. **Day**: `:618` `it(…from the day timeline)` → `:635`, **`:636` `toHaveLength(0)`**, `:637`/`:638`. **Consumer**: `src/pages/PJ/AgendaPage.tsx:214-217` `mode="read"` with no `onConfirm`/`onCancel`, `:228` likewise | ✅ PASS |
| **COLAB-16** | WHEN any calendar view renders an event that is **not an appointment**, THEN the system SHALL **not** render the confirm or the cancel action for it | Even with `status: 'pending'` **and both callbacks supplied**, a `kind: 'unavailability'` / `'personal'` event renders no answer control | `src/components/agenda/views/views.test.tsx:382` `describe('the answer gate requires an appointment (COLAB-16)')`. **Month**: `:385` `it.each(['unavailability','personal'])` → `:403` `expect(popover.getByText('Pendente')).toBeInTheDocument()` (fixture proven present, so the negatives are not passing on an unopened popover), **`:404`** and **`:405`** both `.not.toBeInTheDocument()`. **Day**: `:409` `it.each(…)` → `:424`, **`:425`**, **`:426`**. Both blocks render with `onConfirm={vi.fn()}` / `onCancel={vi.fn()}` supplied. Gate: `EventPopoverContent.tsx:43-44` | ✅ PASS |
| **MGR-13** | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in the manager's `/pj/agenda`, **whether viewing their own calendar or a collaborator's** | Absence in both modes | **Collaborator mode**: `src/pages/PJ/AgendaPage.test.tsx:488` `it('never asks for a cancelled row, so none can render (MGR-13)')` → `:501-505` `expect(calls.log).toContainEqual({ table: 'collaborator_appointments', method: 'neq', args: ['status', 'cancelled'] })`, `:506` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`, `:507` `expect(calls.updates()).toHaveLength(0)`. **Shared filter**: `useCollaboratorAppointments.test.tsx:531`. **Own mode**: structurally unreachable — `AgendaPage.test.tsx:226` `expect(calls.from('collaborator_appointments')).toHaveLength(0)` (the spec's own edge case *"SHALL not query `collaborator_appointments` at all"*) plus `useCollaboratorAppointments.ts:118` `if (!target) return []` / `:132` `enabled: !!user?.id && !!target`; that view reads `time_blocks`, which carry no `status` | ✅ PASS *(own-mode half is vacuous — the spec's edge case makes it so)* |
| **ACK-02** | WHEN a collaborator **confirms** an appointment THEN the system SHALL send **no** WhatsApp message | Zero invocations of the WhatsApp path | **Client**: `src/hooks/useCollaboratorAppointments.test.tsx:269` `it('sends nothing when the collaborator confirms (ACK-02)')` → **`:278` `expect(invokeMock).not.toHaveBeenCalled()`**. **Guard**: `useCollaboratorAppointments.ts:353` `if (action === 'cancel')`. **No notice either**: test `:353` `it('records no notice when the collaborator confirms (ACK-02)')` → **`:362` `expect(result.current.notice).toBeNull()`**. **Server**: `supabase/functions/notify-appointment/notify-appointment.test.ts:434` `it('knows exactly three reasons to send, none of them an edit (NOTIF-07)')` → `:436-440` `expect(declared.match(/"[a-z_]+"/g)).toEqual(['"created"','"cancelled_by_collaborator"','"cancelled_by_manager"'])` — there is no confirm reason at all | ✅ PASS |
| **ACK-03** | WHEN a collaborator cancels an appointment THEN the system SHALL send a WhatsApp to the **creating manager's workspace's** active `agenda` notification recipients | One message per resolved active `agenda` recipient of `collaborator_appointments.workspace_id`, never to the collaborator | **Client names the act**: `useCollaboratorAppointments.test.tsx:281` `it('names the cancellation reason when the collaborator cancels (ACK-03)')` → `:290-292` `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' } })`. **Delivery + recipients**: `notify-appointment.test.ts:493` `expect(calls.map(numberOn)).toEqual(['5511888880002', '5511888880003'])`; `:494` `expect(messageOf(calls[0])).toContain('Maria cancelou um compromisso')`; `:495` `…toContain(PJ_DEEP_LINK)`. **Workspace scoping**: `:500` `it('asks for the recipients of the workspace that owns the row (ACK-03)')` → `:510` `expect(state.recipientLookups).toEqual(['workspace-owning'])`. **Query fidelity**: `:618-620` `expect(indexSource).toContain('.from("notification_recipients")')` / `.eq("is_active", true)` / `.contains("types", ["agenda"])`. **Implementation**: `supabase/functions/notify-appointment/index.ts:118-124` | ✅ PASS ⚠️ Spec-precision gap A |
| **ACK-04** | WHEN a manager cancels an appointment THEN the system SHALL send a WhatsApp to the collaborator's `corporate_team.whatsapp` | Exactly the collaborator's own digits-only number | **Client**: `useCollaboratorAppointments.test.tsx:438` `it('names the cancellation reason so the collaborator is told (ACK-04)')` → `:447-449` `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' } })`. **End-to-end number**: `notify-appointment.test.ts:465` `expect(calls).toHaveLength(1)`, **`:466` `expect(numberOn(calls[0])).toBe('5511999990001')`**. **Copy** `:468-473`: `Olá Maria,` / `seu gestor cancelou` / title / date `05/11/2026` / range `14:00–16:00` / `DEEP_LINK`. **Trigger**: `useCollaboratorAppointments.ts:287` | ✅ PASS |
| **ACK-05** | WHEN a cancellation notification cannot be delivered THEN the system SHALL **keep the cancellation persisted** AND **record the failed attempt** | `status` stays `cancelled`; one `appointment_notification_log` row carrying the failure status and the provider response | **Server (both halves)**: `notify-appointment.test.ts:550` `expect(state.appointment?.status).toBe('cancelled')`; `:552-554` `expect(state.attempts).toEqual([{ attempt: 1, status: 'failed', providerResponse: expect.stringContaining('agzap_500') }])`; `:555` `expect(result.body.notify_status).toBe('failed')`. **Client keeps the write and swallows the error**: `useCollaboratorAppointments.test.tsx:295` `it('keeps the cancellation when the notification call fails (ACK-05)')` → `:296` `invokeMock.mockRejectedValueOnce(…)`, `:305-307` `await expect(…action:'cancel'})).resolves.toMatchObject({ status: 'cancelled' })`, `:310` `expect(invokeMock).toHaveBeenCalledTimes(1)`, `:311` `expect(calls.of('update')).toHaveLength(1)`; **manager side** `:452` `it('keeps the withdrawal when the notification call fails (ACK-05)')` → `:453`, `:459-460`, `:463`, `:464`. **Implementation**: `useCollaboratorAppointments.ts:44-55` (`try/catch`) and `supabase/functions/_shared/notify-appointment.ts:252-253` (`recordAttempt` runs on every outcome) | ✅ PASS ⚠️ Spec-precision gap B *(surfacing now supplied by ACK-06…08 — **closed this round**)* |
| **ACK-06** | WHEN cancellation delivery succeeds **on the first attempt** THEN the system SHALL display to the party that cancelled the notice `Compromisso cancelado.` | That exact sentence, in the acting party's own view, with no retry affordance | **Component**: `src/components/agenda/CancellationNotifier.test.tsx:38` `expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument()`; `:39` `expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()`; `:42` `expect(invokeMock).not.toHaveBeenCalled()`. **Collaborator's own view**: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:260` `it('reports a delivered cancellation notice in the collaborator\'s own view (ACK-06)')` → `:268` `expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument()`, `:269` no retry. **Manager's own view**: `src/pages/PJ/AgendaPage.test.tsx:559` `it('shows the delivered notice, with no retry action, when the first attempt succeeds (ACK-06)')` → `:577` `expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument()`, `:578` retry absent, `:579-581` failure sentence absent. **Hook records the verdict**: `useCollaboratorAppointments.test.tsx:317` → `:327` `expect(result.current.notice).toEqual({ appointmentId: 'ap-1', kind: 'cancelled_by_collaborator', status: 'sent' })`; manager `:469` → `:479` (same, `kind: 'cancelled_by_manager'`). **Render sites**: `AgendaPage.tsx:327`, `ColaboratorAgendaPage.tsx:120` | ✅ PASS |
| **ACK-07** | WHEN cancellation delivery **fails** THEN the system SHALL display `Compromisso cancelado, mas o aviso não foi enviado.` together with an action labelled `Tentar novamente` | That exact sentence **and** a button with that exact label, in the acting party's own view | **Component (failed)**: `CancellationNotifier.test.tsx:51` `expect(screen.getByText('Compromisso cancelado, mas o aviso não foi enviado.')).toBeInTheDocument()`, `:54` `expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()`, `:53` success sentence absent. **Component (timeout)**: `:61`/`:63` same pair. **Collaborator's view**: `ColaboratorAgendaPage.test.tsx:272` `it('reports a failed cancellation notice with its retry action (ACK-07)')` → `:281` the sentence verbatim, `:283` the label. **Manager's view**: `AgendaPage.test.tsx:515` `it('shows the cancellation notice and replaces it after a successful retry')` → `:537` `expect(await screen.findByText('Compromisso cancelado, mas o aviso não foi enviado.')).toBeInTheDocument()`, **`:539` `expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()`**. **Hook**: `useCollaboratorAppointments.test.tsx:334` (collaborator, `status: 'failed'` → `:344`), `:486` (manager, `timeout` → `:496`). **Gate**: `CancellationNotifier.tsx:62` `const delivered = status === 'sent'` → `:71` failure sentence, `:74` retry block | ✅ PASS ⚠️ Spec-precision gap C — **and see M3b: one failure mode is not discriminated** |
| **ACK-08** | WHEN the party that cancelled activates `Tentar novamente` THEN the system SHALL attempt delivery again and, on success, **replace** the failure notice with `Compromisso cancelado.` | A second invocation carrying the same appointment and the same act; on `sent` the failure notice is replaced (not joined) and the retry action disappears | **Component**: `CancellationNotifier.test.tsx:81` `it('re-attempts delivery naming the same appointment and the same act, then replaces the notice')` → `:87` `expect(invokeMock).toHaveBeenCalledTimes(1)`, `:90-92` `expect(invokeMock).toHaveBeenCalledWith('notify-appointment', { body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' } })`, `:94` `expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument()`, `:96` failure sentence `not.toBeInTheDocument()`, `:98` retry `not.toBeInTheDocument()`. **Manager's act preserved**: `:101` `it('keeps the manager\'s act when the manager was the one who cancelled')` → `:110-112` same body with `kind: 'cancelled_by_manager'`. **End-to-end**: `AgendaPage.test.tsx:549-551` `expect(invoke).toHaveBeenNthCalledWith(2, 'notify-appointment', { body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' } })`, `:552` replacement success sentence, `:553-555` failure sentence gone, `:556` retry gone. **Handler**: `CancellationNotifier.tsx:48-58`, wired at `:79` | ✅ PASS |

**Status**: **12/12 in-scope ACs matched the spec-defined outcome** · **3 spec-precision gaps flagged** (A open, B **closed**, C new) · **1 surviving mutant** (M3b, under ACK-07).

### Spec-precision gaps

| ID | Where the spec is silent | What the code does | Assessment |
| -- | ------------------------ | ------------------ | ---------- |
| **A** | ACK-03 (`spec.md:218`) names only "the workspace's active `agenda` notification recipients". It defines **no** outcome for a workspace with **zero** such recipients, and **no** fallback recipient. | `notify-appointment/index.ts:118-128`: `notification_recipients` when non-empty, else `workspaces.notify_whatsapp`; if both empty → `no_whatsapp`, attempt still recorded (`notify-appointment.test.ts:513-529`, `:558-580`). The test file itself carries `// SPEC_PRECISION_GAP: … ACK-03's mechanism … is pinned at the only boundary this suite can reach` (`notify-appointment.test.ts:610-613`). | **Carried over from round 1, still open.** Not a deviation — the fallback is this repository's documented compatibility rule (`supabase/migrations/20260626160000_notification_recipients.sql:3-6`) and is byte-for-byte what `process-agenda-reminders/index.ts:74-82` already does. It is *unspecified*, so a future change has no spec to be checked against. |
| **B** | ACK-05 (`spec.md:220`) said only "record the failed attempt"; round 1 correctly found that nothing read the record. | **Closed this round**: ACK-06…08 (`spec.md:221-225`) now pin the surfacing sentence, the retry label and the replacement, and `CancellationNotifier.tsx` renders them from both acting views. `handleNotifyAppointment` still deliberately skips `setNotifyStatus` for non-`created` kinds (`notify-appointment.ts:256-258`), so `notify_status` keeps the **creation** verdict — which is now correct, because the cancellation verdict travels in `CancellationNotice`, not in the row. | ✅ **Closed.** Round 1's gap B no longer stands. |
| **C** | ACK-07 (`spec.md:222`) says "delivery fails" without enumerating which verdicts count. The edge function can answer `failed`, `timeout` **and** `no_whatsapp`. | `CancellationNotifier.tsx:62` treats anything that is not exactly `'sent'` as a failure → failure notice + `Tentar novamente`. `failed` and `timeout` are pinned by tests (`CancellationNotifier.test.tsx:47`, `:57`); **`no_whatsapp` is not asserted anywhere** (the server side knows it — `notify-appointment.test.ts:574-575` — but no UI test does). | ⚠️ **New, Minor.** The behaviour is the right default (nothing was delivered), but the spec does not say so, so it is a default, not a verified requirement. |

---

## The round-1 gaps — re-derived, not inherited

Round 1 claimed two mutants survived, both conjuncts of `EventPopoverContent.tsx:43-44`:

```ts
const canAnswer =
  event.kind === 'appointment' && event.status === 'pending' && !!onConfirm && !!onCancel;
```

I re-ran both from scratch in my own worktree.

| Round-1 claim | My mutant | Result | What killed it |
| ------------- | --------- | ------ | -------------- |
| Removing `!!onConfirm && !!onCancel` left all 220 tests green (round-1 M5) | **M1** — `canAnswer = event.kind === 'appointment' && event.status === 'pending'` | ❌ **KILLED** — 2 failures, exit 1 | `src/pages/PJ/AgendaPage.test.tsx` > `COLAB-15` > *"offers no confirm or cancel on a pending appointment from the month grid"* **and** *"…from the day timeline"* — exactly the `/pj/agenda` consumer round 1 said was unguarded |
| Removing `event.kind === 'appointment'` was latent (round-1 M1) | **M2** — `canAnswer = event.status === 'pending' && !!onConfirm && !!onCancel` | ❌ **KILLED** — 4 failures, exit 1 | `src/components/agenda/views/views.test.tsx` > `COLAB-16` > all four `it.each` cases (month/day × unavailability/personal), each of which supplies **both** callbacks and holds `status: 'pending'`, so only the `kind` check can fail |

**Both round-1 gaps are genuinely closed.** This is evidence I gathered by injection in a throwaway worktree, not a restatement of `3133849`'s commit message — and each mutant fails *only* the tests `3133849` added, which is the signature of a test that isolates one conjunct rather than a test that happens to fail for an unrelated reason.

---

## Personal PJ agenda and the manager's view

**Claim under test**: `EventPopoverContent` is shared with `AgendaPJ.tsx` (`mode="edit"`) and with `/pj/agenda` (`mode="read"`, no callbacks); **neither may ever show Confirmar/Cancelar**.

**The only DOM this round added** is the conditional block at `EventPopoverContent.tsx:78-95`, behind the gate at `:43-44`.

| Surface | Supplies | Evidence it shows no answer action |
| ------- | -------- | ---------------------------------- |
| Personal PJ agenda, day view | `AgendaPJ.tsx:255-258` `mode="edit"`, **no** `onConfirm`/`onCancel` (`grep -n "onConfirm\|onCancel" src/components/agenda/AgendaPJ.tsx` → no matches) | `src/components/agenda/AgendaPJ.test.tsx:92` `it('never offers the collaborator answer actions (COLAB-13 gate)')` → `:102` `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()`, `:103` same for `/Cancelar/`, **`:105` `expect(popover.getAllByRole('button')).toHaveLength(2)`** — a hard count, so any added button fails |
| Personal PJ agenda, month grid | `AgendaPJ.tsx:276-279` `mode="edit"` | `AgendaPJ.test.tsx:76` `it('keeps edit and delete working from the month grid popover')` → `:84` `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()`; `:86-89` the personal `Editar` action still opens `Editar Compromisso` with `Título *` = `Reunião com cliente` |
| Manager `/pj/agenda`, month + day | `AgendaPage.tsx:214-217` and `:228` — `mode="read"`, **no** callbacks, over events that *are* `kind:'appointment'` + `status:'pending'` | `AgendaPage.test.tsx:613` and `:636` **`expect(popover.queryAllByRole('button')).toHaveLength(0)`**, plus `:614-615` / `:637-638` named negatives, after `:609`/`:635` prove the popover really holds the `Pendente` fixture |
| Shared component, callbacks **supplied**, event is not an appointment | both callbacks | `views.test.tsx:382-429` (`COLAB-16`) — the other conjunct isolated on its own |

**Proof the guard is load-bearing, not decorative**: under **M1** (callback conjunct removed) `AgendaPage`'s popover gains two buttons and `queryAllByRole('button')` returns 2 where the test demands 0 — the tests fail. So the manager's view is not merely *currently* correct; a regression to it is **detected**. That is precisely what round 1 found missing.

One scope note carried forward and re-confirmed: `bc7db2e` gave the month chip a popover on the personal agenda too, so that surface now carries its own `Editar` / delete buttons (`AgendaPJ.test.tsx:105` pins the count at 2). Those are the personal agenda's own pre-existing actions, not answer actions, and `spec.md:27` excludes changing personal `time_blocks` **semantics** — none changed. Observation, not a violation.

---

## Discrimination Sensor

**Depth**: expanded (14 mutants; the dispatch mandated 8, of which **11 target `3133849` / `7ec85f7` code**).
**Isolation**: `git worktree add "C:/Users/Luiz Rickston/tvc-scratch2" HEAD` (detached at `7ec85f7`), with a Windows **directory junction** from the scratch `node_modules` to the real one so the runner resolved deps without copying them. **Never `git stash`.** Every mutant restored with `git checkout HEAD -- <path>`.
**Baseline captured before any mutation**: `git status --porcelain` = `?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`.
**Scratch baseline**: 6 files / 84 tests green before the first mutant.

| # | Mutation | File:line | Targets | Killed? |
| - | -------- | --------- | ------- | ------- |
| **M1** | Drop `!!onConfirm && !!onCancel` → `canAnswer = event.kind === 'appointment' && event.status === 'pending'` | `EventPopoverContent.tsx:43-44` | round-1 M5 / **`3133849`** | ❌ **KILLED** — 2 failures: `AgendaPage.test.tsx:592`, `:618` (COLAB-15), exit 1 |
| **M2** | Drop `event.kind === 'appointment'` → `canAnswer = event.status === 'pending' && !!onConfirm && !!onCancel` | `EventPopoverContent.tsx:43-44` | round-1 M1 / **`3133849`** | ❌ **KILLED** — 4 failures: `views.test.tsx:385`, `:409` (COLAB-16) ×4 |
| **M3** | **Make a failed delivery report success** — `return verdict as CancellationDelivery` → `return 'sent'`, so a `failed` / `timeout` / `no_whatsapp` verdict is told to the user as delivered | `useCollaboratorAppointments.ts:51` | **`7ec85f7` (ACK-06/07)** | ❌ **KILLED** — 4 failures: `useCollaboratorAppointments.test.tsx:334`, `:486`; `CancellationNotifier.test.tsx:66`; `AgendaPage.test.tsx:515` |
| **M3b** | **Same fault on the *unverifiable* branch** — both fallbacks `return 'failed'` → `return 'sent'`, so an `invoke` that **throws**, or answers with `error` set or with no recognised `notify_status`, is reported delivered | `useCollaboratorAppointments.ts:52` and `:54` | **`7ec85f7` (ACK-07, ACK-08)** | ✅ **SURVIVED — full unit suite green: 27 files, 241 tests, exit 0** |
| **M4** | **Drop the `Tentar novamente` handler** — `onClick={() => void retry()}` → `onClick={() => undefined}` (the button still renders) | `CancellationNotifier.tsx:79` | **`7ec85f7` (ACK-08)** | ❌ **KILLED** — 4 failures: `CancellationNotifier.test.tsx:66`, `:81`, `:101`; `AgendaPage.test.tsx:515` |
| **M5** | **`.neq('status','cancelled')` no-op** — replaced by `.eq('status', 'pending')` in the shared read | `useCollaboratorAppointments.ts:124` | COLAB-14 / MGR-13 | ❌ **KILLED** — 2 failures: `useCollaboratorAppointments.test.tsx:519`, `AgendaPage.test.tsx:488` |
| **M5b** | `.neq('status', 'cancelled')` line **deleted** from the chain (the exact "no-op" form) | `useCollaboratorAppointments.ts:124` | COLAB-14 / MGR-13 | ❌ **KILLED** — same 2 failures |
| **M6** | Remove `cancellation.record({ … 'cancelled_by_manager', status })` — the manager cancels with no verdict recorded | `useCollaboratorAppointments.ts:288` | **`7ec85f7` (ACK-06/07, manager)** | ❌ **KILLED** — 4 failures: `useCollaboratorAppointments.test.tsx:469`, `:486`; `AgendaPage.test.tsx:515`, `:559` |
| **M7** | Remove the collaborator-side `cancellation.record({ … 'cancelled_by_collaborator', … })` block | `useCollaboratorAppointments.ts:358-362` | **`7ec85f7` (ACK-06/07, collaborator)** | ❌ **KILLED** — 2 failures: `useCollaboratorAppointments.test.tsx:317`, `:334` |
| **M8** | Retry hard-codes the act — `sendCancellationNotice(notice.appointmentId, notice.kind)` → `…, 'cancelled_by_collaborator')` | `CancellationNotifier.tsx:54` | **`7ec85f7` (ACK-08 direction)** | ❌ **KILLED** — 2 failures: `CancellationNotifier.test.tsx:101`; `AgendaPage.test.tsx:515` |
| **M9** | Remove `<CancellationNotifier notice={cancel.notice} />` from the manager's page | `AgendaPage.tsx:327` | **`7ec85f7` (ACK-06/07 render)** | ❌ **KILLED** — 2 failures: `AgendaPage.test.tsx:515`, `:559` |
| **M10** | Remove `<CancellationNotifier notice={respond.notice} />` from the collaborator's page | `ColaboratorAgendaPage.tsx:120` | **`7ec85f7` (ACK-06/07 render)** | ❌ **KILLED** — 2 failures: `ColaboratorAgendaPage.test.tsx:260`, `:272` |
| **M11** | `const delivered = status === 'sent'` → `status !== 'failed'` (a `timeout` is shown as delivered) | `CancellationNotifier.tsx:62` | **`7ec85f7` (ACK-07 verdict precision)** | ❌ **KILLED** — 2 failures: `CancellationNotifier.test.tsx:57`, `:66` |
| **M12** | Alter the two spec-pinned sentences and the retry label (`'Compromisso cancelado.'` → `'Compromisso cancelado'`; `'Tentar novamente'` → `'Reenviar aviso'`) | `CancellationNotifier.tsx:26`, `:32` | **`7ec85f7` / `32bd661` (ACK-06…08 verbatim)** | ❌ **KILLED** — **10 failures** across `CancellationNotifier.test.tsx`, `AgendaPage.test.tsx`, `ColaboratorAgendaPage.test.tsx` |

**Result**: **14 injected, 13 killed, 1 survived (M3b)** → ❌ **FAIL**

Every mandated mutation is present and answered: callback conjunct (M1) · `kind` conjunct (M2) · failed delivery reports success (M3, M3b) · retry handler dropped (M4) · `.neq` no-op (M5, M5b).

### The survivor, diagnosed

**M3b — `useCollaboratorAppointments.ts:52` and `:54`.** `sendCancellationNotice` has two shapes of failure:

1. **The edge function answered and said no** — `notify_status` is `failed` / `timeout` / `no_whatsapp`. *Discriminated*: M3 killed by 4 tests.
2. **The edge function could not be reached, or its answer could not be read** — `supabase.functions.invoke` throws (network, function not deployed, an unparseable body) or resolves with `error` set / no `notify_status`. The code sends `return 'failed'` at `:52` and `:54`, under the explicit doc comment *"Anything that is not a known verdict — a rejected call, an error response, a body without `notify_status` — is a failure, so a cancellation is never reported as delivered when it was not"* (`useCollaboratorAppointments.ts:31-33`).

Mutating both fallbacks to `'sent'` leaves **all 241 unit tests green**. Under that fault:

- **ACK-07 is violated** — the party who cancelled is shown `Compromisso cancelado.` and **no** `Tentar novamente`.
- **ACK-08 becomes unreachable** — with the success notice shown, the retry affordance never renders.
- This is exactly the failure mode the 2026-10-22 amendment exists to prevent: a cancellation that "must not vanish silently" is reported as successfully announced when it was not.

**Why it survives, precisely**: the fixtures that provoke exactly this branch already exist and are never asked the right question.

- `src/hooks/useCollaboratorAppointments.test.tsx:296` — `invokeMock.mockRejectedValueOnce(new Error('função de borda fora do ar'))`, inside `it('keeps the cancellation when the notification call fails (ACK-05)')`. It asserts the mutation resolves (`:305-307`) and that one update happened (`:311`), but **never asserts `result.current.notice`**.
- `src/hooks/useCollaboratorAppointments.test.tsx:453` — the manager-side twin (`:459-464`), same omission.

So the setup for the gap exists on both sides; only the assertion is missing. One added line per test closes it: `expect(result.current.notice).toMatchObject({ status: 'failed' })`.

---

## Independent Judgements

### (a) Was removing the generic `toast.success('Compromisso cancelado!')` correct?

**Yes — it removed feedback the spec had replaced, and left no path without feedback.** Verified by enumerating every consumer, not by reading the commit message.

- `7ec85f7` deleted `onSuccess: () => toast.success('Compromisso cancelado!')` from `useCancelAppointment` and narrowed `useRespondAppointment`'s to `if (action === 'confirm') toast.success('Compromisso confirmado!')` (`useCollaboratorAppointments.ts:368-370`).
- **Every cancel path now renders a spec-pinned notice instead.** There are exactly two cancel hooks and exactly one consumer each, and both render `CancellationNotifier`:
  - `useCancelAppointment` → `src/pages/PJ/AgendaPage.tsx:327` `<CancellationNotifier notice={cancel.notice} />`
  - `useRespondAppointment` → `src/pages/colaborador/ColaboratorAgendaPage.tsx:120` `<CancellationNotifier notice={respond.notice} />`
  `grep -rn "useCancelAppointment\|useRespondAppointment" src` returns **no third consumer**, so no cancel path exists that lacks success feedback. Mutants **M9** and **M10** (deleting either render site) are each killed by 2 tests, so this is enforced, not incidental.
- **Keeping both would have been wrong**: `ACK-06` (`spec.md:221`) pins the success text as `Compromisso cancelado.` (full stop). The deleted toast read `Compromisso cancelado!` (exclamation) — a second, un-pinned message racing the pinned one. Removing it makes `ACK-06` the single source of success feedback.
- **Failure feedback is not lost**: `onError` toast survives on both hooks (`useCollaboratorAppointments.ts:291`, `:371`), covering the case where the *cancellation write* fails rather than the delivery.
- **Confirm still toasts** (`:369`) — `ACK-06` covers cancellations only, and `useCollaboratorAppointments.test.tsx:362` (`notice` is `null` on confirm) proves a confirm produces no notice, so it would otherwise have had no feedback at all.

**Verdict: correct, and strictly better than what it replaced.**

### (b) Was creating `CancellationNotifier.tsx` instead of reusing `AppointmentNotifier.tsx` justified?

**Yes — round 2's claim is accurate on all three counts, each verified in the source.**

1. **"`AppointmentNotifier` auto-invokes on `notify_status === 'pending'`"** — true. `src/components/agenda/AppointmentNotifier.tsx:68-81`: the effect bails when `appointment.notify_status !== 'pending'` (`:74-77`), else calls `run(appointment)` once per id (`:78-80`). It also takes a whole `CollaboratorAppointmentRow` (`:31-35`) — and **there is no row to pass**: a cancelled appointment is excluded from every read (`useCollaboratorAppointments.ts:124`), so `appointmentRows` can never contain the row that was just cancelled.
2. **"`notify_status` keeps the creation verdict"** — true, and deliberate. `supabase/functions/_shared/notify-appointment.ts:256-258`: `if (kind === 'created') { await deps.store.setNotifyStatus(...) }`, commented *"`notify_status` pertence ao aviso de criação: um cancelamento não reescreve o veredito que o gestor ainda pode resgatar com 'Reenviar'"*. Passing a cancelled row into `AppointmentNotifier` would surface the **creation** verdict under a cancellation notice — actively wrong — and would also re-fire the creation resend (`Reenviar`) for an appointment whose creation notice already went.
3. **The copy differs by spec** — true. `AppointmentNotifier` renders `Notificação enviada.` / `Notificação não enviada.` / `NO_WHATSAPP_MESSAGE` with a `Reenviar` button (`AppointmentNotifier.tsx:94-112`), all pinned to MGR-07 / NOTIF-02. `CancellationNotifier` renders the `ACK-06`/`ACK-07` sentences with `Tentar novamente`. Reusing one component would branch two unrelated specs' text inside a single file.

**What is genuinely shared was shared**: `NOTIFY_FUNCTION` is re-exported rather than duplicated (`AppointmentNotifier.tsx:21`, `useCollaboratorAppointments.ts:16`), and both follow the same contract — *the client names the appointment, the edge function decides, the attempt number is the server's*. That is the seam that mattered. `CancellationNotifier.tsx:14-22` documents the reasoning in the file itself.

**Verdict: justified — a sibling, not a duplicate.**

### (c) Does `ACK-08`'s retry risk flooding? Is that in scope?

**Real, but out of scope — no AC covers it, so I record it as an observation, not a gap.**

- Each invocation runs `nextAttempt` → `max(attempt) + 1` (`notify-appointment/index.ts:136-146`), then `claimAttempt` upserts with `ignoreDuplicates` on `UNIQUE(appointment_id, attempt)` (`:149-161`). That key dedupes **concurrent** invocations of the *same* attempt only — which is exactly what `NOTIF-04` (`spec.md:131`) requires. It does **not** bound how many attempts a user may cause.
- So N clicks of `Tentar novamente` → N new log rows → N WhatsApp messages. The only guard shipped is `disabled={resending}` (`CancellationNotifier.tsx:80`), which blocks a second click while one is in flight but not sequential clicks after it settles.
- **In scope?** No. `ACK-08` (`spec.md:223`) says only "attempt delivery again and, on success, replace the failure notice". No AC imposes a rate, a cap or a cooldown — neither for `ACK-08` nor for the pre-existing `NOTIF-03` "Reenviar" it mirrors. Adding a cap would implement something the spec does not ask for.
- **Recommendation**: one line under `ACK-08` (or in the Assumptions table) stating the intended bound, so the property stops being accidental. Not a fix task for this round.

### (d) Was the user's constraint respected — no migration?

**Yes — verified directly, not taken from any report.**

```
$ git diff --name-only f397c76..HEAD -- supabase/migrations/
(no output)   # exit 0
```

Zero migration files in the range. Every object this round touches already exists and predates it: `notification_recipients` (`20260626160000_notification_recipients.sql:7-14`), `workspaces.notify_whatsapp` (`20260623120000_task_status_notify.sql`), `collaborator_appointments.workspace_id` (`20261019120000_collaborator_agenda_schema.sql`), `appointment_notification_log` + its `UNIQUE(appointment_id, attempt)`. The change is code-only: client TypeScript, one edge function, two `_shared` modules. `supabase functions deploy notify-appointment` remains a **deploy** task, not a migration.

---

## Also checked

| Check | Result |
| ----- | ------ |
| **Any test contradicting `spec.md`?** | **No.** `grep -rn "Compromisso cancelado" src tests supabase` → 19 hits, all either the `ACK-06`/`ACK-07` literals (full stop / full failure sentence) or `CancellationNotifier.tsx`'s own constants. The one different string, `tests/db/notification-collaborator-appointment-ack.test.ts:141` `expect(row!.title).toBe('Compromisso cancelado')`, is the **ACK-01 in-app notification** row (`user_id` = manager, `type: 'agenda'`, `link: '/pj/agenda'`) — a different surface the spec does not pin, so no conflict. `grep -rn "'Cancelado'"` in scope returns only two hits, `ColaboratorAgendaPage.test.tsx:202` and `AgendaPage.test.tsx:506`, both asserting **absence**, exactly as `COLAB-14` / `MGR-13` require. |
| **Any test removed or weakened since round 1?** | **No.** `git diff 5f87e73..HEAD -- '*.test.ts*' \| grep "^-" \| grep -E "^\-\s*(it\|test)\("` → empty; the same filter over `expect` → empty. Every change in `3133849` and `7ec85f7` is an addition. |
| **Test-count integrity** | `git grep -c -E "^\s*(it\|test)\("` → `f397c76` = **248**, `5f87e73` = **276**, `HEAD` = **293**. Monotonic increase, **+45** over the range. Executed: 161 → 220 (round 1) → **241** unit; 61 → **63** db. No count decreased. |
| **Any AC implemented differently from spec?** | **No** for the twelve in scope. `COLAB-13` uses one popover per view rather than a dialog — the spec says "an affordance", not a widget. `COLAB-14` / `MGR-13` are implemented once, in the shared hook, which the spec's "SHALL not render" phrasing permits. `ACK-06…08` are client state, not persisted — the spec says "display … in the acting party's own view", which is what happens. |
| **Supersession annotations** | **All four present.** `MGR-09` → `spec.md:114` *"Supersession (half of MGR-09) … reversed … 2026-10-22"*. `NOTIF-07` → `spec.md:138` *"Supersession (half of NOTIF-07) … reversed … 2026-10-22 (ACK-03, ACK-04)"*. `ACK-02` → `spec.md:227` *"Supersession. The original ACK-02 forbade any WhatsApp on confirm or cancel … reversed … 2026-10-22"* — and it sits under the P3 story the ACK-06…08 notes extend. `COLAB-07` → `spec.md:158` `<!-- VACUOUS for \`cancelled\` since COLAB-14: a cancelled appointment is no longer rendered at all, so this half now only bites for \`confirmed\`. -->` — **round 1's Fix 3 (cosmetic) is done**; the annotation was added by `3133849`. |
| **Notice strings asserted verbatim, not against the exported constants** | **Retyped literals — and that is the stronger choice, proven empirically.** `CancellationNotifier.test.tsx`, `AgendaPage.test.tsx` and `ColaboratorAgendaPage.test.tsx` all write `'Compromisso cancelado.'` / `'Compromisso cancelado, mas o aviso não foi enviado.'` / `'Tentar novamente'` inline; **none imports** `CANCELLED_NOTICE`, `CANCEL_FAILED_NOTICE` or `RETRY_NOTICE_LABEL`. Had they imported them, **M12** (editing the constants) would have moved test and implementation together and **survived**; instead M12 killed **10 tests**. A test that pins the spec's text in its own source cannot be silently dragged along by an implementation change. **Retyping is correct here; importing the constants would be a regression.** |

---

## Gate Check

Run by hand at `HEAD = 7ec85f7`, on the real tree, before any sensor work.

| Gate | Command | Result | Exit |
| ---- | ------- | ------ | ---- |
| Unit | `npm run test` | **27 files, 241 passed, 0 failed, 0 skipped** | **0** |
| Database | `npm run test:db` | **6 files, 63 passed, 0 failed, 0 skipped** | **0** |
| Types | `npx tsc --noEmit` | no output | **0** |

- **Gate command source**: `tasks.md` → Gate Check Commands.
- **Test count before this feature**: 248 declarations at `f397c76` (executed 161 unit / 61 db).
- **Test count after**: 293 declarations at `HEAD` (executed **241** unit / **63** db).
- **Delta**: **+45 declarations, +80 executed unit, +2 executed db** — no decrease, no weakening.
- **Skipped tests**: **none** in any of the three gates.
- **Failures**: **none**.
- The prior-round baseline in the dispatch (241 unit / 63 db / tsc exit 0) is **confirmed exactly**.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ — `7ec85f7` adds only the notice surface `ACK-06…08` require; `3133849` adds only tests |
| No abstractions for single-use code | ✅ — `CancellationNotifier` has one prop and one job; `sendCancellationNotice` is one function used by two hooks and one retry |
| No unnecessary "flexibility" added | ✅ — `CancellationKind` is a closed 2-value union checked against the server's `KINDS` (`notify-appointment.test.ts:436-440`); `CancellationDelivery` is validated against `DELIVERY_VERDICTS` before being trusted (`useCollaboratorAppointments.ts:49`) |
| Only touched files required for task | ✅ — 9 files in `7ec85f7`, 3 in `3133849`, all on the cancellation path |
| Didn't "improve" unrelated code | ✅ — no assertion outside the two new describes was altered |
| Matches existing patterns/style | ✅ — same `data-testid` / `data-status` block shape and Portuguese AC-citing comments as `AppointmentNotifier`; `NOTIFY_FUNCTION` re-exported, not duplicated |
| Tests map to ACs, non-shallow | ✅ — every new `it(` names its AC; assertions are on payload, exact text and exact counts, not on call existence |
| Spec-anchored outcome check | ⚠️ 3 spec-precision gaps (A open, B **closed**, C new) — flagged, not silently passed |
| Per-layer coverage | ✅ — pure `_shared`/edge domain 1:1 with ACK-03…05; client hooks 1:1 with ACK-06…08; component 1:1 with ACK-06…08; both page surfaces covered |
| No unclaimed tests | ✅ — every test touched in the range names an AC or is a declared mock enabler |
| **Discrimination sensor** | ❌ **13/14 killed, 1 survived (M3b)** |

**Documented guidelines**: `references/coding-principles.md` (via `validate.md §6`) and `references/lessons.md`. No project-local `CLAUDE.md` quality rules apply.

---

## Edge Cases

- [x] **Delivery failure never rolls back a cancellation** — `notify-appointment.test.ts:550` + `useCollaboratorAppointments.test.tsx:305-311` / `:459-464`; asserted on both directions.
- [x] **Confirm sends nothing while cancel sends** — `useCollaboratorAppointments.test.tsx:278` vs `:290`; `:362` proves a confirm records no notice; `notify-appointment.test.ts:436-440` proves no confirm reason exists server-side.
- [x] **The two cancellation directions never cross** — `notify-appointment.test.ts:493` (workspace recipients, never the collaborator) vs `:466` (the collaborator's digits); **M8** (retry hard-coding the wrong act) killed.
- [x] **Cancelled row keeps its DB record** — hidden only at read time (`useCollaboratorAppointments.ts:102-105`); `AgendaPage.test.tsx:507` proves no write happens either.
- [x] **Manager's own calendar still never queries the feature table** — `AgendaPage.test.tsx:226`, unaffected by the new `.neq` (query disabled when no collaborator is selected).
- [x] **Month-grid tap does not leak to day selection** — `views.test.tsx:333`.
- [x] **Personal agenda popover button count pinned at 2** — `AgendaPJ.test.tsx:105`.
- [x] **`/pj/agenda` popover holds exactly 0 buttons** — `AgendaPage.test.tsx:613`, `:636`.
- [x] **Retry keeps the original actor's act** — `CancellationNotifier.test.tsx:101-114`; **M8** killed.
- [ ] **An *unverifiable* delivery is reported as a failure** — ❌ **NOT handled**; **M3b** survived → Fix Task 1.

---

## Requirement Traceability Update

| Requirement | Previous status (round 1) | New status |
| ----------- | ------------------------- | ---------- |
| COLAB-13 | ❌ Needs Fix | ✅ **Verified** — M1 and M2 both killed by `3133849`'s tests |
| COLAB-14 | ✅ Verified | ✅ **Verified** — M5, M5b killed |
| COLAB-15 | *(did not exist)* | ✅ **Verified** — evidence `AgendaPage.test.tsx:591-638` |
| COLAB-16 | *(did not exist)* | ✅ **Verified** — evidence `views.test.tsx:382-429` |
| MGR-13 | ✅ Verified | ✅ **Verified** — M5b killed; own-mode half vacuous by the spec's own edge case |
| ACK-02 | ✅ Verified | ✅ **Verified** |
| ACK-03 | ⚠️ Verified w/ gap A | ⚠️ **Verified with spec-precision gap A** (unchanged, still open) |
| ACK-04 | ✅ Verified | ✅ **Verified** |
| ACK-05 | ⚠️ Verified w/ gap B | ✅ **Verified** — gap B **closed** by ACK-06…08 + `CancellationNotifier` |
| ACK-06 | *(did not exist)* | ✅ **Verified** — verbatim, both views; M6, M7, M9, M10, M12 killed |
| ACK-07 | *(did not exist)* | ❌ **Needs Fix** — AC evidence ✅; one failure mode not discriminated (**M3b**); spec-precision gap C |
| ACK-08 | *(did not exist)* | ✅ **Verified** — M4, M8 killed |

`spec.md` was **not** edited by this Verifier (read-only over the real tree apart from this file).

---

## Fix Plans

### Fix 1 (Major — closes survivor M3b): assert the surfaced verdict on the *unverifiable* delivery path

- **Root cause**: `useCollaboratorAppointments.ts:52` and `:54` — when `supabase.functions.invoke` throws, or resolves with `error`, or with no recognised `notify_status`, `sendCancellationNotice` returns `'failed'` so the user is never told a cancellation notice went out when it did not. **No test asserts that.** The two fixtures that provoke it already exist and ask only about persistence:
  - `useCollaboratorAppointments.test.tsx:296` — `invokeMock.mockRejectedValueOnce(new Error('função de borda fora do ar'))`; asserts `:305-307` and `:311`, **never `result.current.notice`**.
  - `useCollaboratorAppointments.test.tsx:453` — the manager-side twin; asserts `:459-460` and `:463-464`, same omission.
- **Fix task**: in those two existing tests add `expect(result.current.notice).toMatchObject({ status: 'failed' })` (plus `kind` / `appointmentId` for symmetry). Optionally add one test for the other fallback shape — `invoke` resolving `{ data: {}, error: null }` or `{ error: … }` — since `:52` and `:54` are two distinct branches.
- **Verify**: re-inject M3b (replace both `return 'failed';` at `:52` and `:54` with `return 'sent';`) in a `git worktree` — it must produce ≥1 failing test; `npm run test` must return to 241+ with 0 failed; `npx tsc --noEmit` exit 0; `git status --porcelain` must still show only the four `??` skill dirs.
- **Done when**: M3b killed, M1–M12 all still killed, all three gates green, porcelain matches baseline.
- **Priority**: **Major** — user-visible false success on exactly the path `ACK-06…08` was written to protect, and `ACK-08`'s retry becomes unreachable in that state.

### Fix 2 (Minor — spec-precision gap C): say in the spec which verdicts count as "delivery fails"

- **Root cause**: `ACK-07` (`spec.md:222`) says "delivery fails" without enumerating. The edge function can answer `failed`, `timeout` **and** `no_whatsapp`; the code treats all three as failures (`CancellationNotifier.tsx:62`) but only the first two are asserted (`CancellationNotifier.test.tsx:47`, `:57`).
- **Fix task**: one sentence under `ACK-07` — any verdict other than `sent` (`failed`, `timeout`, `no_whatsapp`) is a failure — plus a test asserting the `no_whatsapp` notice.
- **Priority**: **Minor**. The behaviour is already the right default; the spec, not the code, is what is missing.

### Fix 3 (Minor — spec-precision gap A, carried from round 1): pin ACK-03's empty-recipient outcome

- **Root cause**: `ACK-03` (`spec.md:218`) defines no outcome for zero active `agenda` recipients and does not name the `workspaces.notify_whatsapp` fallback the code applies (`notify-appointment/index.ts:118-128`); the test file itself flags `// SPEC_PRECISION_GAP` (`notify-appointment.test.ts:610-613`).
- **Fix task**: a spec sentence for (i) zero recipients → fall back to `workspaces.notify_whatsapp`, (ii) neither set → `no_whatsapp` + recorded attempt. No code change.
- **Priority**: **Minor** — the implementation is faithful to this repository's documented convention; only the spec is silent.

### Observation (not a fix task): `ACK-08` retry has no rate bound

See judgement (c). No AC covers it, so nothing fails. Recommend a spec note, not code.

---

## Summary

**Overall**: ❌ **Not Ready** — 1 surviving mutant out of 14.

**Round-1 gaps**: **both closed**, proven by injection (M1 killed by 2 `COLAB-15` failures, M2 killed by 4 `COLAB-16` failures), not by reading `3133849`'s message.

**Spec-anchored check**: **12/12 in-scope ACs matched the spec-defined outcome** · **3 spec-precision gaps** (A open, B **closed**, C new).
**Gate**: **241 unit + 63 db passed, 0 failed, 0 skipped; `tsc --noEmit` exit 0** — all three re-run by hand.
**Sensor**: **14 injected, 13 killed, 1 survived (M3b)** in a disposable `git worktree`; real-tree porcelain verified identical to the pre-sensor baseline; scratch removed and `node_modules` intact.
**Personal + manager views**: **unaffected** — `AgendaPJ.tsx` supplies neither callback (2-button count pinned at `AgendaPJ.test.tsx:105`), `AgendaPage.tsx` supplies neither callback over `pending` appointment events (0-button count pinned at `AgendaPage.test.tsx:613` / `:636`), and **M1** proves that guard is now enforced rather than merely present.

**What works**: month/week/day answer actions with correct payloads; `cancelled` excluded from both pages at one shared query; two-direction cancellation notification with workspace-scoped recipients and no hardcoded number; confirm sends nothing; a cancellation is never undone by a delivery problem; the spec-pinned notice renders verbatim in **both** acting views with a working, actor-preserving retry; personal agenda clean; no migration added; all four supersession annotations present including `COLAB-07`'s.

**Issues found**: **Fix 1 (Major)** — assert the surfaced verdict when the delivery cannot be verified. **Fix 2 (Minor)** — enumerate `ACK-07`'s failure verdicts. **Fix 3 (Minor)** — pin `ACK-03`'s empty-recipient outcome (carried from round 1).

**Next steps**: route Fix 1 → implementer → re-dispatch the Verifier on the same range plus the fix commit (iteration 1 of 3). Fixes 2 and 3 are spec-only and can ship with it.
