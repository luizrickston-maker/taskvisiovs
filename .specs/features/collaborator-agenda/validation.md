# Collaborator Agenda Validation

**Date**: 2026-10-20
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `1716a95..HEAD` — 24 commits (`bff5c7b` … `f9d3acc`, enumerated with `git log --oneline 1716a95..HEAD`)
**Verifier**: independent sub-agent (author ≠ verifier). Re-derived every expected outcome from `spec.md` only; no claim from any earlier report was accepted without re-verification.

**Verdict**: ❌ **FAIL**

Legend: ✅ PASS = evidence at `file:line` whose asserted value matches the spec-defined outcome · 🔶 Partial = one half of the criterion evidenced, the other not · ⚠️ Spec-precision gap = spec defines no precise outcome for that element · ❌ GAP = no evidence found after searching, or the spec outcome is not met.

---

## Task Completion

All 18 tasks in `tasks.md` are marked done (105 `- [x]`, 0 `- [ ]`), and each named commit exists in the range.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Vitest harness | ✅ Done | `30264e9`, `bff5c7b` |
| T2 DB harness | ✅ Done | `c33390b` |
| T3 schedule primitives | ✅ Done | `31fc6e2` |
| T4 schema + RLS | ✅ Done | `68e6a84` |
| T5 conflict + transition | ✅ Done | `57b0280` |
| T6 shared message module | ✅ Done | `4a63924` |
| T7 notify-appointment | ✅ Done | `abad55c` |
| T8 view extraction | ✅ Done | `e1f621e` |
| T9 CalendarEvent mappers | ✅ Done | `211e11f` |
| T10 availability hook | ✅ Done | `79a8043` |
| T11 availability form | ✅ Done | `8e84717` |
| T12 appointment hook | ✅ Done | `b31b0ce` |
| T13 collaborator page | ✅ Done | `4516f3c` |
| T14 route/nav/permission | ✅ Done | `9d3ee99` |
| T15 selector | ✅ Done | `32c5db1` |
| T16 manager agenda wiring | ✅ Done | `16c1923` |
| T17 notification + status | ✅ Done | `dc0b0ba` |
| T18 realtime bindings | ✅ Done | `e6ad2e0` |
| — (unplanned follow-ups) | ✅ Done | `5212a98` member-active guard, `30d7c92` manager cancel, `f9d3acc` spec correction |

---

## Spec-Anchored Acceptance Criteria (53)

### P1 — Collaborator declares unavailable time

