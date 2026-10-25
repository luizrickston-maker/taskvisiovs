# Collaborator Agenda Validation — Cancellation Scope, Round 3 (final)

**Date**: 2026-10-25
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `f397c76..HEAD`, HEAD = `0344d52`. Enumerated with `git log --oneline f397c76..HEAD` — **13 commits**:

```
0344d52 docs(spec): record the cancellation round iteration state
49f88d8 test(agenda): assert every undelivered cancellation verdict
e23b2ee docs(spec): enumerate failure verdicts and the zero-recipient case
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

`git diff --stat f397c76..HEAD` = **27 files, +2139 / −464**. `git diff --name-only f397c76..HEAD -- supabase/migrations/` = **empty** (exit 0).

**Note on HEAD movement during this run**: at dispatch time HEAD was `49f88d8`. The orchestrator committed `0344d52` (docs-only, `.specs/STATE.md`, +2/−2) at 16:02 while my gates were running, so the sensor baseline and every citation below are against `0344d52`. That commit touches no code, no test and no spec AC. Pre-commit the real tree showed ` M .specs/STATE.md` alongside the four `??` skill dirs; from `0344d52` on, `git status --porcelain` = the four `??` dirs only, and that is the baseline I verified against after the sensor.

**Verifier**: independent sub-agent — **author ≠ verifier, and distinct from the round-1 and round-2 Verifiers**. Every expected outcome below was re-derived from `spec.md` at `0344d52` alone. Nothing from round 1's or round 2's `validation.md` was inherited: those two reports were read as claims and re-tested against the current tree (line numbers in them are stale where `49f88d8` shifted them — I re-cited every one). The three gates were re-run by hand, before and after the sensor. The discrimination sensor ran **16 mutants in a disposable `git worktree`**.

**Scope — thirteen ACs**: **COLAB-13, COLAB-14, COLAB-15, COLAB-16, MGR-13, ACK-02, ACK-03, ACK-04, ACK-05, ACK-06, ACK-07, ACK-08, ACK-09** (ACK-09 added by `e23b2ee`, after round 2).

**Verdict**: ✅ **PASS** — **0 of 16 mutants survived**, including round 2's survivor, which I killed by my own injection rather than by reading `49f88d8`. **13/13 ACs** carry spec-matching `file:line` evidence; ACK-07's four failure classes each have their own assertion and ACK-09's zero-recipient case asserts nothing was sent. All three gates green. One **narrowed residual spec-precision gap** (A′, Minor) is flagged rather than silently passed.

---

## Task / AC Completion

| AC | Status | Notes |
| -- | ------ | ----- |
| COLAB-13 — answer affordance from **any** calendar view incl. month grid | ✅ Done | month / week / day / page-level month grid + gating negatives |
| COLAB-14 — `cancelled` not rendered on `/colaborador/agenda` | ✅ Done | one `.neq` in the shared hook; page-level absence in calendar **and** list |
| COLAB-15 — `/pj/agenda` renders `pending` with **no** answer action | ✅ Done | 0-button hard count, month **and** day |
| COLAB-16 — a non-appointment event gets no answer action | ✅ Done | both callbacks supplied, `kind` isolated |
| MGR-13 — `cancelled` not rendered in `/pj/agenda`, either mode | ✅ Done | collaborator half asserted; own half structurally unreachable (spec's own edge case) |
| ACK-02 — confirm sends no WhatsApp | ✅ Done | client negative + server `KINDS` declaration |
| ACK-03 — collaborator cancels → WhatsApp to workspace `agenda` recipients | ✅ Done ⚠️ | faithful; **gap A′ narrowed** (fallback's positive branch still implied, see below) |
| ACK-04 — manager cancels → WhatsApp to `corporate_team.whatsapp` | ✅ Done | exact digits asserted end-to-end |
| ACK-05 — failed delivery keeps the cancellation and records the attempt | ✅ Done | both halves asserted, server and client, both directions |
| ACK-06 — delivered first attempt → `Compromisso cancelado.` | ✅ Done | verbatim in **both** acting views + hook record |
| ACK-07 — failed delivery → failure notice + `Tentar novamente` | ✅ Done | **all four failure classes** asserted (new in `e23b2ee`/`49f88d8`) |
| ACK-08 — retry re-attempts, success **replaces** the failure notice | ✅ Done | same appointment + same act; replacement, not addition |
| ACK-09 — zero recipients → `no_whatsapp`, ACK-07 notice, **nothing sent** | ✅ Done | **new in `e23b2ee`**; server `calls === 0` is load-bearing (proved by M4) |
| Personal PJ agenda + `/pj/agenda` never show Confirmar/Cancelar | ✅ Unaffected | proved structurally **and** discriminated (M12) |

---

## Spec-Anchored Acceptance Criteria

Spec-defined outcomes re-derived at `0344d52`: COLAB-13 `spec.md:165`, COLAB-14 `:166`, COLAB-15 `:168`, COLAB-16 `:169`, MGR-13 `:112`, ACK-02 `:217`, ACK-03 `:218`, ACK-04 `:219`, ACK-05 `:220`, ACK-06 `:221`, ACK-07 `:222` + the new enumeration paragraph `:224`, ACK-08 `:225`, ACK-09 `:226`.

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | ------------------------- | -------------------- | ---------------------------------- | ------ |
| **COLAB-13** | WHEN the collaborator taps a `pending` appointment rendered by **any** calendar view, **including the month grid**, THEN an affordance exposing **both** confirm and cancel opens | A popover with a confirm control and a cancel control, reachable from month, week and day, whose activation reaches the respond mutation with the tapped row | **Month component**: `src/components/agenda/views/views.test.tsx:304` `it('opens the answer actions when a pending appointment chip is tapped (COLAB-13)')` → `:322` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, **`:323` `expect(popover.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument()`**, `:324` same for `/Cancelar/`, `:327` `expect(onConfirm).toHaveBeenCalledWith(PENDING_APPOINTMENT)`, `:330` `expect(onCancel).toHaveBeenCalledWith(PENDING_APPOINTMENT)`, `:333` `expect(onDaySelect).not.toHaveBeenCalled()`. **Day**: `views.test.tsx:170` → `:189` `expect(popover.getAllByRole('button')).toHaveLength(2)`, `:192`/`:193` click + payload, `:195`/`:196` likewise. **Week**: `views.test.tsx:228` → `:244`/`:245`, `:247`/`:248`. **Page-level month grid**: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:236` `it('answers from the month grid, where the tap used to do nothing (COLAB-13)')` → `:248` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, **`:251` `expect(respondMutate).toHaveBeenCalledWith({ appointment: row, action: 'confirm' })`**, `:254` `… action: 'cancel'`. **Gating negative**: `views.test.tsx:336` `it('offers no answer actions for an appointment that is no longer pending (COLAB-13)')` → `:350` `expect(popover.getByText('Confirmado')).toBeInTheDocument()` (fixture proven present), `:351`/`:352` both `.not.toBeInTheDocument()` | ✅ PASS |
| **COLAB-14** | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in `/colaborador/agenda`, neither in the calendar nor in the appointment list | Absence in **both** surfaces; the row itself untouched | **Query-level exclusion**: `src/hooks/useCollaboratorAppointments.ts:124` `.neq('status', 'cancelled')`; asserted at `src/hooks/useCollaboratorAppointments.test.tsx:581` `it('excludes a cancelled appointment for both pages that read here (COLAB-14, MGR-13)')` → **`:593` `expect(calls.of('neq')[0].args).toEqual(['status', 'cancelled'])`** *(round 2 cited `:519`/`:531`; `49f88d8` inserted 58 lines above — re-cited at HEAD)*. **Page surfaces**: `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:195` → `:202` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`, `:203` the row's own title `not.toBeInTheDocument()`, **`:205` `expect(document.querySelectorAll('.grid.grid-cols-7 .truncate')).toHaveLength(1)`** (calendar cell count), `:207`/`:208` `expect(screen.getAllByRole('button', { name: /Confirmar/ })).toHaveLength(1)` and `… /Cancelar/ …` (list count). **Discrimination**: M11 killed | ✅ PASS |
| **COLAB-15** | WHEN the manager's `/pj/agenda` renders a `pending` appointment, THEN the system SHALL **not** render the confirm or the cancel action for it | Zero answer controls in the popover the manager actually gets — month **and** day — because that consumer supplies no callbacks | `src/pages/PJ/AgendaPage.test.tsx:591` `describe('AgendaPage — the popover withholds the answer actions (COLAB-15)')`. **Month**: `:592` → `:609` `expect(popover.getByText('Pendente')).toBeInTheDocument()`, **`:613` `expect(popover.queryAllByRole('button')).toHaveLength(0)`**, `:614`/`:615` `/Confirmar/` and `/Cancelar/` `.not.toBeInTheDocument()`. **Day**: `:618` → `:635`, **`:636` `toHaveLength(0)`**, `:637`/`:638`. **Consumer**: `src/pages/PJ/AgendaPage.tsx:214-219` `mode="read"`, `:228` `mode="read"` — **no `onConfirm`/`onCancel` anywhere in the file** (`grep -n "onConfirm\|onCancel" src/pages/PJ/AgendaPage.tsx` → no matches). **Discrimination**: M12 killed | ✅ PASS |
| **COLAB-16** | WHEN any calendar view renders an event that is **not** an appointment, THEN the system SHALL **not** render the confirm or the cancel action for it | Even with `status: 'pending'` **and both callbacks supplied**, a `kind: 'unavailability'` / `'personal'` event renders no answer control | `src/components/agenda/views/views.test.tsx:382` `describe('the answer gate requires an appointment (COLAB-16)')`. **Month**: `:385` `it.each(['unavailability','personal'])` → `:403` `expect(popover.getByText('Pendente')).toBeInTheDocument()` (fixture proven present), **`:404`** and **`:405`** both `.not.toBeInTheDocument()`. **Day**: `:409` `it.each(…)` → `:424`, **`:425`**, **`:426`**. Both blocks render with `onConfirm={vi.fn()}` / `onCancel={vi.fn()}` supplied. **Gate**: `src/components/agenda/views/EventPopoverContent.tsx:43-44`. **Discrimination**: M13 killed | ✅ PASS |
| **MGR-13** | WHEN an appointment's status is `cancelled` THEN the system SHALL **not** render it in the manager's `/pj/agenda`, **whether viewing their own calendar or a collaborator's** | Absence in both modes | **Collaborator mode**: `src/pages/PJ/AgendaPage.test.tsx:488` `it('never asks for a cancelled row, so none can render (MGR-13)')` → `:501-505` `expect(calls.log).toContainEqual({ table: 'collaborator_appointments', method: 'neq', args: ['status', 'cancelled'] })`, `:506` `expect(screen.queryByText('Cancelado')).not.toBeInTheDocument()`, **`:507` `expect(calls.updates()).toHaveLength(0)`**. **Shared filter**: `useCollaboratorAppointments.test.tsx:593`. **Own mode**: `AgendaPage.test.tsx:226` `expect(calls.from('collaborator_appointments')).toHaveLength(0)` — the spec's own edge case *"the manager's own calendar … SHALL not query `collaborator_appointments` at all"* (`spec.md:247`) — plus `useCollaboratorAppointments.ts:118` `if (!target) return []` and `:132` `enabled: !!user?.id && !!target`; that view reads `time_blocks`, which carry no `status`. **Discrimination**: M11 killed | ✅ PASS *(own-mode half is vacuous because the spec's edge case makes it so — asserted, not assumed)* |
| **ACK-02** | WHEN a collaborator **confirms** an appointment THEN the system SHALL send **no** WhatsApp message | Zero invocations of the WhatsApp path, and no notice | **Client**: `src/hooks/useCollaboratorAppointments.test.tsx:269` `it('sends nothing when the collaborator confirms (ACK-02)')` → **`:278` `expect(invokeMock).not.toHaveBeenCalled()`**; `:408` `it('records no notice when the collaborator confirms (ACK-02)')` → **`:417` `expect(result.current.notice).toBeNull()`**. **Guard**: `useCollaboratorAppointments.ts:353` `if (action === 'cancel')`. **Server**: `supabase/functions/notify-appointment/notify-appointment.test.ts:434` `it('knows exactly three reasons to send, none of them an edit (NOTIF-07)')` → `:436-440` `expect(declared.match(/"[a-z_]+"/g)).toEqual(['"created"','"cancelled_by_collaborator"','"cancelled_by_manager"'])` — there is **no confirm reason at all**. **Discrimination**: M14 killed | ✅ PASS |
| **ACK-03** | WHEN a collaborator cancels an appointment THEN the system SHALL send a WhatsApp to the **creating manager's workspace's** active `agenda` notification recipients | One message per resolved active `agenda` recipient of `collaborator_appointments.workspace_id`, never to the collaborator | **Client names the act**: `useCollaboratorAppointments.test.tsx:281` `it('names the cancellation reason when the collaborator cancels (ACK-03)')` → `:290-292` `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' } })`. **Delivery + recipients**: `notify-appointment.test.ts:479` → **`:493` `expect(calls.map(numberOn)).toEqual(['5511888880002', '5511888880003'])`**, `:494` `expect(messageOf(calls[0])).toContain('Maria cancelou um compromisso')`, `:495` `…toContain(PJ_DEEP_LINK)`. **Workspace scoping**: `:500` → `:510` `expect(state.recipientLookups).toEqual(['workspace-owning'])`. **Query fidelity**: `:618-620` `expect(indexSource).toContain('.from("notification_recipients")')` / `.eq("is_active", true)` / `.contains("types", ["agenda"])`. **Implementation**: `supabase/functions/notify-appointment/index.ts:118-125` | ✅ PASS ⚠️ **gap A′ (narrowed)** |
| **ACK-04** | WHEN a manager cancels an appointment THEN the system SHALL send a WhatsApp to the collaborator's `corporate_team.whatsapp` | Exactly the collaborator's own digits-only number | **Client**: `useCollaboratorAppointments.test.tsx:493` `it('names the cancellation reason so the collaborator is told (ACK-04)')` → `:502-504` `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION, { body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' } })`. **End-to-end number**: `notify-appointment.test.ts:455` → **`:466` `expect(numberOn(calls[0])).toBe('5511999990001')`**, `:465` `expect(calls).toHaveLength(1)`. **Copy** `:468-473`: `Olá Maria,` / `seu gestor cancelou` / title / date `05/11/2026` / range `14:00–16:00` / deep link. **Trigger**: `useCollaboratorAppointments.ts:287` | ✅ PASS |
| **ACK-05** | WHEN a cancellation notification cannot be delivered THEN the system SHALL **keep the cancellation persisted** AND **record the failed attempt** | `status` stays `cancelled`; one `appointment_notification_log` row carrying the failure status and provider response | **Server (both halves)**: `notify-appointment.test.ts:531` → `:550` `expect(state.appointment?.status).toBe('cancelled')`, `:552-554` `expect(state.attempts).toEqual([{ attempt: 1, status: 'failed', providerResponse: expect.stringContaining('agzap_500') }])`, `:555` `expect(result.body.notify_status).toBe('failed')`. **Client keeps the write and swallows the error**: `useCollaboratorAppointments.test.tsx:295` `it('keeps the cancellation and reports an unverifiable delivery as undelivered (ACK-05, ACK-07)')` → `:304-307` `…resolves.toMatchObject({ status: 'cancelled' })`, `:310` `expect(invokeMock).toHaveBeenCalledTimes(1)`, **`:311` `expect(calls.of('update')).toHaveLength(1)`**; manager side `:507` → `:514-516`, `:518`, **`:519` `expect(calls.of('update')).toHaveLength(1)`**. **Implementation**: `useCollaboratorAppointments.ts:44-55` (`try/catch`), `supabase/functions/_shared/notify-appointment.ts:235-…` (`recordAttempt` on every outcome) | ✅ PASS *(surfacing supplied by ACK-06…08 — round-1/2 gap B **closed**)* |
| **ACK-06** | WHEN cancellation delivery succeeds **on the first attempt** THEN the system SHALL display to the party that cancelled `Compromisso cancelado.` | That exact sentence, in the acting party's own view, no retry affordance, and nothing sent by the panel | **Component**: `src/components/agenda/CancellationNotifier.test.tsx:34` `describe(…ACK-06)` → `:36` `render(<CancellationNotifier notice={notice({ status: 'sent' })} />)`, **`:38` `expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument()`**, `:39` `expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()`, **`:42` `expect(invokeMock).not.toHaveBeenCalled()`**. **Collaborator's own view**: `ColaboratorAgendaPage.test.tsx:260` → `:268` `expect(screen.getByText('Compromisso cancelado.')).toBeInTheDocument()`, `:269` retry absent. **Manager's own view**: `AgendaPage.test.tsx:559` → `:577` `expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument()`, `:578` retry absent, `:579-581` failure sentence absent. **Hook records the verdict**: `useCollaboratorAppointments.test.tsx:372` → `:382-386` `expect(result.current.notice).toEqual({ appointmentId: 'ap-1', kind: 'cancelled_by_collaborator', status: 'sent' })`; manager `:531` → `:541-545`. **Render sites**: `AgendaPage.tsx:327`, `ColaboratorAgendaPage.tsx:120` | ✅ PASS |
| **ACK-07** | WHEN cancellation delivery **fails** — provider `failed`, provider `timeout`, provider `no_whatsapp`, or an attempt that does not resolve to a parseable verdict — THEN display `Compromisso cancelado, mas o aviso não foi enviado.` together with `Tentar novamente`; **only an explicit `sent` counts as delivered** | That exact sentence **and** a button with that exact label, in the acting party's own view, for **each of the four** classes; the success sentence only on `sent` | **Gate**: `CancellationNotifier.tsx:62` `const delivered = status === 'sent'` → `:71` `{delivered ? CANCELLED_NOTICE : CANCEL_FAILED_NOTICE}`, `:74` retry block. **(1) provider `failed`**: `CancellationNotifier.test.tsx:47` `it('shows the spec sentence with a Tentar novamente action when delivery failed')` → `:48` `render(… { status: 'failed' })`, **`:51` `expect(screen.getByText('Compromisso cancelado, mas o aviso não foi enviado.')).toBeInTheDocument()`**, `:53` success sentence `not.toBeInTheDocument()`, **`:54` `expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()`**; collaborator hook `useCollaboratorAppointments.test.tsx:389` → `:399-403` `expect(result.current.notice).toEqual({ …, status: 'failed' })`; manager view `AgendaPage.test.tsx:515` → `:537`, `:539`. **(2) provider `timeout`**: `CancellationNotifier.test.tsx:57` `it('shows the same notice when the delivery timed out')` → `:58` `render(… { status: 'timeout' })`, **`:61`** failure sentence, **`:63`** retry; manager hook `useCollaboratorAppointments.test.tsx:548` `it('records a timeout as a failure for the manager view (ACK-07)')` → `:558-562` `expect(result.current.notice).toEqual({ …, status: 'timeout' })`. **(3) provider `no_whatsapp`**: `CancellationNotifier.test.tsx:82` `it('raises the failure notice when there was nobody to send to (ACK-07, ACK-09)')` → `:83` `render(… { status: 'no_whatsapp' })`, **`:86`** failure sentence, `:88` success sentence `not.toBeInTheDocument()`, **`:89`** retry, **`:92` `expect(invokeMock).not.toHaveBeenCalled()`**; hook `useCollaboratorAppointments.test.tsx:348` `it('records no_whatsapp so the panel raises the failure notice (ACK-09)')` → `:358-362` `expect(result.current.notice).toEqual({ …, status: 'no_whatsapp' })`. **(4) unparseable verdict**: `useCollaboratorAppointments.test.tsx:295` (invoke **rejects**) → **`:315-319` `expect(result.current.notice).toEqual({ …, status: 'failed' })`**; `:324-328` `it.each` over three unreadable shapes — `{ data: {}, error: null }`, `{ data: { notify_status: 'banana' } }`, `{ data: null, error: {…} }` — → **`:338-343`** same `status: 'failed'` assertion for each. **Only `sent` is delivered**: `CancellationNotifier.test.tsx:36-42` (success branch) vs `:48-93` (all four failure branches). **Collaborator's view**: `ColaboratorAgendaPage.test.tsx:272` → `:281` sentence, `:283` label. **Manager's view**: `AgendaPage.test.tsx:515` → `:537`, `:539`. **Discrimination**: M5, M6, M7, M1, M2, M3 killed | ✅ PASS |
| **ACK-08** | WHEN the party that cancelled activates `Tentar novamente` THEN the system SHALL attempt delivery again and, on success, **replace** the failure notice with `Compromisso cancelado.` | A second invocation carrying the **same appointment and the same act**; on `sent` the failure notice is replaced (not joined) and the retry disappears | **Component**: `CancellationNotifier.test.tsx:97` `it('re-attempts delivery naming the same appointment and the same act, then replaces the notice')` → `:103` `expect(invokeMock).toHaveBeenCalledTimes(1)`, **`:106-108` `expect(invokeMock).toHaveBeenCalledWith('notify-appointment', { body: { appointment_id: 'ap-1', kind: 'cancelled_by_collaborator' } })`**, `:110` `expect(await screen.findByText('Compromisso cancelado.')).toBeInTheDocument()`, `:112` failure sentence `not.toBeInTheDocument()`, `:114` retry `not.toBeInTheDocument()`. **Manager's act preserved**: `:117` `it('keeps the manager's act when the manager was the one who cancelled')` → `:126-128` same body with `kind: 'cancelled_by_manager'`. **End-to-end**: `AgendaPage.test.tsx:548-551` `expect(invoke).toHaveBeenNthCalledWith(2, 'notify-appointment', { body: { appointment_id: 'ap-1', kind: 'cancelled_by_manager' } })`, `:552` replacement success sentence, `:553-555` failure sentence gone, `:556` retry gone. **Handler**: `CancellationNotifier.tsx:48-58`, wired at `:79`. **Discrimination**: M9, M16 killed | ✅ PASS |
| **ACK-09** | WHEN the workspace has **no** active `agenda` recipient **AND** no `workspaces.notify_whatsapp` fallback THEN the system SHALL record the attempt as `no_whatsapp` and raise the ACK-07 failure notice, **without sending anything** | (i) zero provider calls, (ii) one log row with status `no_whatsapp`, (iii) `notify_status: 'no_whatsapp'` in the body, (iv) the panel raises the ACK-07 failure notice | **Server — all three halves**: `notify-appointment.test.ts:558` `it('reports no_whatsapp when the workspace has nobody to tell (ACK-03)')` *(title predates ACK-09 — content is ACK-09's server half, see judgement (b))* → setup `agendaRecipients: []`, `workspaceNotifyWhatsapp: null`, **`:572` `expect(calls).toHaveLength(0)` — nothing was sent**, **`:574` `expect(state.attempts).toEqual([{ attempt: 1, status: 'no_whatsapp', providerResponse: null }])` — recorded**, **`:575` `expect(result.body.notify_status).toBe('no_whatsapp')`**. **Client**: `useCollaboratorAppointments.test.tsx:348` → `:358-362` notice `status: 'no_whatsapp'`, `:365` `expect(invokeMock).toHaveBeenCalledTimes(1)` (exactly the one attempt, no extra send), `:366` `expect(calls.of('update')).toHaveLength(1)` (the cancellation stands). **UI raises the ACK-07 notice**: `CancellationNotifier.test.tsx:82-93` (see ACK-07 class 3). **Discrimination**: M4 (the "sent nothing" assertion is load-bearing), M5, M8 killed | ✅ PASS |

**Status**: **13/13 in-scope ACs matched the spec-defined outcome** · **1 spec-precision gap flagged (A′, Minor — narrowed from round-2 gap A)** · **round-2 gaps B and C closed** · **0 surviving mutants (16/16 killed)**.

### Spec-precision gaps

| ID | Where the spec is silent | What the code does | Assessment |
| -- | ------------------------ | ------------------ | ---------- |
| **A′** *(narrowed from round-1/2 gap A)* | `ACK-03` (`spec.md:218`) names only "the workspace's active `agenda` notification recipients". `ACK-09` (`:226`) now pins the **neither-set** outcome and *names* `workspaces.notify_whatsapp` as a "fallback", but **no WHEN/THEN states the positive branch**: *zero active `agenda` recipients **with** a `workspaces.notify_whatsapp` present → send to that number*. It is only derivable by elimination from ACK-03 + ACK-09. | `supabase/functions/_shared/notify-appointment.ts:200-209`: recipients when non-empty, else `workspaces.notify_whatsapp`, else `deliverToNumbers([])` → `no_whatsapp` (`:152-154`). Fallback branch asserted at `notify-appointment.test.ts:513` `it('falls back to the legacy workspace number when no agenda recipient is set (ACK-03)')` → `:527-528` `expect(calls).toHaveLength(1)` / `expect(numberOn(calls[0])).toBe('5511777770004')`. The rule is also documented in-repo at `supabase/migrations/20260626160000_notification_recipients.sql:3-6` and mirrored by `process-agenda-reminders`. The mechanism itself is source-scanned at `notify-appointment.test.ts:621-622` (Deno not installed, AD-003). | ⚠️ **Minor.** Round 2's gap A is **substantially closed**: the empty-recipient outcome is now a real AC (ACK-09) and is asserted on both sides, and the fallback is named in the spec rather than being an undocumented mechanism. What remains is one implied positive branch. Not a deviation and not a correctness risk — a future change to the fallback would have no AC to be checked against. |
| **B** *(round-1/2)* | ACK-05 said only "record the failed attempt"; nothing read it. | **Closed**: ACK-06…08 pin the success sentence, the failure sentence, the retry label and the replacement; `CancellationNotifier.tsx` renders them from both acting views (`AgendaPage.tsx:327`, `ColaboratorAgendaPage.tsx:120`). | ✅ **Closed** — re-verified this round (M10, M15 killed). |
| **C** *(round-2)* | ACK-07 said "delivery fails" without enumerating which verdicts count; `no_whatsapp` was asserted nowhere in the UI. | **Closed**: `e23b2ee` added `spec.md:224` enumerating `failed`, `timeout`, `no_whatsapp` and "does not resolve to a parseable verdict", and stating only an explicit `sent` is delivered. `49f88d8` added the UI assertion (`CancellationNotifier.test.tsx:82-93`) and the hook assertions for every unreadable shape. | ✅ **Closed** — all four classes now have evidence (table above) and are discriminated (M5, M6, M7, M1, M2, M3). |

---

## Round 2's survivor — proved dead by my own injection

Round 2's claim (a claim, not a fact): flipping `useCollaboratorAppointments.ts:52` and `:54` from `return 'failed'` to `return 'sent'` left all 241 unit tests green. **I did not read `49f88d8` and conclude.** I created a disposable `git worktree` at `0344d52`, injected the fault myself, ran the full suite, recorded the failures, restored, and re-ran green.

| Injection | Fault | Result | What killed it |
| --------- | ----- | ------ | -------------- |
| **M1 (both lines)** | `useCollaboratorAppointments.ts:52` **and** `:54` → `return 'sent'` — an `invoke` that throws, or answers with `error` set or with no recognised `notify_status`, is reported delivered | ❌ **KILLED** — exit 1, **5 failed / 241 passed** | `useCollaboratorAppointments.test.tsx` > `keeps the cancellation and reports an unverifiable delivery as undelivered (ACK-05, ACK-07)`; `reports a body with no verdict as an undelivered cancellation (ACK-07)`; `reports a verdict the edge function does not know as an undelivered cancellation (ACK-07)`; `reports an error response as an undelivered cancellation (ACK-07)`; `keeps the withdrawal and reports an unverifiable delivery as undelivered (ACK-05, ACK-07)` |
| **M2 (line 52 only)** | the **non-throw** fallback (`:52`) → `'sent'` — an unreadable *answer* is reported delivered | ❌ **KILLED** — exit 1, 3 failures | the three `it.each` unreadable-answer cases (`:324`) — **only** those, which proves the branch is isolated rather than failing incidentally |
| **M3 (line 54 only)** | the **catch** branch (`:54`) → `'sent'` — a rejected `invoke` is reported delivered | ❌ **KILLED** — exit 1, 2 failures | the two rejection fixtures (`:295`, `:507`) — collaborator and manager, **only** those |

**Round 2's survivor is dead, and both of its two sub-branches are separately discriminated.** The signature — each mutant fails *exactly* the tests written for that branch and nothing else — is what distinguishes a real kill from an incidental one.

Why it died: `49f88d8` added `expect(result.current.notice).toEqual({ appointmentId: 'ap-1', kind: …, status: 'failed' })` to the two fixtures that already provoked the branch (`:315-319`, `:522-526`) and added a new `it.each` covering the three unreadable-answer shapes (`:324-344`). **Test-only commit, no implementation change** — `git show --stat 49f88d8` = `spec.md` + 2 test files.

---

## Personal PJ agenda and the manager's view

**Claim under test**: `AgendaPJ.tsx` and `/pj/agenda` must **never** show Confirmar/Cancelar.

`EventPopoverContent` is shared by all three views; the only DOM the cancellation round added to it is the conditional block at `EventPopoverContent.tsx:78-95`, behind the gate at `:43-44`:

```ts
const canAnswer =
  event.kind === 'appointment' && event.status === 'pending' && !!onConfirm && !!onCancel;