| # | Criterion (WHEN/WHILE/IF THEN) | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | ------------------------------ | -------------------- | ---------------------------------- | ------ |
| AVAIL-01 | submits 14:00–16:00 on 2026-11-05 | one row, both dates `2026-11-05`, `start_time` `14:00`, `end_time` `16:00` | `tests/db/schema-collaborator-agenda.test.ts:199` — `expect(inserted.rows[0]).toEqual({ start_date:'2026-11-05', end_date:'2026-11-05', start_time:'14:00', end_time:'16:00' })`; `src/components/areapj/AvailabilityForm.test.tsx:167` — `expect(mutateAsync).toHaveBeenCalledWith({ start_date:'2026-11-05', end_date:'2026-11-05', start_time:'14:00', end_time:'16:00', reason:null })` | ✅ PASS |
| AVAIL-02 | submits 2026-12-01→2026-12-31, no times | one row, both times `NULL`, both dates set | `tests/db/schema-collaborator-agenda.test.ts:175` — `expect(inserted.rows[0]).toEqual({ start_date:'2026-12-01', end_date:'2026-12-31', start_time:null, end_time:null, workspace_id:WORKSPACE_A, member_user_id:COLLABORATOR_A })`; `src/components/areapj/AvailabilityForm.test.tsx:212` — same dates, `reason:null` | ✅ PASS |
| AVAIL-03 | submits 2026-11-10→2026-11-14, no times | a **single** row covering all five days inclusively | `src/hooks/useCollaboratorAvailability.test.tsx:168` — `expect(fromMock.callsFor('insert')[0]).toEqual([{ start_date:'2026-11-10', end_date:'2026-11-14', start_time:null, end_time:null, …}])` (one insert call, one row shape); `src/components/agenda/CalendarEvent.test.ts:88` — `expect(events.map(e => e.date)).toEqual(['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14'])` | ✅ PASS |
| AVAIL-04 | `start_date` later than `end_date` | reject, display `A data final deve ser igual ou posterior à data inicial.`, no DB write | `src/components/areapj/AvailabilityForm.test.tsx:43` — `expect(result.error?.issues[0].message).toBe(AVAIL_DATE_ORDER_ERROR)` (literal at `AvailabilityForm.tsx:23` is byte-equal to the spec string); `:199` rendered text + `:201` `expect(mutateAsync).not.toHaveBeenCalled()`; `tests/db/schema-collaborator-agenda.test.ts:121` — `{ code:'23514', constraint:'collaborator_availability_dates_check' }` | ✅ PASS |
| AVAIL-05 | time-bounded submission whose dates differ | reject, display `Horários só podem ser usados em um único dia.`, no DB write | `src/components/areapj/AvailabilityForm.test.tsx:55` — `expect(result.error?.issues[0].message).toBe(AVAIL_SINGLE_DAY_ERROR)` (literal `AvailabilityForm.tsx:24` matches spec exactly); `tests/db/schema-collaborator-agenda.test.ts:143` — `{ code:'23514', constraint:'collaborator_availability_times_single_day_check' }`. *Note: only the schema (the form's resolver) is asserted; unlike AVAIL-04/06 no rendered-dialog case exists.* | ✅ PASS |
| AVAIL-06 | `start_time` ≥ `end_time` | reject, display `O horário final deve ser posterior ao inicial.`, no DB write | `src/components/areapj/AvailabilityForm.test.tsx:68` — `expect(result.error?.issues[0].message).toBe(AVAIL_TIME_ORDER_ERROR)` over `['16:00','14:00']` **and** `['16:00','16:00']`; `:185` rendered + `:187` `expect(mutateAsync).not.toHaveBeenCalled()`; `tests/db/schema-collaborator-agenda.test.ts:154` — `{ code:'23514', constraint:'collaborator_availability_times_order_check' }` | ✅ PASS |
| AVAIL-07 | rows exist in period | each rendered as a distinct blocked block over affected days/hours | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:98` — `expect([...chips].some(c => c.textContent?.includes('Consulta médica'))).toBe(true)` and `:100` `getAllByText(...).length).toBeGreaterThanOrEqual(2)`; `src/components/agenda/CalendarEvent.test.ts:88` (per-day expansion), `:106-107` (`start:'13:00'`, `end:'18:00'`), `:113` (whole day `00:00`–`23:59`) | ✅ PASS |
| AVAIL-08 | (ubiquitous) | `workspace_id` and `member_user_id` populated, non-null | `tests/db/schema-collaborator-agenda.test.ts:175` — returned row asserts `workspace_id: WORKSPACE_A, member_user_id: COLLABORATOR_A`; `src/hooks/useCollaboratorAvailability.test.tsx:168` — insert payload contains `workspace_id:'ws-1', member_user_id:'member-1'` | ✅ PASS |
| AVAIL-09 | collaborator deletes a row | row removed + calendar re-renders without a full reload | `src/hooks/useCollaboratorAvailability.test.tsx:184` — `expect(fromMock.callsFor('eq')[0]).toEqual(['id','av-1'])`, `:185` `expect(invalidate).toHaveBeenCalledWith({ queryKey:['collab-availability'] })` | 🔶 **Partial** — hook proven, but `useDeleteAvailability` has **zero call sites outside its own test** (`grep useDeleteAvailability src/` → only the test). Neither `ColaboratorAgendaPage.tsx` (renders views in `mode="read"`, passes no `onRequestDelete`) nor any other component offers a delete affordance, so "WHEN the collaborator deletes" cannot occur in the product. |
| AVAIL-10 | unavailability overlaps a `pending`/`confirmed` appointment | save the unavailability **and** render a conflict badge on that appointment **in both views** | **❌ no evidence.** No test asserts a conflict badge on an appointment in either page: `grep -rn "conflicted" src --include=*.test.*` returns only `src/components/agenda/CalendarEvent.test.ts:75` (`expect(event.conflicted).toBe(true)`, mapper only) and `src/components/agenda/views/views.test.tsx:143` (event-vs-event, personal blocks). No test asserts that saving an unavailability over an existing appointment succeeds. Confirmed empirically by sensor mutants **M8** and **M9** (both survived). | ❌ GAP |
| AVAIL-11 | (ubiquitous) | reject submission where `member_user_id` ≠ authenticated user | `tests/db/schema-collaborator-agenda.test.ts:321` — `{ code:'42501', messageIncludes:'collaborator_availability' }` and `:330` `expect(persisted.rows[0].count).toBe('0')` | ✅ PASS |

### P1 — Manager views a collaborator's calendar and books without conflict

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| MGR-01 | opens `/pj/agenda` | selector lists **exactly** `is_active = true` AND `member_user_id IS NOT NULL` | `src/components/agenda/CollaboratorSelector.test.tsx:57` — `expect(collaboratorOptionsFromTeam(TEAM)).toEqual([{id:'uid-maria',…},{id:'uid-joao',…}])`; `:65` `expect(ids).not.toContain('uid-carlos')`; `:71` `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])`; rendered `:89-90` `expect(labels).not.toContain('Carlos Dias')` / `not.toContain('Débora Lima')` | ✅ PASS |
| MGR-02 | opens without changing selector | manager's own `time_blocks`, current behavior unchanged | `src/pages/PJ/AgendaPage.test.tsx:226` — `expect(calls.from('collaborator_appointments')).toHaveLength(0)`, `:227` same for `collaborator_availability`, `:224` personal block rendered | ✅ PASS |
| MGR-03 | selects a collaborator | replace events with their appointments + unavailability; **not** the personal `time_blocks` | `src/pages/PJ/AgendaPage.test.tsx:242` — `expect(screen.queryByText('Meu bloco pessoal')).not.toBeInTheDocument()`; `:241` appointment rendered; `:244` `expect(calls.eqs()…).toContainEqual(['member_user_id','uid-maria'])` | ✅ PASS |
| MGR-04 | create overlapping unavailability | refuse, persist **nothing**, display `Este período está indisponível para {nome} de {início} a {fim}.` | `tests/db/behavior-collaborator-agenda.test.ts:115` — `{ code:'23P01', messageIncludes:'Este período está indisponível para Colaborador C de ' }` + `:124` `expect(persisted.rows[0].count).toBe('0')`; `src/hooks/useCollaboratorAppointments.test.tsx:177` — `expect(formatConflictMessage('Maria','01/12/2026','31/12/2026')).toBe('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.')`; `src/pages/PJ/AgendaPage.test.tsx:328` `toHaveTextContent(expected)` + `:329` `expect(calls.inserts()).toHaveLength(0)` | ✅ PASS — **⚠️ Spec-precision gap #1**: the spec never says whether `{início}`/`{fim}` are the availability bounds or the proposed window (flagged in code at `20261019120100_collaborator_agenda_behavior.sql:65-68` as `SPEC_PRECISION_GAP`). Tests pin the availability-bounds reading. |
| MGR-05 | create with no overlap | one row, `status = 'pending'`, collaborator's `member_user_id`, manager's `workspace_id` | `tests/db/schema-collaborator-agenda.test.ts:256` — `expect(inserted.rows[0]).toEqual({ status:'pending', member_user_id:COLLABORATOR_A, workspace_id:WORKSPACE_A, created_by:MANAGER_A })`; `src/pages/PJ/AgendaPage.test.tsx:356` insert payload `workspace_id:'ws-1', member_user_id:'uid-maria', created_by:MANAGER_ID` | ✅ PASS |
| MGR-06 | two managers create **overlapping** appointments concurrently | **both rows persisted**, no data loss (conflict scoped to unavailability only) | **❌ no evidence.** No test inserts two mutually overlapping appointments: `grep` for concurrency/overlap-of-appointments across `tests/`, `src/`, `supabase/` returns nothing; the only two appointments inserted on the same date in `tests/db/behavior-collaborator-agenda.test.ts:153,160` are `06:00–09:00` and `12:00–13:00` (touching nothing). Confirmed empirically by sensor mutant **M11** (survived). | ❌ GAP |
| MGR-07 | collaborator has no `corporate_team.whatsapp` | **still create** the appointment, display `Colaborador sem WhatsApp cadastrado — notificação não enviada.` + manual resend | `src/components/agenda/AppointmentNotifier.test.tsx:108` — `expect(await screen.findByText(NO_WHATSAPP_MESSAGE)).toBeInTheDocument()` (literal at `AppointmentNotifier.tsx:25-26` is byte-equal to the spec string), `:110` `expect(screen.getByRole('button',{name:/Reenviar/})).toBeInTheDocument()`, `:111` `invokeMock` called once (the row exists ⇒ the create succeeded); `supabase/functions/notify-appointment/notify-appointment.test.ts:286-292` — `expect(calls).toHaveLength(0)`, `notify_status='no_whatsapp'`, `state.appointment?.status).toBe('pending')` | ✅ PASS |
| MGR-08 | (ubiquitous) | deny a manager **read or write** on any row whose `workspace_id` differs from their workspaces | Read half: `tests/db/schema-collaborator-agenda.test.ts:274` — `expect(appointments.rows[0].count).toBe('0')` and `:275` same for availability, as `MANAGER_B`. **Write half: no test attempts a cross-workspace INSERT/UPDATE** — the predicate exists at `20261019120000_collaborator_agenda_schema.sql:119-122` but nothing asserts it. | 🔶 **Partial** |
| MGR-09 | manager cancels or edits | change persisted **and no WhatsApp sent** | `tests/db/behavior-collaborator-agenda.test.ts:272` — `expect(row.status).toBe('cancelled')`, `:273` `decided_by === MANAGER_A`, `:274` `decided_at` not null; `:373` edit returns the new body; `src/pages/PJ/AgendaPage.test.tsx:417` update payload `{status:'cancelled', decided_at:…, decided_by:MANAGER_ID}`; no-WhatsApp half: `src/hooks/useCollaboratorAppointments.test.tsx:288` — `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` over the whole hook file | ✅ PASS |
| MGR-10 | selector on a collaborator | unavailability blocks visually distinct from appointment blocks | `src/pages/PJ/AgendaPage.test.tsx:296-297` — `expect(unavailabilityStyle.background).toBeTruthy()` and `expect(unavailabilityStyle.background).not.toBe(appointmentStyle.background)` | ✅ PASS |
| MGR-11 | switches back to own calendar | personal view restored, no residual collaborator rows | `src/pages/PJ/AgendaPage.test.tsx:259` — `expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument()`; `:260` `expect(screen.queryByText('Visita técnica')).not.toBeInTheDocument()` | ✅ PASS |
| MGR-12 | observation given / not given | persist as `notes`; store `NULL` when absent | `src/pages/PJ/AgendaPage.test.tsx:356` payload contains `notes:'Levar o equipamento de teste'`; `:383` `expect((calls.inserts()[0].args[0]).notes).toBeNull()` | ✅ PASS |

### P1 — WhatsApp notification with deep link on creation

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| NOTIF-01 | appointment created | adapter invoked **exactly once** with `corporate_team.whatsapp`; message contains title, date, time range and the deep link `https://taskvisiovs.vercel.app/colaborador/agenda` | `src/components/agenda/AppointmentNotifier.test.tsx:83-84` — `expect(invokeMock).toHaveBeenCalledTimes(1)` / `toHaveBeenCalledWith(NOTIFY_FUNCTION,{body:{appointment_id:'ap-1'}})`; `supabase/functions/notify-appointment/notify-appointment.test.ts:123-134` — `expect(calls).toHaveLength(1)`, `expect(body.number).toBe('5511999990001')`, `expect(body.message).toContain('Reunião de alinhamento')`, `toContain('05/11/2026')`, `toContain('14:00–16:00')`, `toContain(DEEP_LINK)`; `supabase/functions/_shared/collaborator-agenda.test.ts:31-38` | ✅ PASS (composite: client names only the id; the edge function reads `corporate_team.whatsapp` at `notify-appointment/index.ts:75-83`) |
| NOTIF-02 | adapter fails or times out | appointment kept with `status='pending'`, failure recorded in `appointment_notification_log`, resend affordance surfaced | `supabase/functions/notify-appointment/notify-appointment.test.ts:163-168` — `notify_status='failed'`, `state.appointment?.status).toBe('pending')`, attempt row `{attempt:1,status:'failed',providerResponse:…}`; `:204-210` timeout equivalent; `src/components/agenda/AppointmentNotifier.test.tsx:126` and `:152` `expect(screen.getByRole('button',{name:/Reenviar/})).toBeInTheDocument()` | ✅ PASS — caveat: the attempt row is asserted against the injected fake `NotifyStore`; `index.ts`'s real `appointment_notification_log` write is never executed (Deno unavailable, AD-003), and the table identity is only pinned by `tests/db/schema-collaborator-agenda.test.ts:369` (`23505` on `…appointment_id_attempt_key`). |
| NOTIF-03 | resend requested | new row appended, previous attempt untouched | `supabase/functions/notify-appointment/notify-appointment.test.ts:256-265` — `first.body.attempt===1`, `second.body.attempt===2`, `state.attempts[0]` still `{attempt:1,status:'sent'}`, `state.attempts[1].status==='failed'`; `src/components/agenda/AppointmentNotifier.test.tsx:133-136` — both invocations carry only `{appointment_id:'ap-1'}` | ✅ PASS |
| NOTIF-04 | adapter invoked twice in one attempt | at most one message, keyed on `appointment_id` + attempt | `supabase/functions/notify-appointment/notify-appointment.test.ts:224-228` — `expect(second.body.skipped).toBe('attempt already claimed')`, `expect(calls).toHaveLength(1)`; `tests/db/schema-collaborator-agenda.test.ts:369` — second insert → `{ code:'23505', constraint:'appointment_notification_log_appointment_id_attempt_key' }`, `:376` `count==='1'` | ✅ PASS |
| NOTIF-05 | (ubiquitous) | UAZapi/agzap base URL, path and credential only in server-side config, never in a `VITE_` variable or client source | `supabase/functions/notify-appointment/notify-appointment.test.ts:313-314` — `expect(coreSource).not.toContain('VITE_')`, `expect(indexSource).not.toContain('VITE_')`; `:298-310` — `env: () => undefined` ⇒ `expect(calls).toHaveLength(0)`, `notify_status='failed'`; `src/components/agenda/AppointmentNotifier.test.tsx:183` — `expect(source).not.toMatch(/VITE_\|AGZAP\|agzap\.com\.br/)` | ✅ PASS |
| NOTIF-06 | send not complete within **10 seconds** | abort the attempt and record it as `timeout` | `supabase/functions/notify-appointment/notify-appointment.test.ts:199-211` — abort listener ⇒ `expect(state.notifyStatus).toBe('timeout')`, attempt `{attempt:1,status:'timeout'}`, `result.body.notify_status==='timeout'`. **But** the test injects `timeoutMs: 10`; the production default `SEND_TIMEOUT_MS = 10_000` (`supabase/functions/_shared/notify-appointment.ts:13`) is never asserted. | 🔶 **Partial** — abort/timeout behaviour proven; the "10 seconds" value is undiscriminated (sensor mutant **M5** survived) |
| NOTIF-07 | appointment edited or cancelled | no WhatsApp message | `supabase/functions/notify-appointment/notify-appointment.test.ts:324-325` — `expect(Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS','handleNotifyAppointment'])` and `expect(indexSource).toContain('req.method !== "POST"')`; `src/hooks/useCollaboratorAppointments.test.tsx:288` — edit/cancel hook source contains no `functions.invoke`/`notify-appointment`/`AGZAP` | ✅ PASS |
| NOTIF-08 | (ubiquitous) | one row per attempt with `appointment_id`, `attempt`, `status`, `provider_response`, `created_at` | `supabase/functions/notify-appointment/notify-appointment.test.ts:137` — `expect(state.attempts).toEqual([{attempt:1,status:'sent',providerResponse:null}])`, `:167` `providerResponse: expect.stringContaining('agzap_500')` | 🔶 **Partial** — `attempt`, `status`, `provider_response` asserted; `appointment_id` (as the row key) and **`created_at` are never asserted anywhere**, and the real `INSERT` path in `index.ts` is not executed by any test |
| NOTIF-09 | non-empty `notes` | appended between the time range and the deep link | `supabase/functions/_shared/collaborator-agenda.test.ts:52-57` — `expect(link - range).toBe(2)`, `expect(lines[range+1]).toContain('Levar o contrato')`, `toContain('Observação')`; `:64` and `:71` assert `linkLine - rangeLine === 1` for null/empty/blank notes | ✅ PASS |

### P1 — Collaborator confirms or cancels from their panel

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| COLAB-01 | follows the deep link | render appointments + unavailability with no login step when a session exists | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:90` — `expect(screen.queryByText('LOGIN-SCREEN')).not.toBeInTheDocument()` while the page renders; `src/components/auth/CollaboratorAgendaRoute.test.tsx:117-123` — route block in `App.tsx` contains `<CollaboratorRoute>`, `<CollaboratorAgendaRoute>`, `<ColaboratorAgendaPage />` | ✅ PASS (session-keeping itself is delegated to the pre-existing `CollaboratorRoute`, asserted structurally) |
| COLAB-02 | confirms a `pending` appointment | `status='confirmed'`, `decided_at` and `decided_by = auth.uid()` recorded | `tests/db/behavior-collaborator-agenda.test.ts:183-185` — `expect(row.status).toBe('confirmed')`, `expect(row.decided_by).toBe(COLLABORATOR_C)`, `expect(row.decided_at).not.toBe(null)` (the UPDATE sends **only** `status`); `src/hooks/useCollaboratorAppointments.test.tsx:191-195` — `expect(calls.of('update')[0].args).toEqual([{status:'confirmed', decided_at:stringMatching(…), decided_by:'member-1'}])` | ✅ PASS |
| COLAB-03 | cancels a `pending` appointment | `status='cancelled'`, `decided_at`, `decided_by = auth.uid()` | `tests/db/behavior-collaborator-agenda.test.ts:198-200` — `status==='cancelled'`, `decided_by===COLLABORATOR_C`, `decided_at` not null; `src/hooks/useCollaboratorAppointments.test.tsx:207-211` | ✅ PASS |
| COLAB-04 | action on `confirmed`/`cancelled` row | reject, persist nothing, display `Esta solicitação já foi respondida.` | `tests/db/behavior-collaborator-agenda.test.ts:218` — `{ code:'P0001', messageIncludes:'Esta solicitação já foi respondida.' }` ×2 and `:226-227` `expect(await readAppointment(confirmed)).toEqual(confirmedBefore)`; `src/hooks/useCollaboratorAppointments.test.tsx:222` — `rejects.toThrow(ALREADY_ANSWERED_MESSAGE)` + `:226` `expect(calls.of('update')).toHaveLength(0)` | ✅ PASS |
| COLAB-05 | action on a row whose `member_user_id` ≠ own | reject, persist nothing | `src/hooks/useCollaboratorAppointments.test.tsx:236` — `rejects.toThrow('Sem permissão para responder este compromisso.')` + `:239` `expect(calls.of('update')).toHaveLength(0)`; `tests/db/behavior-collaborator-agenda.test.ts:250` — `{ code:'P0001', messageIncludes:'Colaborador não pode alterar' }` for six columns + `:253` row unchanged | ✅ PASS — **⚠️ Spec-precision gap #2**: the spec names no message for COLAB-05 (flagged in code at `20261019130000_collaborator_appointment_manager_cancel.sql:57`); two different invented strings exist (client + DB). |
| COLAB-06 | `pending` | render **both** confirm and cancel | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:110-111` — `getByRole('button',{name:/Confirmar/})` and `getByRole('button',{name:/Cancelar/})` both present | ✅ PASS |
| COLAB-07 | `confirmed` or `cancelled` | render **no** confirm/cancel action | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:119-120` and `:128-129` — `expect(screen.queryByRole('button',{name:/Confirmar/})).not.toBeInTheDocument()` (both statuses) | ✅ PASS |
| COLAB-08 | manager changes appointment while panel open | rendered status updates without a manual reload | `src/lib/realtime-query-config.test.tsx:120` — after replaying one `collaborator_appointments` event, `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)` where one cache was built through `useCollaboratorAppointments` as `collab-self` (`:72-78`) | ✅ PASS — asserted at cache-invalidation level (the refetch the page consumes), not on a rendered status string |
| COLAB-09 | (ubiquitous) | deny collaborator SELECT on any row with a different `member_user_id` | `tests/db/schema-collaborator-agenda.test.ts:288-291` — `expect([...new Set(ownAppointments.rows.map(r=>r.member_user_id))]).toEqual([COLLABORATOR_A])` (same for availability); `:306-310` the same for `COLLABORATOR_B`, a `workspace_members` row with role `member` (the shape that breaks `has_workspace_access`) | ✅ PASS |
| COLAB-10 | `collaborator_permissions.agenda` disabled | hide the agenda nav item **and** redirect `/colaborador/agenda` → `/colaborador` | `src/components/layout/AppSidebar.test.tsx:52` — `expect(screen.queryByRole('link',{name:/Agenda/})).not.toBeInTheDocument()`; `src/components/layout/MobileNav.test.tsx:47` — same; `src/components/auth/CollaboratorAgendaRoute.test.tsx:80-81` — `expect(screen.getByText('COLABORADOR-PORTAL')).toBeInTheDocument()` / `expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument()` | ✅ PASS |
| COLAB-11 | collaborator without `member_user_id` | excluded from selector, portal and all appointment queries | `src/components/agenda/CollaboratorSelector.test.tsx:71` — `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])`, `:74-77` null and `undefined` alike; queries are keyed on `member_user_id` (`src/hooks/useCollaboratorAppointments.test.tsx:334` — `expect(calls.of('eq')[0].args).toEqual(['member_user_id','member-1'])`), so an accountless row can never be a target | ✅ PASS — the "portal" half (`CollaboratorPortal.tsx`) is pre-existing and outside `1716a95..HEAD`; it is unchanged, not re-verified here |
| COLAB-12 | non-empty `notes` | render the observation alongside the appointment details | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:140-142` — `expect(within(section).getByText('Trazer o contrato assinado')).toBeInTheDocument()` with `notes:null` on the sibling row | ✅ PASS |