```

| Surface | Supplies | Evidence it shows no answer action |
| ------- | -------- | ---------------------------------- |
| **Personal PJ agenda** (day / week / month) | `AgendaPJ.tsx:258`, `:268`, `:279` — `mode="edit"`, **no** `onConfirm`/`onCancel` (`grep -n "onConfirm\|onCancel" src/components/agenda/AgendaPJ.tsx` → **no matches**) | `src/components/agenda/AgendaPJ.test.tsx:92` `it('never offers the collaborator answer actions (COLAB-13 gate)')` → `:102` `expect(popover.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()`, `:103` same for `/Cancelar/`, **`:105` `expect(popover.getAllByRole('button')).toHaveLength(2)`** — a hard count, so any added button fails. Month grid: `AgendaPJ.test.tsx:76` → `:84` `/Confirmar/` `not.toBeInTheDocument()`, and the personal `Editar` still works (`:86-89`) |
| **Manager `/pj/agenda`** (month + day) | `AgendaPage.tsx:214-219` `mode="read"` with only `onDaySelect`, `:228` `mode="read"` — **no callbacks at all** (`grep -n "onConfirm\|onCancel" src/pages/PJ/AgendaPage.tsx` → **no matches**) | `AgendaPage.test.tsx:609` / `:635` prove the popover really holds the `Pendente` fixture, then **`:613` and `:636` `expect(popover.queryAllByRole('button')).toHaveLength(0)`**, plus `:614-615` / `:637-638` named negatives |
| **Shared component, callbacks supplied, event is not an appointment** | both callbacks | `views.test.tsx:382-429` (`COLAB-16`) — the `kind` conjunct isolated on its own |

**Enumeration, not assumption**: `grep -rn "onConfirm=\|onCancel=" src --include=*.tsx | grep -v .test.` returns callback supply **only** at `ColaboratorAgendaPage.tsx:131-132` and `:146-147`. The only non-test `Confirmar` in an agenda surface is `ColaboratorAgendaPage.tsx:195` (the collaborator's own list, `COLAB-06`). `AgendaPJ.tsx`'s two `Cancelar` hits (`:368`, `:387`) are dialog/form cancel buttons, not answer actions.

**Proof the guard is load-bearing**: under **M12** (callback conjunct removed) `AgendaPage`'s popover gains two buttons and `queryAllByRole('button')` returns 2 where the test demands 0 — the tests fail. So the manager's and personal views are not merely *currently* correct; a regression to them is **detected**.

---

## Discrimination Sensor

**Depth**: expanded — **16 mutants**; the dispatch mandated ≥8 with ≥5 targeting the post-round-2 commits. **9 of 16** target `e23b2ee`/`49f88d8` surfaces (M1, M2, M3, M4, M5, M6, M7, M8, and the ACK-08 direction of M9/M16 re-verified). All three mandated mutations are present: flip `:52`/`:54` to `'sent'` (**M1**) · drop the ACK-09 "sent nothing" assertion's subject (**M4**) · make `no_whatsapp` render the success sentence (**M5**).

**Isolation**: `git worktree add --detach "C:/Users/Luiz Rickston/tvc-scratch3" 0344d52`, with a Windows **directory junction** from the scratch `node_modules` to the real one (created with `New-Item -ItemType Junction`, removed with `[System.IO.Directory]::Delete` so the target was never touched). **Never `git stash`.** Every mutant applied with `sed`, restored with `git checkout -- <path>`, confirmed by `git diff` returning empty in the scratch.

**Baseline captured before any mutation**: `git status --porcelain` on the real tree = `?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`.
**Scratch baseline**: `npx vitest run` = **27 files, 246 passed, exit 0** before the first mutant.
**After cleanup**: scratch removed (`git worktree remove --force`), real-tree `git status --porcelain` **identical to baseline**, `node_modules` intact (449 entries), and a confirming re-run of the unit gate on the real tree = **246 passed, exit 0**.

| # | Mutation | File:line | Targets | Killed? |
| - | -------- | --------- | ------- | ------- |
| **M1** | **Round-2 survivor, re-injected**: both fallbacks `return 'failed'` → `return 'sent'` | `useCollaboratorAppointments.ts:52` **and** `:54` | `49f88d8` (ACK-07 unparseable, ACK-08 reachable) | ❌ **KILLED** — exit 1, 5 failed / 241 passed |
| **M2** | Only `:52` → `'sent'` (the non-throw "unreadable answer" fallback) | `useCollaboratorAppointments.ts:52` | `49f88d8` | ❌ **KILLED** — 3 failures, exactly the `it.each` unreadable-answer cases |
| **M3** | Only `:54` → `'sent'` (the `catch` "invoke rejected" fallback) | `useCollaboratorAppointments.ts:54` | `49f88d8` | ❌ **KILLED** — 2 failures, exactly the two rejection fixtures |
| **M4** | **ACK-09 "sent nothing"**: drop the `validNumbers(numbers)` filter on the `cancelled_by_collaborator` branch so the zero-recipient path actually calls the provider | `supabase/functions/_shared/notify-appointment.ts:206` | `e23b2ee` ACK-09 + `49f88d8` | ❌ **KILLED** — 1 failure: `notify-appointment.test.ts:572` `expect(calls).toHaveLength(0)` → *"expected [ { …(2) } ] to have a length of +0 but got 1"*. **The assertion's subject is load-bearing.** |
| **M5** | **`no_whatsapp` renders the success sentence**: `const delivered = status === 'sent'` → `status === 'sent' \|\| status === 'no_whatsapp'` | `CancellationNotifier.tsx:62` | `e23b2ee` ACK-07 class 3 | ❌ **KILLED** — 1 failure: `CancellationNotifier.test.tsx:82` (ACK-07, ACK-09) |
| **M6** | `delivered` → `status !== 'failed'` (a `timeout` — and a `no_whatsapp` — is shown as delivered) | `CancellationNotifier.tsx:62` | `e23b2ee` ACK-07 class 2 | ❌ **KILLED** — 3 failures: `:57` (timeout), `:66` (retry), `:82` (no_whatsapp) |
| **M7** | `delivered` → `status === 'sent' \|\| status === 'failed'` (a provider `failed` is shown as delivered) | `CancellationNotifier.tsx:62` | `e23b2ee` ACK-07 class 1 | ❌ **KILLED** — 6 failures across `CancellationNotifier.test.tsx` (×4), `ColaboratorAgendaPage.test.tsx:272`, `AgendaPage.test.tsx:515` |
| **M8** | ACK-09 server verdict fabricated: `deliverResult('no_whatsapp', null)` → `deliverResult('sent', null)` on the empty-numbers branch | `notify-appointment.ts:153` | `e23b2ee` ACK-09 | ❌ **KILLED** — 1 failure: `notify-appointment.test.ts:558` |
| **M9** | Retry hard-codes the act — `notice.kind` → `'cancelled_by_collaborator'` | `CancellationNotifier.tsx:54` | ACK-08 direction (re-verified) | ❌ **KILLED** — 2 failures: `CancellationNotifier.test.tsx:117`; `AgendaPage.test.tsx:515` |
| **M10** | Remove `<CancellationNotifier notice={cancel.notice} />` from the manager's page | `AgendaPage.tsx:327` | ACK-06/07 render | ❌ **KILLED** — 2 failures: `AgendaPage.test.tsx:515`, `:559` |
| **M11** | `.neq('status', 'cancelled')` no-op — line blanked from the shared read | `useCollaboratorAppointments.ts:124` | COLAB-14 / MGR-13 | ❌ **KILLED** — 2 failures: `useCollaboratorAppointments.test.tsx:581`, `AgendaPage.test.tsx:488` |
| **M12** | Drop `!!onConfirm && !!onCancel` from the answer gate | `EventPopoverContent.tsx:44` | COLAB-15 (round-1 survivor re-verified) | ❌ **KILLED** — 2 failures: `AgendaPage.test.tsx:592`, `:618` |
| **M13** | Drop `event.kind === 'appointment'` from the answer gate | `EventPopoverContent.tsx:44` | COLAB-16 (round-1 survivor re-verified) | ❌ **KILLED** — 4 failures: `views.test.tsx:385`, `:409` ×2 kinds each |
| **M14** | `if (action === 'cancel')` → `if (true)` — a **confirm** now sends | `useCollaboratorAppointments.ts:353` | ACK-02 | ❌ **KILLED** — 2 failures: `useCollaboratorAppointments.test.tsx:269`, `:408` |
| **M15** | Remove `<CancellationNotifier notice={respond.notice} />` from the collaborator's page | `ColaboratorAgendaPage.tsx:120` | ACK-06/07 render | ❌ **KILLED** — 2 failures: `ColaboratorAgendaPage.test.tsx:260`, `:272` |
| **M16** | Drop the retry handler — `onClick={() => void retry()}` → `onClick={() => undefined}` (button still renders) | `CancellationNotifier.tsx:79` | ACK-08 | ❌ **KILLED** — 4 failures: `CancellationNotifier.test.tsx:66`, `:97`, `:117`; `AgendaPage.test.tsx:515` |

**Result**: **16 injected, 16 killed, 0 survived** → ✅ **PASS**

Every mandated mutation is answered: round-2 survivor (M1, M2, M3) · ACK-09 "sent nothing" subject (M4) · `no_whatsapp` as success (M5) · plus all four ACK-07 failure classes (M5, M6, M7, and M1/M2/M3 for the unparseable class) and both round-1 conjuncts (M12, M13).

---

## Independent Judgements

### (a) Were the two test titles extended (`:295`, `:507`) without weakening any assertion?

**Yes — verified against `git diff`, not against the commit message.** `git show 49f88d8 -- '*.test.ts*'` contains exactly **two** deleted lines, both of them `it(` titles:

```
-  it('keeps the cancellation when the notification call fails (ACK-05)', async () => {
-  it('keeps the withdrawal when the notification call fails (ACK-05)', async () => {
```

replaced by `'keeps the cancellation and reports an unverifiable delivery as undelivered (ACK-05, ACK-07)'` and `'keeps the withdrawal and reports an unverifiable delivery as undelivered (ACK-05, ACK-07)'`. **Zero `expect` lines removed** (grep over `^-\s*expect\(` → empty), **zero assertions altered**; 82 lines added. The pre-existing assertions in both tests (`resolves.toMatchObject({ status: 'cancelled' })`, `toHaveBeenCalledTimes(1)`, `calls.of('update')`) are untouched and still present — I read both tests at HEAD (`:304-311`, `:514-519`). Widening a title to name a second AC while only *adding* an assertion is a strengthening, not a weakening.

I also swept the whole range: `git diff f397c76..HEAD -- '*.test.ts*' | grep "^-\s*expect\("` → **6 removals total**, all accounted for and all correct under the spec amendments:
- `expect(await screen.findByText('Cancelado')).toBeInTheDocument()` ×2 and `expect(screen.getByText('Cancelado')).toBeInTheDocument()` — removed by `9f024a2` when **COLAB-14/MGR-13 superseded** "render with a Cancelado badge" with "do not render at all". The replacement asserts **absence** (`queryByText('Cancelado')` `not.toBeInTheDocument()`), which is stricter.
- `queryByRole('button', { name: /Confirmar|Cancelar/ })` `not.toBeInTheDocument()` ×3 — replaced by a **hard 0-button count**, which is stricter.
- `expect(source).not.toMatch(/functions\.invoke|notify-appointment|AGZAP/i)` — a coarse source scan removed by `009a5a0` and replaced with precise per-test assertions (`:278`, `:456`) plus the server `KINDS` declaration (`:436-440`), which is stricter.
- The four removed `it(` titles are all supersessions (`sends no notification on any path` → `sends no notification on an edit` under the ACK-04 reversal; `exposes exactly one operation` → `exposes exactly one handler`; `shows no actions for a cancelled appointment (COLAB-07)` → COLAB-14's absence test).

**No assertion in scope was weakened at any point in `f397c76..HEAD`.**

### (b) Is the `no_whatsapp` **server-side** half (`notify-appointment.test.ts:558-576`) genuinely evidence, not an unclaimed gap?

**Genuine evidence for ACK-09 — with one cosmetic traceability nit.**

- Before `e23b2ee` this test *was* effectively unclaimed: it asserted an outcome no AC specified (that was round-2 gap A). **ACK-09 now specifies exactly it** — "record the attempt as `no_whatsapp` … without sending anything" — so the test's three assertions map one-to-one onto the AC: `:572` *without sending anything*, `:574` *record the attempt as `no_whatsapp`*, `:575` the body verdict the client keys the notice on. The test is **claimed, not orphaned**.
- It is **not** merely an assertion that the code happens to have: **M4** (dropping the `validNumbers` filter so the zero-recipient path actually sends) fails at **`:572`** with *"expected [ { …(2) } ] to have a length of +0 but got 1"*. The subject of that assertion — the provider call list — is load-bearing. M8 (fabricating `sent` instead of `no_whatsapp`) fails at the same test. So the AC's "nothing sent" and "record `no_whatsapp`" halves are both enforced.
- **Nit**: the test title still reads `(ACK-03)`, the AC numbering it was written under; ACK-09 did not exist yet. A title-based traceability scan would mis-attribute it. **Cosmetic only** — the assertions match ACK-09's spec-defined outcome, and the AC's other half (raising the ACK-07 failure notice) is asserted at `CancellationNotifier.test.tsx:82-93` and `useCollaboratorAppointments.test.tsx:348-367`, both correctly titled. Not a coverage gap; worth a one-word title edit, not a fix task.

### (c) `git diff --name-only f397c76..HEAD -- supabase/migrations/`

**Empty, exit 0 — re-run myself, not inherited.** Zero migration files in the 13-commit range. Every object this scope touches already exists and predates it: `notification_recipients` (`20260626160000_notification_recipients.sql`), `workspaces.notify_whatsapp` (`20260623120000_task_status_notify.sql`), `collaborator_appointments` + its `status` column and cancel trigger (`20261019120000` / `20261019120100` / `20261019130000`), `appointment_notification_log` and its `UNIQUE(appointment_id, attempt)` (`20261019150000_collaborator_appointment_ack_notification.sql`). The change is code-only: client TypeScript, one edge function, two `_shared` modules, plus docs. `supabase functions deploy notify-appointment` remains a **deploy** task (and, per `0344d52`, must precede the front-end push) — not a migration.

### (d) Is the cancellation rate limit still absent, and is leaving it unspecified defensible?

**Absent — confirmed in both directions, and leaving it unspecified is defensible.**

- **Absent in the spec**: `grep -niE "rate|limite|cooldown|throttle|flood|abuse" .specs/features/collaborator-agenda/spec.md` returns only false positives (`corporate_team`). No AC imposes a rate, a cap or a cooldown on `Tentar novamente`.
- **Absent in the code**: `grep -rniE "ratelimit|rate_limit|cooldown|throttle"` over `src/components/agenda`, `src/hooks/useCollaboratorAppointments.ts`, `supabase/functions/notify-appointment`, `supabase/functions/_shared/notify-appointment.ts` → **no matches**. The only guard shipped is `disabled={resending}` (`CancellationNotifier.tsx:80`), which blocks a second click **while one is in flight** but not sequential clicks after it settles. `nextAttempt` → `max(attempt) + 1` with `UNIQUE(appointment_id, attempt)` dedupes *concurrent* invocations of the same attempt (that is `NOTIF-04`'s requirement), not how many attempts a user may cause. So N clicks → N log rows → N WhatsApp messages.
- **Defensible**: yes. `ACK-08` (`spec.md:225`) says only "attempt delivery again and, on success, replace the failure notice". No AC bounds it, and the pre-existing creation-side `Reenviar` (`NOTIF-03`) is unbounded in exactly the same way — so the cancellation path is *consistent* with the feature it mirrors, not a new hole. Adding a cap would implement something the spec does not ask for (coding principle: no features beyond what was asked), and it would be untestable against any AC. **Recommendation, not a fix task**: one line under `ACK-08` naming the intended bound, so the property stops being accidental — the same recommendation round 2 made, still open, still Minor.

---

## Also checked

| Check | Result |
| ----- | ------ |
| **Any test contradicting `spec.md`?** | **No.** `grep -rn "Compromisso cancelado" src tests supabase` → every hit is either an `ACK-06`/`ACK-07` literal (full stop / full failure sentence) or `CancellationNotifier.tsx`'s own constants. The single different string, `tests/db/notification-collaborator-appointment-ack.test.ts:141` `expect(row!.title).toBe('Compromisso cancelado')`, is the **ACK-01 in-app notification** row — a different surface the spec does not pin (and the same string the migration itself writes at `20261019150000:32`). `grep "'Cancelado'"` in scope returns only two hits, `ColaboratorAgendaPage.test.tsx:202` and `AgendaPage.test.tsx:506`, both asserting **absence**, exactly as COLAB-14 / MGR-13 require. |
| **Notice strings asserted verbatim, not against the exported constants?** | **Retyped literals — and that is the stronger choice, re-confirmed.** `CancellationNotifier.test.tsx`, `AgendaPage.test.tsx` and `ColaboratorAgendaPage.test.tsx` all write `'Compromisso cancelado.'` / `'Compromisso cancelado, mas o aviso não foi enviado.'` / `'Tentar novamente'` inline; **none imports** `CANCELLED_NOTICE`, `CANCEL_FAILED_NOTICE` or `RETRY_NOTICE_LABEL` (`grep -n "CANCELLED_NOTICE\|CANCEL_FAILED_NOTICE\|RETRY_NOTICE_LABEL" src --include=*.test.tsx` → no hits). Had they imported them, editing an exported constant would drag the tests along and the edit would survive the sensor; round 2's M12 (mutating the constants) killed **10 tests** precisely because they are retyped. **Retyping is correct here; importing would be a regression.** |
| **Any test removed or weakened since round 2 (`7ec85f7..HEAD`)?** | **No.** `git diff 7ec85f7..HEAD -- '*.test.ts*'` → exactly 2 deleted lines, both `it(` titles (judgement a); 0 deleted `expect` lines; 82 added lines. |
| **Test-count integrity** | `git grep -c -E "^\s*(it\|test)\("` → `f397c76` = **248** declarations, `HEAD` = **295** (**+47**, monotonic). Executed: 161 unit (round 1) → 241 (round 2) → **246** unit (**+5** from `49f88d8`: 2 titles rewritten + 1 new test + 1 `it.each` expanding to 3 cases); **63** db unchanged. No count decreased anywhere. |
| **Any AC implemented differently from spec?** | **No** for the thirteen in scope. `COLAB-13` uses one popover per view rather than a dialog — the spec says "an affordance", not a widget. `COLAB-14` / `MGR-13` are implemented once in the shared hook, which "SHALL not render" permits. `ACK-06…09` are client state, not persisted — the spec says "display … in the acting party's own view", which is what happens. `ACK-09`'s `no_whatsapp` verdict travels in `CancellationNotice`, not in `notify_status`, which is correct because `notify_status` belongs to the creation notice (`_shared/notify-appointment.ts:256-258`). |
| **Supersession annotations** | **All present**: `MGR-09` → `spec.md:114`; `NOTIF-07` → `:138`; `ACK-02` → `:230` ("reversed … 2026-10-22 … Confirming still sends nothing"); `COLAB-07` → `:158` (`VACUOUS for cancelled since COLAB-14`). |
| **`// SPEC_DEVIATION` added in this range?** | **No.** Every `SPEC_DEVIATION` in the tree predates the cancellation round and lives in migrations outside the scope. |
| **Round-2's claim that "timeout was unasserted"** | **The persisted round-2 report makes no such claim** — I read it end to end: its gap C says *"`failed` and `timeout` are pinned by tests (`CancellationNotifier.test.tsx:47`, `:57`)"*. Whatever text carried that error (chat, or a fix-task description) does not appear in `validation.md`. Independently confirmed anyway: **`timeout` is asserted in three places** — `CancellationNotifier.test.tsx:57-64` (UI), `useCollaboratorAppointments.test.tsx:548-563` (manager hook), and it is *discriminated* by **M6**, which fails `CancellationNotifier.test.tsx:57` when `timeout` is shown as delivered. Round 2's report was right on this point; I did not take that on trust either. |

---

## Gate Check

Run by hand on the real tree at `HEAD = 0344d52`, **before** any sensor work, and the unit + type gates re-run **after** the sensor to prove restoration.

| Gate | Command | Result | Exit |
| ---- | ------- | ------ | ---- |
| Unit | `npm run test` | **27 files, 246 passed, 0 failed, 0 skipped** | **0** |
| Database | `npm run test:db` | **6 files, 63 passed, 0 failed, 0 skipped** | **0** |
| Types | `npx tsc --noEmit` | no output (0 bytes) | **0** |
| *Post-sensor unit* | `npx vitest run` | **27 files, 246 passed** | **0** |
| *Post-sensor types* | `npx tsc --noEmit` | no output | **0** |

- **Gate command source**: `tasks.md` → Gate Check Commands (`npm run test`, `npm run test:db`, `npx tsc --noEmit`).
- **Test count before this feature**: 248 declarations at `f397c76`.
- **Test count after**: 295 declarations at `HEAD` (executed **246** unit / **63** db).
- **Delta**: **+47 declarations, +85 executed unit, +2 executed db** — no decrease, no weakening.
- **Skipped tests**: **none** in any of the three gates.
- **Failures**: **none**.
- The prior-round baseline in the dispatch (246 unit / 63 db / tsc exit 0) is **confirmed exactly**.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ — `e23b2ee` adds two spec sentences; `49f88d8` adds assertions only. No implementation change since `7ec85f7`. |
| No abstractions for single-use code | ✅ — `CancellationNotifier` has one prop and one job; `sendCancellationNotice` is one function used by two hooks and one retry |
| No unnecessary "flexibility" added | ✅ — `CancellationDelivery` is a closed 4-value union validated against `DELIVERY_VERDICTS` (`useCollaboratorAppointments.ts:24`, `:49`) before being trusted |
| Only touched files required for task | ✅ — `49f88d8` = 3 files (spec + 2 test files), all on the ACK-07/ACK-09 path; `e23b2ee` = docs only |
| Didn't "improve" unrelated code | ✅ — no assertion outside the ACK-05/ACK-07 tests was altered |
| Matches existing patterns/style | ✅ — same `data-testid` / `data-status` block shape and Portuguese AC-citing comments as `AppointmentNotifier`; `NOTIFY_FUNCTION` re-exported, not duplicated |
| Tests map to ACs, non-shallow | ✅ — every new `it(` names its AC; assertions are on payload, exact text and exact counts, not on call existence |
| Spec-anchored outcome check | ⚠️ **1 spec-precision gap (A′, Minor)** — flagged, not silently passed; B and C **closed** |
| Per-layer coverage | ✅ — edge/`_shared` domain 1:1 with ACK-03…05 and ACK-09's server half; client hooks 1:1 with ACK-02…09; component 1:1 with ACK-06…08; both page surfaces covered |
| No unclaimed tests | ✅ — every test in the scope names an AC or a declared supersession; the one stale title (`notify-appointment.test.ts:558`, says ACK-03, content is ACK-09) is recorded as judgement (b)'s cosmetic nit |
| **Discrimination sensor** | ✅ **16/16 killed** |

**Documented guidelines**: `references/coding-principles.md` (via `validate.md §6`) and `references/lessons.md`. No project-local `CLAUDE.md` quality rules apply.

---

## Edge Cases

- [x] **An unverifiable delivery is never reported as delivered** — `useCollaboratorAppointments.ts:52`/`:54` + `useCollaboratorAppointments.test.tsx:315-319`, `:338-343`, `:522-526`; **M1, M2, M3 all killed** — round 2's open item, **closed**.
- [x] **All four ACK-07 failure classes raise the failure notice** — `failed` (`CancellationNotifier.test.tsx:47`), `timeout` (`:57`), `no_whatsapp` (`:82`), unparseable (`useCollaboratorAppointments.test.tsx:295`, `:324`); discriminated by M5, M6, M7, M1.
- [x] **ACK-09 sends nothing** — `notify-appointment.test.ts:572`; **M4** proves it load-bearing.
- [x] **Delivery failure never rolls back a cancellation** — `notify-appointment.test.ts:550` + `useCollaboratorAppointments.test.tsx:304-311`, `:514-519`; both directions.
- [x] **Confirm sends nothing while cancel sends** — `:278` vs `:290`; `:417` notice null; `notify-appointment.test.ts:436-440` proves no confirm reason exists; **M14** killed.
- [x] **The two cancellation directions never cross** — `notify-appointment.test.ts:493` (workspace recipients, never the collaborator) vs `:466` (the collaborator's digits); **M9** killed.
- [x] **Cancelled row keeps its DB record** — hidden only at read time (`useCollaboratorAppointments.ts:124`); `AgendaPage.test.tsx:507` proves no write happens either; **M11** killed.
- [x] **Manager's own calendar still never queries the feature table** — `AgendaPage.test.tsx:226`.
- [x] **Month-grid tap does not leak to day selection** — `views.test.tsx:333`.
- [x] **Personal agenda popover button count pinned at 2** — `AgendaPJ.test.tsx:105`.
- [x] **`/pj/agenda` popover holds exactly 0 buttons** — `AgendaPage.test.tsx:613`, `:636`; **M12** killed.
- [x] **Retry keeps the original actor's act** — `CancellationNotifier.test.tsx:117-130`; **M9** killed.
- [ ] **`ACK-08` retry has a rate bound** — not handled, **not in scope** (judgement d): no AC covers it. Recommendation only.

---

## Requirement Traceability Update

| Requirement | Previous status (round 2) | New status |
| ----------- | ------------------------- | ---------- |
| COLAB-13 | ✅ Verified | ✅ **Verified** — M12/M13 re-killed by injection |
| COLAB-14 | ✅ Verified | ✅ **Verified** — M11 killed; citation re-pointed to `:581`/`:593` |
| COLAB-15 | ✅ Verified | ✅ **Verified** — M12 killed |
| COLAB-16 | ✅ Verified | ✅ **Verified** — M13 killed |
| MGR-13 | ✅ Verified | ✅ **Verified** — M11 killed; own-mode half asserted via the spec's own edge case |
| ACK-02 | ✅ Verified | ✅ **Verified** — M14 killed |
| ACK-03 | ⚠️ Verified w/ gap A | ⚠️ **Verified with spec-precision gap A′ (narrowed)** — empty-recipient outcome now pinned by ACK-09; fallback's positive branch still implied |
| ACK-04 | ✅ Verified | ✅ **Verified** |
| ACK-05 | ✅ Verified | ✅ **Verified** |
| ACK-06 | ✅ Verified | ✅ **Verified** — M10, M15 killed |
| ACK-07 | ❌ **Needs Fix** (M3b survived; gap C) | ✅ **Verified** — M3b killed by my own injection (M1/M2/M3); **gap C closed** by `e23b2ee` + `49f88d8`; all four classes asserted and discriminated (M5, M6, M7) |
| ACK-08 | ✅ Verified | ✅ **Verified** — M9, M16 killed; unreachable-without-retry risk removed with M3b |
| ACK-09 | *(did not exist)* | ✅ **Verified** — `notify-appointment.test.ts:558-576` + `useCollaboratorAppointments.test.tsx:348` + `CancellationNotifier.test.tsx:82`; M4, M5, M8 killed |

`spec.md` was **not** edited by this Verifier (read-only over the real tree apart from this file).

---

## Fix Plans

### Observation (not a fix task): pin ACK-03's fallback positive branch

- **Root cause**: gap A′ — `spec.md:218` + `:226` leave "zero `agenda` recipients **with** a `workspaces.notify_whatsapp` present → send to that number" derivable by elimination only.
- **Suggested wording** (spec-only, no code): one sentence under ACK-03 — *WHEN the workspace has no active `agenda` recipient THEN send to `workspaces.notify_whatsapp` instead; when neither exists, ACK-09 applies.*
- **Priority**: **Minor.** Behaviour is correct, documented in-repo, and asserted (`notify-appointment.test.ts:513-529`).

### Observation (not a fix task): `ACK-08` retry has no rate bound

- See judgement (d). Recommend one line under `ACK-08`, not code.

### Observation (cosmetic): stale AC id in one test title

- `notify-appointment.test.ts:558` `it('reports no_whatsapp when the workspace has nobody to tell (ACK-03)')` — content is ACK-09's server half. One-word title edit for traceability. No coverage impact.

---

## Summary

**Overall**: ✅ **Ready** — 16/16 mutants killed, 13/13 ACs evidenced, all three gates green.

**Round-2 survivor**: **dead** — proved by my own injection in a disposable worktree (M1: 5 failed / 241 passed, exit 1), and both of its sub-branches separately discriminated (M2: 3 failures; M3: 2 failures), each failing *only* the tests written for that branch.

**Spec-anchored check**: **13/13 in-scope ACs matched the spec-defined outcome** · **1 spec-precision gap flagged** (A′, Minor, narrowed; round-2 gaps **B** and **C** both **closed**).
**Gate**: **246 unit + 63 db passed, 0 failed, 0 skipped; `tsc --noEmit` exit 0** — all three run by hand before the sensor, unit + type re-run green after it.
**Sensor**: **16 injected, 16 killed, 0 survived** in a disposable `git worktree`; real-tree `git status --porcelain` identical to the pre-sensor baseline (the four `??` skill dirs); scratch removed; `node_modules` intact.
**Personal + manager views**: **unaffected and discriminated** — `AgendaPJ.tsx` supplies neither callback (2-button count pinned at `AgendaPJ.test.tsx:105`), `AgendaPage.tsx` supplies neither over `pending` appointment events (0-button count pinned at `AgendaPage.test.tsx:613` / `:636`), only `ColaboratorAgendaPage.tsx` supplies callbacks anywhere in `src`, and **M12** proves that guard is enforced rather than merely present.

**What works**: month/week/day answer actions with correct payloads; `cancelled` dropped from both pages at one shared query; two-direction cancellation notification with workspace-scoped recipients and no hardcoded number; confirm sends nothing; a cancellation is never undone by a delivery problem; all four ACK-07 failure classes raise the pinned failure sentence with `Tentar novamente` in both acting views; the zero-recipient case sends nothing and still tells the user; the spec-pinned notices render verbatim with a working, actor-preserving retry; personal agenda clean; no migration added; all four supersession annotations present.

**Issues found**: none blocking. Three observations, all Minor and none a fix task: **A′** (spec wording for the fallback's positive branch), **ACK-08 rate bound** (unspecified, out of scope), **one stale test title**.

**Next steps**: this is the final permitted verification of the cancellation scope. Record nothing further unless the user asks for the two spec-wording observations.