### P2 — Realtime propagation

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| SYNC-01 | collaborator confirms | manager's open `/pj/agenda` reflects it without reload | `src/lib/realtime-query-config.test.tsx:120` — `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)` for both views after one `collaborator_appointments` event | ✅ PASS |
| SYNC-02 | manager creates | collaborator's open `/colaborador/agenda` shows it without reload | same test, `src/lib/realtime-query-config.test.tsx:111-121` (manager identity `manager-a` and collaborator identity `collab-self`, two distinct queryKeys asserted at `:114`) | ✅ PASS |
| SYNC-03 | new table in realtime publication | `REPLICA IDENTITY FULL` via the idempotent `DO` block of `20260617120000_realtime_react_query_tables.sql` | `tests/db/schema-collaborator-agenda.test.ts:393` — `expect(published.rowCount).toBe(2)`; `:394-399` — filter `relreplident==='F'` `.toEqual(['collaborator_appointments','collaborator_availability'])`. The `DO` block itself is `20261019120000_collaborator_agenda_schema.sql:151-177` (idempotent `ALTER PUBLICATION … EXCEPTION WHEN duplicate_object`). | ✅ PASS |
| SYNC-04 | collaborator adds unavailability | manager's open view reflects it without reload | `src/lib/realtime-query-config.test.tsx:140` — `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)` after replaying `collaborator_availability`; binding asserted at `:100` | ✅ PASS |

### P2 — Permission flag gates the feature

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| PERM-01 | `agenda` false | omit agenda from sidebar and mobile nav | `src/components/layout/AppSidebar.test.tsx:52`, `src/components/layout/MobileNav.test.tsx:47` — `expect(screen.queryByRole('link',{name:/Agenda/})).not.toBeInTheDocument()`; on-state `AppSidebar.test.tsx:46-48` / `MobileNav.test.tsx:38-39` `toHaveAttribute('href','/colaborador/agenda')` | ✅ PASS |
| PERM-02 | `agenda` false, direct URL | redirect to `/colaborador` | `src/components/auth/CollaboratorAgendaRoute.test.tsx:80-81` | ✅ PASS |
| PERM-03 | no flag row | apply the schema default and grant access | `src/components/auth/CollaboratorAgendaRoute.test.tsx:88-89` — `setRows([])` ⇒ `expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument()` | ✅ PASS |

### P3 — Manager acknowledgement

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| ACK-01 | collaborator confirms/cancels | write an in-app notification to the creating manager | **❌ no evidence.** `grep -rn "ACK-01\|ACK-02" .specs src supabase tests` matches only `spec.md:203,206,282,283`; no notification row, hook, component or test exists anywhere in the tree. `tasks.md` contains no ACK/P3 task (T1–T18 only). | ❌ GAP |
| ACK-02 | collaborator confirms/cancels | **no** WhatsApp message | `src/hooks/useCollaboratorAppointments.test.tsx:288` — `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` on `useCollaboratorAppointments.ts`, the file that implements `useRespondAppointment`; plus `supabase/functions/notify-appointment/notify-appointment.test.ts:324-325` — the only entry point is POST-only `handleNotifyAppointment`, driven by creation. | ✅ PASS (source-level assertion; it is labelled MGR-09 in the test but covers the respond path) |

**Tally**: 46 ✅ · 4 🔶 Partial · 3 ❌ GAP · of the 46, **2 carry ⚠️ spec-precision gaps** (MGR-04, COLAB-05).

---

## Edge Cases (spec.md)

| Edge case | `file:line` + assertion | Result |
| --------- | ----------------------- | ------ |
| No unavailability rows ⇒ fully bookable, no empty-state error | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:86-88` — `expect(screen.getByText('Nenhuma indisponibilidade declarada neste mês.')).toBeInTheDocument()` + `expect(screen.getByText('Seg')).toBeInTheDocument()` | ✅ |
| Collaborator with zero appointments and zero unavailability ⇒ empty calendar with invitation, not an error | `src/pages/PJ/AgendaPage.test.tsx:269-274` — `findByText(/Nenhum compromisso agendado/)`, `getByRole('button',{name:/Novo compromisso/})`, `getByText(/Sem indisponibilidade declarada/)`, `expect(screen.queryByRole('alert')).not.toBeInTheDocument()` | ✅ |
| Collaborator deactivated between select and save ⇒ reject `Este colaborador não está mais ativo.` | `src/pages/PJ/AgendaPage.test.tsx:397` — `expect(await screen.findByRole('alert')).toHaveTextContent('Este colaborador não está mais ativo.')`, `:398` `expect(calls.inserts()).toHaveLength(0)`; DB authority `tests/db/guard-collaborator-appointment-member.test.ts:127` `{code:'P0001', messageIncludes:SPEC_MESSAGE}` + `:133` persisted `0` | ✅ |
| Deep link opened unauthenticated ⇒ `/auth`, **then return to `/colaborador/agenda`** after the session is established | **❌ no evidence, and the return half is not implemented.** No test in the diff exercises the unauthenticated branch (`grep -rl "'/auth'" src --include=*.test.tsx` → nothing). Code: `src/components/auth/CollaboratorRoute.tsx:27` does `<Navigate to="/auth" replace />` **without** `state={{ from: location }}` (only `src/components/ProtectedRoute.tsx:49` carries it), and `src/pages/Auth.tsx:38` sends an authenticated user to `/` (→ `RootRedirect` → `/colaborador`). The WhatsApp deep link therefore lands the logged-out collaborator in the portal, not on the agenda. | ❌ GAP |
| Deep link opened by a non-`collaborator` ⇒ redirect `/caixa`, matching `CollaboratorRoute.tsx:30` | `src/components/auth/CollaboratorAgendaRoute.test.tsx:97-98` (manager) and `:104-105` (admin) — `expect(screen.getByText('CAIXA-PAGE')).toBeInTheDocument()` | ✅ |
| Unavailability spanning a month boundary ⇒ rendered across both months, inclusive | `src/components/agenda/CalendarEvent.test.ts:99` — `expect(events.map(e => e.date)).toEqual(['2026-11-30','2026-12-01','2026-12-02'])` | ✅ |
| Non-digit `corporate_team.whatsapp` ⇒ rejected at entry with `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.` | **❌ no evidence.** The literal does not exist anywhere (`grep -rn "apenas dígitos" src supabase tests` → only an unrelated 2026 migration string). The only entry point, `src/components/areapj/TeamMemberForm.tsx:110`, **strips** rather than rejects: `whatsapp: whatsapp.replace(/\D/g, '') \|\| undefined`. No test. File is outside `1716a95..HEAD`, so the feature never implemented the spec's rule. | ❌ GAP |
| Touching endpoints (appointment start = unavailability end, or vice versa) ⇒ non-conflicting, save permitted | `tests/db/behavior-collaborator-agenda.test.ts:165-166` — `expect(before.rows[0]).toEqual({start_time:'06:00',end_time:'09:00'})` and `after…{start_time:'12:00',end_time:'13:00'}` (both persisted against a `09:00–12:00` block); also `src/lib/schedule.test.ts:51-55` and `src/components/agenda/CalendarEvent.test.ts:131-132` | ✅ |
| Adapter throws an unhandled exception ⇒ catch, log, appointment intact | `supabase/functions/notify-appointment/notify-appointment.test.ts:178-183` — `notify_status='failed'`, `expect(state.appointment?.status).toBe('pending')`, attempt `{attempt:1,status:'failed',providerResponse:'conexão recusada'}` | ✅ |
| Manager's own calendar selected ⇒ never query `collaborator_appointments` | `src/pages/PJ/AgendaPage.test.tsx:226-227` — `expect(calls.from('collaborator_appointments')).toHaveLength(0)` | ✅ |

**Edge cases**: 8 ✅ · 2 ❌

---

## Discrimination Sensor

Executed in an isolated scratch: `git worktree add --detach %TEMP%\sensor-collab-agenda HEAD` (HEAD = `f9d3acc`), with a directory junction to `node_modules`. **The real worktree was never mutated; `git stash` was never used.**

Scratch baseline before any mutation: `npm run test` → 150/150 pass, exit 0; `npm run test:db` → 49/49 pass, exit 0 (proving the scratch reproduced the real gates).

| # | Mutation (behaviour-level fault) | File:line | Layer | Killed? |
| - | --------------------------------- | --------- | ----- | ------- |
| M1 | Overlap boundary off-by-one: `p_start_time < av.end_time` → `<=` | `supabase/migrations/20261019120100_collaborator_agenda_behavior.sql:42` | SQL conflict | ✅ Killed — `behavior-collaborator-agenda.test.ts > accepts a pair that only touches…` failed (1 failed / 48 passed, exit 1) |
| M2 | Weakened RLS: availability INSERT `WITH CHECK (auth.uid() = member_user_id)` → `WITH CHECK (true)` | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:103` | SQL RLS | ✅ Killed — `schema-collaborator-agenda.test.ts > refuses an availability insert naming someone else's member_user_id (AVAIL-11)` |
| M3 | Inverted status transition: manager's `IF NEW.status <> 'cancelled'` → `IF FALSE` (manager may now confirm) | `supabase/migrations/20261019130000_collaborator_appointment_manager_cancel.sql:88` | SQL state machine | ✅ Killed — `behavior-collaborator-agenda.test.ts > refuses a manager trying to confirm…` |
| M4 | Validation off-by-one: `startTime >= endTime` → `>` (equal times accepted) | `src/components/areapj/AvailabilityForm.tsx:82` | TS zod schema | ✅ Killed — `AvailabilityForm.test.tsx > rejects an end time that is not after the start time (AVAIL-06)` |
| M5 | Changed return/config value: `SEND_TIMEOUT_MS = 10_000` → `1_000` (spec says **10 seconds**) | `supabase/functions/_shared/notify-appointment.ts:13` | TS edge fn | ❌ **Survived** — 150/150 passed, exit 0 → NOTIF-06's threshold is undiscriminated |
| M6 | Removed required side effect: delete-path `qc.invalidateQueries({queryKey:[QUERY_KEY]})` | `src/hooks/useCollaboratorAvailability.ts` (`useDeleteAvailability.onSuccess`) | TS hook | ✅ Killed — `useCollaboratorAvailability.test.tsx > removes the row and invalidates… without a reload (AVAIL-09)` |
| M7 | Removed required side effect: dropped the `collaborator_availability` realtime binding | `src/lib/realtime-query-config.ts:54` | TS config | ✅ Killed — 3 failures incl. `SYNC-04 — an unavailability change reaches both parties` |
| M8 | Manager view never flags a conflict: `conflicted: availabilityConflictsWith(…)` → `conflicted: false` | `src/pages/PJ/AgendaPage.tsx:124` | TS page | ❌ **Survived** — 150/150 → AVAIL-10 (manager half) undiscriminated |
| M9 | Collaborator view never flags a conflict: same flip | `src/pages/colaborador/ColaboratorAgendaPage.tsx:63` | TS page | ❌ **Survived** — 150/150 → AVAIL-10 (collaborator half) undiscriminated |
| M10 | Removed a payload field: dropped the deep-link line from the message builder | `supabase/functions/_shared/collaborator-agenda.ts` (`lines.push(…COLLABORATOR_AGENDA_URL)`) | TS shared | ✅ Killed — 5 failures (NOTIF-01 builder + edge-fn suite, NOTIF-09 ×3) |
| M11 | Fault against MGR-06: extended `fn_collaborator_has_conflict` to also span `collaborator_appointments`, so two overlapping appointments can no longer both persist | `supabase/migrations/20261019120100_collaborator_agenda_behavior.sql:46` (appended `OR EXISTS (…collaborator_appointments…)`) | SQL conflict | ❌ **Survived** — 49/49 passed, exit 0 → MGR-06 undiscriminated |
| M12 | Weakened the manager-side predicate: `is_workspace_admin(workspace_id, auth.uid())` → `has_workspace_access(workspace_id)` at all 5 sites | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:97,113,120,130,135` | SQL RLS (AD-006) | ✅ Killed — `schema-collaborator-agenda.test.ts > keeps a collaborator who is a workspace member inside their own rows (COLAB-09)` |

**Sensor depth**: expanded (12 mutations across SQL/RLS/state-machine, TS schema, TS hooks, TS pages, TS edge-function module — beyond the default 1–3 because the feature carries DB-authoritative and cross-user rules).
**Result**: **12 injected · 8 killed · 4 survived** (M5, M8, M9, M11) → ❌ FAIL

**Isolation check**: after `git worktree remove --force` + `git worktree prune`, `git status --porcelain` in the real tree is byte-identical to the pre-sensor baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`) — `diff` reported no difference.

---

## Gate Check

| Gate | Command | Result | Exit code |
| ---- | ------- | ------ | --------- |
| Unit | `npm run test` | **150 passed** (18 files), 0 failed, 0 skipped | **0** |
| Database | `npm run test:db` | **49 passed** (4 files), 0 failed, 0 skipped | **0** |

- **Test count before the feature**: 0 (the repo shipped with no runner — `design.md` R2 / AD-004).
- **Test count after**: 150 + 49 = **199**; delta **+199**.
- **Skipped tests**: none in either gate.
- **Failures**: none.
- Gate-level result: ✅ both gates green. (Note: `validate.md` requires `test:db` non-zero to be an immediate FAIL; it is not, so the FAIL verdict below comes from the evidence and sensor, not from the gate.)

---

## Code Quality Check

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ⚠️ | `fn_assert_appointment_member_active` also refuses a `member_user_id` with **no** `corporate_team` row at all (`20261019140000:44-53`, tested at `guard-…:136`). The spec's edge case names only the *deactivated* case. The migration argues it fits MGR-05 and closes a real `WITH CHECK` hole (AD-008) — fail-closed and justified, but it is a rule the spec does not state. |
| No unnecessary flexibility / abstractions | ✅ | `CalendarEvent` view-model, one `schedule.ts`, one message builder — all consumed by ≥2 callers. |
| Only touched files required | ✅ | 72 files; `.specs/`, harness, feature code only. No drive-by refactors found in the diff. |
| Didn't "improve" unrelated code | ✅ | `AgendaPJ.tsx` was reduced by the extraction and is covered by `AgendaPJ.test.tsx:58-86` (personal agenda still renders). |
| Matches existing patterns | ✅ | Hooks mirror `useAgendaPJ.ts` shape; migrations follow the repo's `DO`-block and no-policy-log patterns. |
| Tests map to ACs and are non-shallow | 🔶 | 46/53 ACs map 1:1; AVAIL-10, MGR-06, ACK-01 map to nothing; 4 ACs only partly. |
| Spec-anchored outcome check | ⚠️ | Every asserted message/status/SQLSTATE was compared to `spec.md`; 2 spec-precision gaps flagged (MGR-04, COLAB-05), 4 partial outcomes. |
| Per-layer coverage expectation | 🔶 | Domain logic ≈ 1:1 ✅; routes/nav ✅ happy+edge+error; **pages**: no error-path test for the collaborator's availability mutation, no badge path for AVAIL-10. |
| Every test maps to an AC / edge case / Done-when | ✅ | The 14 `tests/db/harness.test.ts` cases and `src/test/harness.test.tsx` map to T1/T2 Done-when; `views.test.tsx` maps to T8 Done-when; no unclaimed feature test found. |
| Documented guidelines followed | ✅ | **none found** — the repo had no test runner or guideline file before this feature; `tasks.md:18` records "Guidelines found: none - strong defaults applied". Strong defaults (co-located tests, exact-string assertions) were applied. |

---

## SPEC_DEVIATION markers

| Marker | Location | Verdict |
| ------ | -------- | ------- |
| Manager-side RLS uses `is_workspace_admin(…) OR is_super_admin(…)` instead of `has_workspace_access(workspace_id)` | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:79-87` | **Justified against the spec.** `spec.md` COLAB-09 is absolute; `has_workspace_access` is true for any `workspace_members` row and `create-collaborator` inserts collaborators there as `member` (AD-006). The stricter predicate is what makes `schema-collaborator-agenda.test.ts:296-312` pass, and sensor **M12** proves that test discriminates it. **Caveat**: the marker's premise — "*design.md's reuse table says every new policy scopes on has_workspace_access*" — is now stale: `design.md:57` already states the opposite (the design was corrected after the marker was written). The marker survives as a historical note, not a live deviation from the current design. |
| `20261019130000` supersedes the manager branch of `20261019120100` | `supabase/migrations/20261019130000_collaborator_appointment_manager_cancel.sql:4-11` | **Justified, and correctly attributed to the spec over the design.** `20261019120100:187` blocked the manager from `status` entirely, contradicting MGR-09 and the confirmed user assumption. Design.md Tech Decisions (`:328`) and STATE.md AD-007 were both updated to match, and `tests/db/behavior-collaborator-agenda.test.ts:260-356` pins the corrected contract (cancel yes, confirm no, terminal immutable, `decided_*` only with a status change). |

## design.md vs the migrations (as shipped)

| design.md claim | Migrations actually do | Holds? |
| --------------- | ---------------------- | ------ |
| "1 migration: 3 tables, 2 triggers, 2 SQL functions, 6 RLS policies" (`design.md:71`) | **4** migrations (`20261019120000`, `…120100`, `…130000`, `…140000`), 3 tables ✅, **4** triggers (`set_collaborator_appointments_updated_at`, `assert_appointment_no_conflict`, `assert_appointment_transition`, `assert_appointment_member_active`), **4** SQL functions (`fn_collaborator_has_conflict`, `fn_assert_appointment_no_conflict`, `fn_assert_appointment_transition`, `fn_assert_appointment_member_active`), 6 RLS policies ✅ | ❌ **Stale** — trigger/function/migration counts were never updated after `…130000` and `…140000`. |
| Availability CHECK list (`design.md:191-196`) | Exact match, four named constraints (`schema.sql:20-27`) | ✅ |
| `fn_collaborator_has_conflict` is `SECURITY INVOKER`, `STABLE`, overlap `a.start < b.end AND a.end > b.start` (`design.md:237-241`) | `behavior.sql:16-47` (`LANGUAGE sql STABLE`, no `SECURITY DEFINER`, strict `<`/`>`); asserted `prosecdef:false, provolatile:'s'` at `behavior-…:103` | ✅ (sensor M1 confirms the strict comparison is load-bearing) |
| Transition guard: collaborator only `status`/`decided_*`, only `pending → confirmed\|cancelled`; manager may set `cancelled` from `pending`/`confirmed`, never `confirmed`, never leaves `cancelled`; `decided_by` = whoever ended it (`design.md:248-249`, Tech Decisions `:328`) | `20261019130000:44-107` implements exactly that | ✅ (this is one of the two documented corrections; verified, not assumed) |
| `assert_appointment_member_active` refuses an inactive/absent team row with `Este colaborador não está mais ativo.` (`design.md:265`) | `20261019140000:44-53`, `SECURITY DEFINER`, `SET search_path`, INSERT-only | ✅ (the other documented correction) |
| `appointment_notification_log`: RLS on, zero policies, `UNIQUE(appointment_id, attempt)` (`design.md:235`) | `schema.sql:61-73,139`; asserted `relrowsecurity=true`, policy count `0` (`schema-…:342,348`) | ✅ |
| `verify_jwt` stays default; not added to the `verify_jwt=false` list (`design.md:106`, R9) | `index.ts` keeps the default; asserted `notify-appointment.test.ts:353-355` | ✅ |
| Edge function dependencies `AGZAP_TOKEN`, `SUPABASE_URL`, `SERVICE_ROLE_KEY` | `index.ts:52-54,129` + `AGZAP_URL` | ✅ (design omits `AGZAP_URL`, minor) |

**Conclusion**: the two design corrections (manager `status`, member-active guard) genuinely hold; the **Integration Points counts at `design.md:71`** and the **Components entry at `design.md:82-87`** are stale after the two follow-up migrations.

---

## Findings / Fix Plans

### Fix 1 — AVAIL-10 conflict badge never asserted (and never discriminated)
- **Root cause**: `conflicted` is computed in both pages but no test renders an appointment that overlaps declared unavailability, so the badge path is untested end-to-end.
- **Evidence**: no `file:line`; sensor M8 (`AgendaPage.tsx:124`) and M9 (`ColaboratorAgendaPage.tsx:63`) both survived.
- **Fix task**: in `src/pages/PJ/AgendaPage.test.tsx` and `src/pages/colaborador/ColaboratorAgendaPage.test.tsx`, add a case where the appointment's date/time falls inside the fixture availability row and assert the conflict indicator (the `ring` class in `views/AgendaDayView.tsx:97` or the `Conflito de horário` popover text in `EventPopoverContent.tsx:58`) is present in **both** views; plus a case proving an unavailability save succeeds while an appointment already overlaps it.
- **Done when**: reverting `conflicted: false` in either page fails the suite.
- **Priority**: Major (user-confirmed assumption, spec `spec.md:41`/`AVAIL-10`)

### Fix 2 — MGR-06 (concurrent overlapping appointments) has no test
- **Root cause**: no test ever creates two mutually overlapping appointments, so the scoping rule "conflict detection is unavailability-only" is unverified.
- **Evidence**: no `file:line`; sensor M11 (conflict function extended to appointments) survived 49/49.
- **Fix task**: add a DB case in `tests/db/behavior-collaborator-agenda.test.ts` inserting two appointments for the same member/date with overlapping times (ideally sequentially, plus a two-connection concurrency case) and assert both rows persist.
- **Done when**: `npm run test:db` fails after appending an `OR EXISTS (…collaborator_appointments…)` clause to `fn_collaborator_has_conflict`.
- **Priority**: Major

### Fix 3 — Deep-link edge case: unauthenticated collaborator never returns to `/colaborador/agenda`
- **Root cause**: `src/components/auth/CollaboratorRoute.tsx:27` navigates to `/auth` without `state={{ from: location }}`, and `src/pages/Auth.tsx:38` sends authenticated users to `/`.
- **Evidence**: no test; implementation loss confirmed at `CollaboratorRoute.tsx:27` + `Auth.tsx:38` + `RootRedirect.tsx:26`.
- **Fix task**: carry the intended location (as `ProtectedRoute.tsx:49` already does) and return to it after the session is established; add a route test asserting `/colaborador/agenda` → `/auth` → back.
- **Priority**: Blocker (this is the entry point of the whole WhatsApp loop)
- **Note**: `CollaboratorRoute.tsx` is pre-existing but is the guard the feature wrapped the new route in, so the spec's edge case is unmet by the feature as shipped.

### Fix 4 — ACK-01 (P3 in-app notification) not implemented
- **Root cause**: no P3 task was created; `grep ACK-01` matches only `spec.md`.
- **Evidence**: no `file:line`.
- **Fix task**: either implement the in-app notification on `pending → confirmed|cancelled` with a test, or amend `spec.md` (Assumptions `:24` + traceability rows `:282-283`) to move ACK-01 out of scope and re-run validation. The spec must not list an unimplemented requirement as Pending.
- **Priority**: Minor for scope, but blocks the 53/53 evidence bar.

### Fix 5 — NOTIF-06's 10-second threshold is undiscriminated
- **Root cause**: the timeout test injects `timeoutMs: 10`, so `SEND_TIMEOUT_MS` is never observed.
- **Evidence**: sensor M5 (`notify-appointment.ts:13`, `10_000 → 1_000`) survived 150/150.
- **Fix task**: assert `SEND_TIMEOUT_MS === 10_000` (and/or run one case with no `timeoutMs` override against a hanging fetch), so the spec's "10 seconds" is pinned.
- **Priority**: Minor

### Fix 6 — AVAIL-09 delete has no UI affordance
- **Root cause**: `useDeleteAvailability` was written and tested but never mounted.
- **Evidence**: `grep -rn useDeleteAvailability src/` → only `useCollaboratorAvailability.test.tsx`.
- **Fix task**: expose delete (e.g. `onRequestDelete` in read mode on `ColaboratorAgendaPage`) or record the deletion as out of scope in the spec.
- **Priority**: Major (the AC's trigger can never fire)

### Fix 7 — Edge case: `whatsapp` digits-only rejection not implemented
- **Evidence**: the spec literal `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.` does not exist in the tree; `TeamMemberForm.tsx:110` strips instead of rejecting; no test.
- **Fix task**: implement the named rejection in the collaborator form + test, or amend the spec edge case to describe the current normalization.
- **Priority**: Minor (file is outside the diff range, but the spec lists the rule)

### Fix 8 — NOTIF-08 log row not fully asserted
- **Evidence**: `created_at` and the `appointment_id` column are never asserted; `index.ts`'s `INSERT/UPDATE` against `appointment_notification_log` is never executed (Deno unavailable).
- **Fix task**: add a pure-TS assertion over the store contract (or a source assertion on `index.ts`'s column list) pinning `appointment_id, attempt, status, provider_response, created_at`.
- **Priority**: Minor

### Fix 9 — design.md counts stale after `…130000` / `…140000`
- **Evidence**: `design.md:71` claims "1 migration, 2 triggers, 2 SQL functions"; reality is 4 / 4 / 4. `design.md:79-87` still describes a single schema migration as the whole DB surface.
- **Fix task**: update the Integration Points and Components sections.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

**Not applied** — the Verifier is read-only over the working tree and writes only this file. The orchestrator should update `spec.md` (rows `:231-283`) from `Pending` using the table above:

| Requirement group | New status |
| ----------------- | ---------- |
| AVAIL-01…08, AVAIL-11 | ✅ Verified |
| AVAIL-09 | 🔶 Partial (hook only, no UI) |
| AVAIL-10 | ❌ Needs Fix |
| MGR-01…05, MGR-07, MGR-09…12 | ✅ Verified |
| MGR-06 | ❌ Needs Fix |
| MGR-08 | 🔶 Partial (read verified, write untested) |
| NOTIF-01…05, 07, 09 | ✅ Verified |
| NOTIF-06, NOTIF-08 | 🔶 Partial |
| COLAB-01…12 | ✅ Verified |
| SYNC-01…04 | ✅ Verified |
| PERM-01…03 | ✅ Verified |
| ACK-01 | ❌ Needs Fix |
| ACK-02 | ✅ Verified |

---

## Summary

**Overall**: ❌ **Not ready** — FAIL

**Spec-anchored check**: 46/53 ACs matched the spec-defined outcome · 4 partial (AVAIL-09, MGR-08, NOTIF-06, NOTIF-08) · 3 with no evidence (AVAIL-10, MGR-06, ACK-01) · 2 spec-precision gaps flagged (MGR-04, COLAB-05) · edge cases 8/10 (deep-link return and whatsapp-digits unmet).
**Gate**: `npm run test` 150 passed / exit 0; `npm run test:db` 49 passed / exit 0.
**Sensor**: 12 mutations injected, 8 killed, **4 survived** (M5 NOTIF-06 timeout, M8/M9 AVAIL-10 badge, M11 MGR-06 scoping).

**What works**: the five availability granularities and all three AVAIL messages (client + DB CHECK), the conflict hard block with the exact spec sentence and nothing persisted, cross-workspace/cross-collaborator RLS, the appointment state machine in both directions (collaborator answers, manager withdraws but never confirms), the notification lifecycle (exactly-once, attempt history, dedup, timeout/failure/no-whatsapp verdicts, deep link + observation placement), realtime bindings on both tables, and the permission flag on nav + route.

**Issues found**: 3 unevidenced ACs, 4 partial ACs, 2 failed edge cases, 4 surviving mutants, 1 stale design section (fix plans above).
**Next steps**: route Fix 1–4 to an implementer (Fix 3 is the blocker), then re-dispatch the Verifier — the fix→re-verify loop is bounded at 3 iterations.
