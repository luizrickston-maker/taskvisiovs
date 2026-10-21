# Collaborator Agenda Validation — Round 4

**Date**: 2026-10-21
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `1716a95..HEAD` — 41 commits, HEAD = `4c9b92b` (enumerated with `git log --oneline 1716a95..HEAD`). Covers the original 18 tasks, the two unplanned follow-ups (`30d7c92`, `5212a98`), fix round 1 (`a014ea3` … `d546638`), fix round 2 (`2703d26` … `6d74837`), and the round-3 fix round (`4455d5d`, `4c9b92b`).
**Verifier**: independent round-4 sub-agent — author ≠ verifier, and distinct from all three prior Verifiers. Every expected outcome below was re-derived from `spec.md` alone, and every `file:line` was opened and re-read in the current tree. No citation from a prior report was accepted without re-resolution; this pass also re-derived the object counts by grepping the five `202610191*.sql` files, the commit range with `git log`, and the lint deltas with `npx eslint -f json` at both `HEAD` and `1716a95`.

**Verdict**: ✅ **PASS**

Legend: ✅ PASS = `file:line` evidence whose asserted value equals the spec-defined outcome · ⚠️ Spec-precision gap = the spec defines no precise outcome for that element · ❌ GAP = no evidence after searching, or an asserted outcome that contradicts/omits the spec outcome.

---

## Executive summary

All four round-3 gaps are closed against the criteria the round-4 brief states for them, all 54 ACs and all 10 edge cases carry spec-matching evidence I re-read myself, and my own 9-mutation sensor killed 9 of 9.

- **All five gates recorded**: `npm run test` **161 passed / exit 0**; `npm run test:db` **61 passed / exit 0**; `npm run build` **exit 0**; `npx tsc --noEmit` **exit 0**; `npm run lint` **218 problems (172 errors, 46 warnings) / exit 1** — I re-measured the `1716a95` baseline myself at **202 problems / 80 files**, so the feature's net debt is **+16**, and the four `react-hooks/exhaustive-deps` warnings round 3 called "the one class where the reason does not hold" are **gone** (`exhaustive-deps` is back to 23, exactly the baseline).
- **Spec-anchored check**: **54/54 ACs** carry `file:line` evidence whose asserted value equals the spec-defined outcome; **10/10** edge cases likewise. **5** ACs carry ⚠️ spec-precision gaps (MGR-04, COLAB-05, plus the AVAIL-05 display half, COLAB-08's assertion layer, and the AD-003/Deno boundary behind NOTIF-02/NOTIF-08). **0** ACs have no evidence. **0** assertions contradict `spec.md`.
- **Sensor**: **9 behaviour-level mutations, 9 killed, 0 survived**; 6 of the 9 target code written in fix rounds 1–3 (`2703d26`/`a95af09`, `bc262f0`, `f0a5220`, `b042698`, `6f981a1`, `4c9b92b`). Plus one clearly-labelled non-mutation probe for open question (a).
- **Open questions**: (a) withholding an availability-UPDATE test is **defensible**, but the `GRANT … UPDATE` at `20261019120000:151` is a real (minor) defect; (b) the `20261019140000` `SPEC_DEVIATION` is **honest and justified**.

---

## Round-3 gap closure

Round 3 verdicted FAIL on four gaps. Each is re-tested below.

| # | Round-3 gap | Fix commit(s) | Independent re-derivation | Result |
| - | ----------- | ------------- | ------------------------- | ------ |
| 1 | `AVAIL-12` had no source-of-truth entry in `spec.md` | `4455d5d` | Present at `spec.md:85` as an **EARS unwanted-behaviour** clause — `IF the collaborator attempts to delete an unavailability row whose member_user_id differs from their own id, THEN the system SHALL refuse the deletion and persist nothing.` Traceability row added at `spec.md:243`; `grep -c '^| AVAIL' spec.md` → **12**. Spec/test agreement re-checked line by line: the test asserts `byId.rowCount` `toBe(0)` (`tests/db/schema-collaborator-agenda.test.ts:483`), `byOwner.rowCount` `toBe(0)` (`:489`), unscoped `rowCount` `toBe(ownedBefore)` (`:494`), foreign count unchanged (`:502`), `remaining.rowCount` `toBe(1)` (`:511`), `remaining.rows[0]` `toEqual(targetRow)` (`:512`) — refuse + persist nothing, exactly. My sensor M1 (policy weakened to `USING (true)`) kills this test, so it discriminates. | ✅ Closed |
| 2 | Traceability table and Coverage line untouched | `4455d5d` | All **54** rows present and every Status cell reads `Verified` (programmatic count: 54 rows / 54 `Verified`). Coverage line `spec.md:287` reads `54 total, 49 mapped to tasks, 5 unmapped (AVAIL-10, MGR-06, ACK-01, ACK-02, AVAIL-12 …)`. I re-counted: `tasks.md` names **49** of 54 ids and omits exactly `ACK-01, ACK-02, AVAIL-10, AVAIL-12, MGR-06` — the arithmetic matches the line, so it is not stamped. **Honesty spot-checks**: AVAIL-12 → `schema-collaborator-agenda.test.ts:452-513`; MGR-06 → `behavior-collaborator-agenda.test.ts:192-241`; ACK-01 → `notification-collaborator-appointment-ack.test.ts:107-144`; AVAIL-10 → `behavior-…:245-270`, `AgendaPage.test.tsx:302-331`, `ColaboratorAgendaPage.test.tsx:133-155`. All real. | ✅ Closed |
| 3 | `design.md` counts and per-migration ownership table wrong / uncommitted | `4455d5d` | `git diff HEAD` is clean for `design.md`, so the correction is committed. Counts at `design.md:71` and `:96` say *5 migrations, 3 tables, 5 triggers, 5 SQL functions, 6 RLS policies*. Counted from the files: **5** migrations; **3** `CREATE TABLE` (`20261019120000:10,:31,:61`); **5** `CREATE TRIGGER` (`20261019120000:55`, `20261019120100:113`, `20261019120100:197`, `20261019140000:68`, `20261019150000:54`); **6** `CREATE POLICY` (all in `20261019120000` at `:100,:108,:112,:116,:124,:133`); **5 distinct SQL function bodies** (`fn_collaborator_has_conflict`, `fn_assert_appointment_no_conflict`, `fn_assert_appointment_transition` defined at `20261019120100:16/:54/:124` and replaced at `20261019130000:24`, `fn_assert_appointment_member_active` at `20261019140000:43`, `collaborator_appointment_ack_notification` at `20261019150000:13`). **Every attribution in the Components table (`design.md:88-92`) verified against the actual file** — see the table below. Round 3's three mis-attributions are fixed. | ✅ Closed (one cosmetic residual, R1) |
| 4 | 4 undocumented `react-hooks/exhaustive-deps` warnings on `data ?? []` memo deps | `4c9b92b` | Both memos are now `useMemo(() => availability.data ?? [], [availability.data])` at `src/pages/PJ/AgendaPage.tsx:116-117` and `src/pages/colaborador/ColaboratorAgendaPage.tsx:58-59`, and the downstream `events` memo (`:119-127` / `:61-69`) depends on `availabilityRows, appointmentRows`, whose identity is stable while `data` is unchanged. Measured: `npx eslint . -f json` gives **23** `react-hooks/exhaustive-deps` at HEAD and **23** at `1716a95`; per-file breakdown shows **zero** in either page (all 23 are pre-existing). Sensor M5 (memo returns `[]`) kills three tests, so the memoised value is load-bearing. | ✅ Closed |

**Round-3 gaps: 4/4 closed against the brief's stated criteria.** The one sub-item of gap 3 not addressed is the ACK Data Model / Tech Decision entry — cosmetic, carried as residual R1.

---

## Task Completion

All **105** checkboxes in `tasks.md` are `- [x]`; **0** unchecked. Every named commit exists inside `1716a95..HEAD`.

| Task group | Status | Notes |
| ---------- | ------ | ----- |
| T1–T3 Foundation (vitest harness, schedule primitives, DB harness) | ✅ Done | `bff5c7b`, `31fc6e2`, `c33390b` |
| T4–T8 Database, notify seam, view extraction | ✅ Done | `68e6a84`, `57b0280`, `4a63924`, `abad55c`, `e1f621e` |
| T9–T18 Core / Integration | ✅ Done | `211e11f` … `e6ad2e0` |
| Unplanned follow-ups | ✅ Done | `30d7c92` manager cancel, `5212a98` member guard |
| Fix round 1 | ✅ Done | `a014ea3`, `b042698`, `f0a5220`, `d8351ea`, `6cd345e`, `a29c172`, `c218da8`, `dfba97c`, `6f981a1`, `d546638` |
| Fix round 2 | ✅ Done | `2703d26`, `a95af09`, `e0a1460`, `bc262f0`, `6d74837` |
| Round-3 fix round | ✅ Done | `4455d5d` (AVAIL-12 + traceability + design), `4c9b92b` (memo + deviation marker) |

---

## Spec-Anchored Acceptance Criteria — 54/54

Paths are abbreviated in the table: `schema-…` = `tests/db/schema-collaborator-agenda.test.ts`, `behavior-…` = `tests/db/behavior-collaborator-agenda.test.ts`, `avail-…` = `src/components/areapj/AvailabilityForm.test.tsx`, `sel-…` = `src/components/agenda/CollaboratorSelector.test.tsx`, `agenda-…` = `src/pages/PJ/AgendaPage.test.tsx`, `colab-…` = `src/pages/colaborador/ColaboratorAgendaPage.test.tsx`, `hook-app-…` = `src/hooks/useCollaboratorAppointments.test.tsx`, `hook-av-…` = `src/hooks/useCollaboratorAvailability.test.tsx`, `notify-…` = `supabase/functions/notify-appointment/notify-appointment.test.ts`, `shared-…` = `supabase/functions/_shared/collaborator-agenda.test.ts`, `rt-…` = `src/lib/realtime-query-config.test.tsx`, `ack-…` = `tests/db/notification-collaborator-appointment-ack.test.ts`.

### P1 — Collaborator declares unavailable time

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| AVAIL-01 | one row, both dates `2026-11-05`, `start_time` `14:00`, `end_time` `16:00` | `schema-…:215` — `expect(inserted.rows[0]).toEqual({ start_date:'2026-11-05', end_date:'2026-11-05', start_time:'14:00', end_time:'16:00' })`; client payload `avail-…:167` — `expect(mutateAsync).toHaveBeenCalledWith({…})`; single insert carrying `workspace_id`/`member_user_id` `hook-av-…:175` — `expect(fromMock.callsFor('insert')[0]).toEqual([expected])` | ✅ PASS |
| AVAIL-02 | one row, both times `NULL`, both dates `2026-12-01`/`2026-12-31` | `schema-…:191` — `expect(inserted.rows[0]).toEqual({ start_date:'2026-12-01', end_date:'2026-12-31', start_time:null, end_time:null, workspace_id: WORKSPACE_A, member_user_id: COLLABORATOR_A })`; mapping `avail-…:141` — `expect(buildAvailabilityInput({granularity:'mes',…})).toEqual({ start_date:'2026-12-01', end_date:'2026-12-31', reason:null })`; dialog `avail-…:212` | ✅ PASS |
| AVAIL-03 | a **single** row covering 2026-11-10…14 inclusively | `avail-…:129` — `expect(buildAvailabilityInput({granularity:'intervalo', startDate:'2026-11-10', endDate:'2026-11-14'})).toEqual({ start_date:'2026-11-10', end_date:'2026-11-14', reason:null })`; one insert only `hook-av-…:175`; inclusive per-day expansion `src/components/agenda/CalendarEvent.test.ts:88` — `expect(events.map(e=>e.date)).toEqual(['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14'])` and `:92` — `expect(new Set(events.map(e=>e.id)).size).toBe(5)` | ✅ PASS |
| AVAIL-04 | reject and display `A data final deve ser igual ou posterior à data inicial.`; no DB write | schema error `avail-…:43` — `expect(result.error?.issues[0].message).toBe(AVAIL_DATE_ORDER_ERROR)`; rendered + no write `avail-…:199` `expect(screen.getAllByText(AVAIL_DATE_ORDER_ERROR).length).toBeGreaterThan(0)` and `:201` `expect(mutateAsync).not.toHaveBeenCalled()`; literal byte-equal to spec `src/components/areapj/AvailabilityForm.tsx:23`; DB backstop `schema-…:137` — `{ code:'23514', constraint:'collaborator_availability_dates_check' }` | ✅ PASS |
| AVAIL-05 | reject and display `Horários só podem ser usados em um único dia.`; no DB write | schema error `avail-…:55` — `expect(result.error?.issues[0].message).toBe(AVAIL_SINGLE_DAY_ERROR)` (`:54` `expect(result.success).toBe(false)`); literal `AvailabilityForm.tsx:24` byte-equal to spec; DB backstop `schema-…:159` — `{ code:'23514', constraint:'collaborator_availability_times_single_day_check' }`. **Display half is inferred, not rendered**: unlike AVAIL-04 (`:190-202`) and AVAIL-06 (`:176-188`) there is no dialog case, though the identical `formSchema → errorMessage → errorMessage` wiring is exercised by both siblings. | ⚠️ Spec-precision gap (display half inferred) |
| AVAIL-06 | reject and display `O horário final deve ser posterior ao inicial.`; no DB write | `avail-…:68` over `['16:00','14:00']` **and** `['16:00','16:00']` (`:59`) — `expect(result.error?.issues[0].message).toBe(AVAIL_TIME_ORDER_ERROR)`; rendered + no write `:185` and `:187`; literal `AvailabilityForm.tsx:25`; DB `schema-…:170` — `{ code:'23514', constraint:'collaborator_availability_times_order_check' }` | ✅ PASS |
| AVAIL-07 | each row rendered as a distinct blocked block over the affected days or hours | `colab-…:107` — `expect([...chips].some(c => c.textContent?.includes('Consulta médica'))).toBe(true)`; `:109` — `expect(screen.getAllByText('Consulta médica').length).toBeGreaterThanOrEqual(2)`; `CalendarEvent.test.ts:91` — `expect(events.every(e=>e.kind==='unavailability')).toBe(true)` with `:92` five distinct ids; timed row `:106-108` (`13:00`–`18:00`); whole day `:113-114` (`00:00`–`23:59`) | ✅ PASS |
| AVAIL-08 | `workspace_id` and `member_user_id` populated and non-null | `schema-…:191` — the `toEqual` carries `workspace_id: WORKSPACE_A, member_user_id: COLLABORATOR_A`; insert payload `hook-av-…:175` with fixtures `workspace_id:'ws-1'`, `member_user_id:'member-1'` (`:103-111`) | ✅ PASS |
| AVAIL-09 | row removed **and** calendar re-renders without a full reload | affordance `src/pages/colaborador/ColaboratorAgendaPage.tsx:237` — `onClick={() => removeAvailability.mutate(row.id)}`; `colab-…:121` — `expect(deleteMutate).toHaveBeenCalledWith('av-1')` and `:129` — `expect(screen.queryByText('Consulta médica')).not.toBeInTheDocument()`; hook `hook-av-…:190-192` — `expect(fromMock.steps).toContain('delete')`, `expect(fromMock.callsFor('eq')[0]).toEqual(['id','av-1'])`, `expect(invalidate).toHaveBeenCalledWith({ queryKey:['collab-availability'] })`; DB authority `schema-…:431` `expect(deleted.rowCount).toBe(1)` / `:438` `expect(remaining.rows[0].count).toBe('0')`. **My sensor M6 kills the affordance.** | ✅ PASS |
| AVAIL-10 | save the unavailability **and** render a conflict badge on that appointment **in both views** | Save `behavior-…:265` — `expect(inserted.rowCount).toBe(1)` with `:268-269` `expect((await readAppointment(pendingId)).status).toBe('pending')` / `.toBe('confirmed')`. Manager view `agenda-…:324-325` — `expect(overlapping!.className).toContain('ring-destructive')` + `expect(overlapping!.querySelector('svg')).toBeTruthy()`, negative control `:329-330` `not.toContain('ring-destructive')` / `toBeFalsy()`. Collaborator view `colab-…:148-154` — the identical two-sided pair. | ✅ PASS |
| AVAIL-11 | reject any submission whose `member_user_id` ≠ the authenticated user | `schema-…:396` — `expectFailure(INSERT …, { code:'42501', messageIncludes:'collaborator_availability' })` then `:410` — `expect(persisted.rows[0].count).toBe('0')` | ✅ PASS |
| AVAIL-12 | refuse the deletion of another collaborator's row and persist nothing | `schema-…:483` — `expect(byId.rowCount).toBe(0)`; `:489` — `expect(byOwner.rowCount).toBe(0)`; `:494` — `expect(unscoped.rowCount).toBe(Number(ownedBefore.rows[0].count))` (the only statement that puts the DELETE policy's `USING` alone on the plan); `:502` — foreign count unchanged; `:511-512` — `expect(remaining.rowCount).toBe(1)` / `expect(remaining.rows[0]).toEqual(targetRow)`; positive control `:431` `expect(deleted.rowCount).toBe(1)`. Design comment `schema-…:441-450` states the EXPLAIN reasoning. **My sensor M1 kills it.** | ✅ PASS |

### P1 — Manager views a collaborator's calendar and books without conflict

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| MGR-01 | selector lists **exactly** `is_active = true` AND `member_user_id IS NOT NULL` | `sel-…:57` — `expect(collaboratorOptionsFromTeam(TEAM)).toEqual([{id:'uid-maria',…},{id:'uid-joao',…}])`; `:65` — `expect(ids).not.toContain('uid-carlos')` (inactive but has account); `:70-71` — `expect(ids).not.toContain('uid-debora')` / `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])`; `:76` null **and** `:74-77` undefined `member_user_id` alike; rendered `:89-90` — `expect(labels).not.toContain('Carlos Dias')` / `not.toContain('Débora Lima')` | ✅ PASS |
| MGR-02 | without changing the selector, the manager's own `time_blocks`, behaviour unchanged | `agenda-…:224` — `expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument()`; `:226-227` — `expect(calls.from('collaborator_appointments')).toHaveLength(0)` and same for `collaborator_availability`; default selection `sel-…:93-102` (first option is the own calendar, reports `null` at `:111`) | ✅ PASS |
| MGR-03 | replace rendered events with the collaborator's appointments + unavailability; **no** personal `time_blocks` | `agenda-…:241` — `expect((await screen.findAllByText('Visita técnica')).length).toBeGreaterThan(0)`; `:242` — `expect(screen.queryByText('Meu bloco pessoal')).not.toBeInTheDocument()`; `:244-245` — eq args contain `['member_user_id','uid-maria']` | ✅ PASS |
| MGR-04 | refuse the write, persist **nothing**, display `Este período está indisponível para {nome} de {início} a {fim}.` | DB authority `behavior-…:136` — `{ code:'23P01', messageIncludes:'Este período está indisponível para Colaborador C de ' }` and `:145` — `expect(persisted.rows[0].count).toBe('0')`. Client `hook-app-…:176` — `rejects.toThrow('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.')` with `:179` `expect(calls.of('insert')).toHaveLength(0)`, and `:183-185` — `expect(formatConflictMessage('Maria','01/12/2026','31/12/2026')).toBe('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.')`. Page `agenda-…:361-362` — `expect(await screen.findByRole('alert')).toHaveTextContent(expected)` + `expect(calls.inserts()).toHaveLength(0)`. | ✅ PASS — ⚠️ **Spec-precision gap #1**: `spec.md:102` does not say whether `{início}`/`{fim}` are the availability bounds or the proposed window. Flagged in code at `20261019120100:65-68` as `SPEC_PRECISION_GAP`; tests pin the availability-bounds reading, which is the one the sentence reads as. My sensor **M8** kills the literal. |
| MGR-05 | one row, `status='pending'`, collaborator's `member_user_id`, manager's `workspace_id` | `schema-…:272` — `expect(inserted.rows[0]).toEqual({ status:'pending', member_user_id:COLLABORATOR_A, workspace_id:WORKSPACE_A, created_by:MANAGER_A })`; `agenda-…:389-398` — insert payload `workspace_id:'ws-1', member_user_id:'uid-maria', created_by:MANAGER_ID, title, notes, date, start_time, end_time` | ✅ PASS |
| MGR-06 | two managers' mutually overlapping appointments **both** persist, no data loss | `behavior-…:217-224` — second `pg` client bound to `MANAGER_D`, both INSERTs via `Promise.all` on `OVERLAP_DATE` (`10:00-11:00` and `10:30-11:30`); `:226-227` — `expect(first.rows).toHaveLength(1)` / `expect(second.rows).toHaveLength(1)`; `:235-237` — `expect(persisted.rows.map(r=>r.created_by).sort()).toEqual([MANAGER_A, MANAGER_D].sort())` | ✅ PASS |
| MGR-07 | **still create** the appointment; display `Colaborador sem WhatsApp cadastrado — notificação não enviada.` + manual resend | `src/components/agenda/AppointmentNotifier.test.tsx:108` — `expect(await screen.findByText(NO_WHATSAPP_MESSAGE)).toBeInTheDocument()`; `:109` `data-status='no_whatsapp'`; `:110` resend button present; literal `AppointmentNotifier.tsx:26` byte-equal to `spec.md:105`; appointment survives `notify-…:377` — `expect(state.appointment?.status).toBe('pending')` with `:374` `expect(calls).toHaveLength(0)` and `:381` `expect(result.body.notify_status).toBe('no_whatsapp')` | ✅ PASS |
| MGR-08 | deny a manager **read or write** on any row whose `workspace_id` differs from their workspaces | Read `schema-…:290-291` — `expect(appointments.rows[0].count).toBe('0')` / `expect(availability.rows[0].count).toBe('0')`. Write/INSERT `:346` — `expect(persisted.rows[0].count).toBe('0')` after `{ code:'42501', messageIncludes:'collaborator_appointments' }` (`:337`). Write/UPDATE filtered `:369` — `expect(updated.rowCount).toBe(0)` and `:376` title unchanged; **unscoped** (the discriminating form) `:384` `UPDATE … SET title = 'Reescrito'` with no WHERE, then `:391` — `expect(afterUnscoped.rows[0].title).toBe(before.rows[0].title)` | ✅ PASS |
| MGR-09 | change persisted **and** no WhatsApp sent | Cancel `behavior-…:375-377` — `expect(row.status).toBe('cancelled')` / `expect(row.decided_by).toBe(MANAGER_A)` / `expect(row.decided_at).not.toBe(null)`; already-confirmed `:396-397`; body edit `:476-488` with `:486-488` `status`/`decided_at`/`decided_by` untouched. Page payload `agenda-…:450-454` — `{ status:'cancelled', decided_at:…, decided_by:MANAGER_ID }`. No-WhatsApp `hook-app-…:295` — `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` over the whole hook file, plus `:282-284` `expect(payload).not.toHaveProperty('status'/'decided_at'/'decided_by')` | ✅ PASS |
| MGR-10 | unavailability blocks visually distinct from appointment blocks | `agenda-…:296-297` — `expect(unavailabilityStyle.background).toBeTruthy()` and `expect(unavailabilityStyle.background).not.toBe(appointmentStyle.background)` | ✅ PASS |
| MGR-11 | switching back restores the personal view with **no residual** collaborator rows | `agenda-…:258-259` — `expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument()` and `expect(screen.queryByText('Visita técnica')).not.toBeInTheDocument()` | ✅ PASS |
| MGR-12 | persist observation as `notes`; store `NULL` when absent | Given `agenda-…:389-398` — `expect(calls.inserts()[0].args[0]).toEqual({…, notes:'Levar o equipamento de teste', …})`; absent `:416` — `expect((calls.inserts()[0].args[0]).notes).toBeNull()` | ✅ PASS |

### P1 — WhatsApp notification with deep link on creation

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| NOTIF-01 | adapter invoked **exactly once** with `corporate_team.whatsapp`; message contains title, date, time range and the deep link | `AppointmentNotifier.test.tsx:83-84` — `expect(invokeMock).toHaveBeenCalledTimes(1)` / `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION,{ body:{ appointment_id:'ap-1' } })`. Body `notify-…:133-143` — `expect(calls).toHaveLength(1)`, `expect(body.number).toBe('5511999990001')` (the `corporate_team.whatsapp` read at `supabase/functions/notify-appointment/index.ts:75-83`), `expect(body.message).toContain('Reunião de alinhamento')` / `toContain('05/11/2026')` / `toContain('14:00–16:00')` / `toContain(DEEP_LINK)`. First name only `shared-…:32-38` — `toContain('Maria')` **and** `not.toContain('Maria Silva')` | ✅ PASS |
| NOTIF-02 | appointment kept `status='pending'`, failure recorded in `appointment_notification_log`, resend affordance surfaced | `notify-…:173-179` — `notify_status='failed'`, `expect(state.appointment?.status).toBe('pending')`, `expect(state.attempts).toEqual([{attempt:1,status:'failed',providerResponse:expect.stringContaining('agzap_500')}])`; timeout `:214-220`; resend `AppointmentNotifier.test.tsx:126` — `expect(screen.getByRole('button',{name:/Reenviar/})).toBeInTheDocument()`; real-table row shape `schema-…:592-598` | ⚠️ Spec-precision gap — AD-003/Deno boundary (honest, see section below) |
| NOTIF-03 | a resend writes a **new** row; previous attempt untouched | `notify-…:297-306` — `expect(first.body.attempt).toBe(1)`, `expect(second.body.attempt).toBe(2)`, `expect(state.attempts[0]).toEqual({attempt:1,status:'sent',providerResponse:null})`, `expect(state.attempts[1].attempt).toBe(2)` / `.status).toBe('failed')`; `:343-344` `attempt` sequence `[1,2]`. Client half `AppointmentNotifier.test.tsx:133-136` — both invocations carry only `{ appointment_id:'ap-1' }` | ✅ PASS |
| NOTIF-04 | at most one message per `appointment_id` + attempt | `notify-…:264-269` — `expect(second.body.skipped).toBe('attempt already claimed')`, `expect(calls).toHaveLength(1)`, `expect(state.attempts).toHaveLength(1)`; DB uniqueness `schema-…:547-558` — second insert `{ code:'23505', constraint:'appointment_notification_log_appointment_id_attempt_key' }` and `expect(attempts.rows[0].count).toBe('1')` | ✅ PASS |
| NOTIF-05 | base URL, endpoint path and credential only server-side, never in a `VITE_` variable or client source | `notify-…:396-398` — env withheld ⇒ `expect(calls).toHaveLength(0)` and `notify_status='failed'`; `:402-403` — `expect(coreSource).not.toContain('VITE_')` / `expect(indexSource).not.toContain('VITE_')`; client `AppointmentNotifier.test.tsx:183` — `expect(source).not.toMatch(/VITE_\|AGZAP\|agzap\.com\.br/)`; `verify_jwt` default kept `:443-444` | ✅ PASS |
| NOTIF-06 | abort the attempt after **10 seconds** and record `timeout` | `notify-…:226` — `expect(SEND_TIMEOUT_MS).toBe(10_000)`; `:243-248` with **no** injected `timeoutMs`, advancing exactly `SEND_TIMEOUT_MS` ⇒ `:247` `expect(result.body.notify_status).toBe('timeout')` and `:248` `expect(state.attempts).toEqual([{attempt:1,status:'timeout',providerResponse:null}])`; injected path `:214-220`. **My predecessor's sensor (10_000 → 5_000) is recorded as killed in round 3; I did not repeat it.** | ✅ PASS |
| NOTIF-07 | appointment edited or cancelled ⇒ no WhatsApp message | `notify-…:413-414` — `expect(Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS','handleNotifyAppointment'])` and `expect(indexSource).toContain('req.method !== "POST"')` (entry point `index.ts:38`); `hook-app-…:295` — the edit/cancel hook source contains no `functions.invoke` / `notify-appointment` / `AGZAP`; `grep` over the repo shows `AppointmentNotifier.tsx:22` is the **only** invoke site | ✅ PASS |
| NOTIF-08 | one row per attempt with `appointment_id`, `attempt`, `status`, `provider_response`, `created_at` | `notify-…:328-335` — `expect(state.logged).toEqual([{appointmentId:'appointment-1',attempt:1,status:'failed',providerResponse:expect.stringContaining('agzap_503')}])`; column names pinned in the real entry point `:354-356` — `.from("appointment_notification_log")`, `appointment_id: id`, `provider_response: providerResponse`; real row shape including `created_at` `schema-…:592-598` — `expect(inserted.rows[0]).toEqual({…, created_at: expect.any(Date)})`. Honest AD-003 boundary stated in code at `notify-…:348-353` and `schema-…:561-566`. | ⚠️ Spec-precision gap — AD-003/Deno boundary (honest) |
| NOTIF-09 | non-empty `notes` appended **between** the time range and the deep link | `shared-…:52-57` — `expect(link).toBeGreaterThan(range)`, **`expect(link - range).toBe(2)`** (exactly one intervening line), `expect(lines[range+1]).toContain('Levar o contrato')` and `toContain('Observação')`; absent cases `:64` (`null`) and `:71` (`''`, `'   '`) — `expect(linkLine(lines) - rangeLine(lines)).toBe(1)` | ✅ PASS |

### P1 — Collaborator confirms or cancels from their panel

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| COLAB-01 | renders appointments + unavailability with **no login step** when a session exists | `colab-…:99` — `expect(screen.queryByText('LOGIN-SCREEN')).not.toBeInTheDocument()`; route registration `src/components/auth/CollaboratorAgendaRoute.test.tsx:124-130` — `expect(routeStart).toBeGreaterThan(-1)` and `expect(routeBlock).toContain('<CollaboratorRoute>')` / `'<CollaboratorAgendaRoute>'` / `'<ColaboratorAgendaPage />'` | ✅ PASS (session-keeping itself is delegated to the pre-existing `CollaboratorRoute`, asserted structurally) |
| COLAB-02 | `status='confirmed'`, `decided_at` recorded, `decided_by = auth.uid()` | `behavior-…:286-288` — `expect(row.status).toBe('confirmed')`, `expect(row.decided_by).toBe(COLLABORATOR_C)`, `expect(row.decided_at).not.toBe(null)` (only `status` is sent, so the DB fills the rest — `20261019130000:74-75`); hook `hook-app-…:198-202` — `expect(calls.of('update')[0].args).toEqual([{status:'confirmed', decided_at:expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), decided_by:'member-1'}])` | ✅ PASS |
| COLAB-03 | `status='cancelled'`, `decided_at`, `decided_by = auth.uid()` | `behavior-…:301-303` — same three assertions with `'cancelled'`; hook `hook-app-…:214-218` — same `toEqual` shape | ✅ PASS |
| COLAB-04 | reject, persist nothing, display `Esta solicitação já foi respondida.` | `behavior-…:318-330` — `{ code:'P0001', messageIncludes:'Esta solicitação já foi respondida.' }` for both terminal states, then `:329-330` `expect(await readAppointment(confirmed)).toEqual(confirmedBefore)` / `cancelledBefore`; hook `hook-app-…:233` — `expect(calls.of('update')).toHaveLength(0)` with the throw asserted over `['confirmed','cancelled']` at `:222-231`; literal `src/hooks/useCollaboratorAppointments.ts:12` byte-equal to `spec.md:149` | ✅ PASS |
| COLAB-05 | reject an action on a row whose `member_user_id` ≠ own; persist nothing | `hook-app-…:243` — `rejects.toThrow('Sem permissão para responder este compromisso.')` with `:246` `expect(calls.of('update')).toHaveLength(0)`; DB `behavior-…:353` — `{ code:'P0001', messageIncludes:'Colaborador não pode alterar' }` over six columns, then `:356` `expect(await readAppointment(id)).toEqual(before)` | ⚠️ **Spec-precision gap #2**: `spec.md:150` names no message, and **two different invented strings exist** — client `useCollaboratorAppointments.ts:239` vs DB `20261019120100:158` / `20261019130000:58`. The DB side is flagged `SPEC_PRECISION_GAP`; the client side is not. Which string a user sees depends on whether the pre-check or the trigger fires. |
| COLAB-06 | `pending` ⇒ render **both** confirm and cancel | `colab-…:164-165` — `expect(within(section).getByRole('button',{name:/Confirmar/})).toBeInTheDocument()` and the same for `/Cancelar/` | ✅ PASS |
| COLAB-07 | `confirmed` or `cancelled` ⇒ render **no** confirm/cancel action | `colab-…:173-174` (confirmed) and `:182-183` (cancelled) — `expect(screen.queryByRole('button',{name:/Confirmar/})).not.toBeInTheDocument()` and the same for `Cancelar` in **both** statuses | ✅ PASS |
| COLAB-08 | manager's change reaches the open panel without a manual reload | `rt-…:114` — `expect(new Set(entries.map(e=>e.queryKey)).size).toBe(2)` (two independent caches); `:120` — `expect(entries.every(e=>e.state.isInvalidated)).toBe(true)` after one `collaborator_appointments` event; negative control `:129` — `expect(entries.some(e=>e.state.isInvalidated)).toBe(false)` for an unrelated table | ⚠️ Spec-precision gap — asserted at **cache-invalidation** level (the refetch the page consumes), not on a rendered status string; the spec defines no rendered value to assert |
| COLAB-09 | deny a collaborator SELECT on any row with a different `member_user_id` | `schema-…:304-309` — `expect([...new Set(ownAppointments.rows.map(r=>r.member_user_id))]).toEqual([COLLABORATOR_A])` and the same for availability `:307-309`; `:322-327` the same for `COLLABORATOR_B`, a `workspace_members` row with role `member` — the exact shape that a `has_workspace_access` policy would let through. **My probe M2 (manager predicate removed from the UPDATE policy) kills eleven cases.** | ✅ PASS |
| COLAB-10 | flag off ⇒ hide the agenda nav item **and** redirect `/colaborador/agenda` → `/colaborador` | `src/components/layout/AppSidebar.test.tsx:55` — `expect(screen.queryByRole('link',{name:/Agenda/})).not.toBeInTheDocument()` while `:56` `Meu Painel` stays; `MobileNav.test.tsx:47` same; redirect `CollaboratorAgendaRoute.test.tsx:87-88` — `expect(screen.getByText('COLABORADOR-PORTAL')).toBeInTheDocument()` / `expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument()` | ✅ PASS |
| COLAB-11 | collaborator without `member_user_id` excluded from selector, portal and all appointment queries | `sel-…:70-71` — `expect(ids).not.toContain('uid-debora')` / `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])`; `:74-77` the same for `member_user_id: undefined`; queries keyed on `member_user_id` `hook-app-…:341` — `expect(calls.of('eq')[0].args).toEqual(['member_user_id','member-1'])` | ✅ PASS — the "portal" half (`CollaboratorPortal.tsx`) is pre-existing and outside `1716a95..HEAD`; it is also vacuous, since a `member_user_id IS NULL` row has no account and therefore no portal session |
| COLAB-12 | render the observation alongside the appointment details | `colab-…:194-196` — `expect(within(section).getByText('Trazer o contrato assinado')).toBeInTheDocument()` with a `notes`-present and a `notes`-absent sibling both rendering (`:195-196`) | ✅ PASS |

### P2 — Realtime propagation

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| SYNC-01 | collaborator's confirm reaches the manager's open `/pj/agenda` | `rt-…:120` — `expect(entries.every(entry=>entry.state.isInvalidated)).toBe(true)` across both parties' caches after one `collaborator_appointments` event, with `:114` proving they are two queryKeys | ✅ PASS |
| SYNC-02 | manager's creation reaches the collaborator's open `/colaborador/agenda` | `rt-…:72-86` builds one cache as `collab-self` and one as `manager-a`; `:114` two queryKeys; `:120` both invalidated; negative control `:129` | ✅ PASS |
| SYNC-03 | `REPLICA IDENTITY FULL` set with the idempotent `DO`-block pattern of `20260617120000_realtime_react_query_tables.sql` | `schema-…:615` — `expect(published.rowCount).toBe(2)`; `:616-621` — filter `relreplident.toUpperCase()==='F'` → `toEqual(['collaborator_appointments','collaborator_availability'])`. Block itself `20261019120000:158-184` — looped `ALTER TABLE … REPLICA IDENTITY FULL` + `ALTER PUBLICATION … EXCEPTION WHEN duplicate_object` | ✅ PASS |
| SYNC-04 | collaborator's unavailability reaches the manager's open view | `rt-…:136-141` — `expect(entries.every(entry=>entry.state.isInvalidated)).toBe(true)`; binding asserted `:99-100` | ✅ PASS |

### P2 — Permission flag gates the feature

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| PERM-01 | flag false ⇒ omit the agenda entry from sidebar **and** mobile nav | Off `AppSidebar.test.tsx:55` / `MobileNav.test.tsx:47` — `expect(screen.queryByRole('link',{name:/Agenda/})).not.toBeInTheDocument()`. On `AppSidebar.test.tsx:47` / `MobileNav.test.tsx:39` — `expect(link).toHaveAttribute('href','/colaborador/agenda')` | ✅ PASS |
| PERM-02 | flag false + direct URL ⇒ redirect to `/colaborador` | `CollaboratorAgendaRoute.test.tsx:87-88` after `setRows([{feature_key:'agenda',enabled:false}])` at `:84` | ✅ PASS |
| PERM-03 | no flag row ⇒ schema default grants access | `CollaboratorAgendaRoute.test.tsx:91-97` — `setRows([])` at `:92`, then `:95-96` `expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument()` / `expect(screen.queryByText('COLABORADOR-PORTAL')).not.toBeInTheDocument()`, driven through the **real** `useCollaboratorPermissions` hook | ✅ PASS |

### P3 — Manager acknowledgement

| # | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | -------------------- | ---------------------------------- | ------ |
| ACK-01 | write an in-app notification to the creating manager | `ack-…:112-124` — `expect(rows).toHaveLength(1)`, `expect(row.user_id).toBe(MANAGER)`, `expect(row.workspace_id).toBe(WORKSPACE)`, `expect(row.type).toBe('agenda')`, `expect(row.link).toBe('/pj/agenda')`, `expect(row.read).toBe(false)`, `expect(row.created_at).not.toBe(null)`, `expect(row.title).toBe('Compromisso confirmado')`, `expect(String(row.message)).toContain('confirmou')` / `toContain('Reunião de alinhamento')` / `toContain('11/01/2027')`; cancel half `:133-143`; negative controls `:153` (manager withdrawal) and `:162` (creator answers own) both write **nothing**. Trigger `20261019150000:23-46`. **My sensor M4 (link changed) kills two cases.** | ✅ PASS |
| ACK-02 | collaborator confirms/cancels ⇒ **no** WhatsApp message | `hook-app-…:295` — `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` on `useCollaboratorAppointments.ts`, the file implementing `useRespondAppointment`; `notify-…:413-414` — the only entry point is the POST-only `handleNotifyAppointment`, reachable only from creation (`index.ts:38`); `ack-…:178-185` — `public.notifications` has **no INSERT policy**, so the row can only come from the `SECURITY DEFINER` trigger, which is pure SQL and cannot reach a provider | ✅ PASS (structural: the requirement is an absence, and the only provider call site in the feature is creation) |

**Tally**: **54 ✅ · 0 ❌ GAP.** Of the 54: **2** carry ⚠️ spec-precision gaps on the spec-defined message (MGR-04, COLAB-05), **1** has an inferred display half (AVAIL-05), **1** is asserted at the cache layer rather than on a rendered value (COLAB-08), and **2** (NOTIF-02, NOTIF-08) sit behind the AD-003/Deno boundary with honest `SPEC_PRECISION_GAP` comments.

### The AD-003 / Deno boundary — scored as a precision gap, not an absence

`AD-003` (`.specs/STATE.md:21-27`) records that Deno is not installed, so `notify-appointment/index.ts` cannot execute locally. I checked that the boundary is declared honestly rather than papered over:

- `supabase/functions/notify-appointment/notify-appointment.test.ts:348-353` — `// SPEC_PRECISION_GAP: Deno is not installed on this machine (AD-003), so index.ts's real INSERT/UPDATE never executes here…`
- `tests/db/schema-collaborator-agenda.test.ts:561-566` — same marker, pointing at the DB-side assertion that stands in for it.
- The substitute evidence is not vacuous: the table and column names are pinned against the **real entry-point source** (`:354-356`), and the **real table** produces the five-column row shape including `created_at` (`schema-…:592-598`).
- `index.ts` really does implement the contract: `claimAttempt` is an `upsert … ignoreDuplicates` (`:96-107`, i.e. `INSERT … ON CONFLICT DO NOTHING`), `recordAttempt` writes `status`/`provider_response` (`:109-116`), `setNotifyStatus` writes `notify_status` (`:118-124`).

**Scored ⚠️ precision gap, not ❌ absence** — as instructed.

---

## Edge Cases (`spec.md:213-222`, 10 items)

| # | Edge case | `file:line` + assertion expression | Result |
| - | --------- | ---------------------------------- | ------ |
| 1 | No unavailability rows ⇒ fully bookable, no empty-state error | `colab-…:94-97` — `expect(screen.getByText('Nenhuma indisponibilidade declarada neste mês.')).toBeInTheDocument()` and `expect(screen.getByText('Seg')).toBeInTheDocument()` (the calendar itself renders; the line is an invitation, not an error) | ✅ |
| 2 | Zero appointments and zero unavailability ⇒ empty calendar with an invitation, not an error | `agenda-…:269-274` — `findByText(/Nenhum compromisso agendado/)`, `getByRole('button',{name:/Novo compromisso/})`, `getByText(/Sem indisponibilidade declarada/)`, `getByText('Seg')`, `expect(screen.queryByRole('alert')).not.toBeInTheDocument()` | ✅ |
| 3 | Collaborator deactivated between select and save ⇒ reject `Este colaborador não está mais ativo.` | Client `agenda-…:430-431` — `expect(await screen.findByRole('alert')).toHaveTextContent('Este colaborador não está mais ativo.')` + `expect(calls.inserts()).toHaveLength(0)`. DB authority `tests/db/guard-collaborator-appointment-member.test.ts:127` — `{ code:'P0001', messageIncludes: SPEC_MESSAGE }` (literal at `:31` byte-equal to spec) and `:133` — `expect(await persistedCount(...)).toBe('0')` | ✅ |
| 4 | Deep link unauthenticated ⇒ `/auth`, **then return to `/colaborador/agenda`** | `src/components/auth/CollaboratorRoute.tsx:30` — `<Navigate to="/auth" state={{ from: location }} replace />`; `src/pages/Auth.tsx:42-43` — `const from = (location.state…)?.from; return <Navigate to={from?.pathname ?? '/'} replace />`; test `CollaboratorRoute.test.tsx:73-75` — `expect(screen.getByText('ORIGIN: /colaborador/agenda')).toBeInTheDocument()` and `:86-89` after a session appears — `expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument()` with `queryByText('ROOT')` / `('COLABORADOR-PORTAL')` absent | ✅ |
| 5 | Deep link opened by a non-`collaborator` ⇒ redirect `/caixa` | `CollaboratorAgendaRoute.test.tsx:104` (manager) and `:112` (admin) — `expect(screen.getByText('CAIXA-PAGE')).toBeInTheDocument()`; guard itself `CollaboratorRoute.tsx:33` | ✅ |
| 6 | Unavailability spanning a month boundary ⇒ rendered across both months, inclusive | `CalendarEvent.test.ts:99` — `expect(events.map(e=>e.date)).toEqual(['2026-11-30','2026-12-01','2026-12-02'])` | ✅ |
| 7 | Non-digit `corporate_team.whatsapp` ⇒ rejected at entry with `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.` | Literal `src/components/areapj/TeamMemberForm.tsx:33` byte-equal to `spec.md:219`; `TeamMemberForm.test.tsx:31-33` — `expect(WHATSAPP_DIGITS_ERROR).toBe('Informe o WhatsApp com DDI, DDD e número, apenas dígitos.')` + `expect(onSave).not.toHaveBeenCalled()`; rendered at `:29`; digits-only passes `:44-46`. **My sensor M3 (constant changed) kills it.** | ✅ |
| 8 | Touching endpoints ⇒ non-conflicting, save permitted | DB `behavior-…:186-187` — `expect(before.rows[0]).toEqual({start_time:'06:00',end_time:'09:00'})` and `expect(after.rows[0]).toEqual({start_time:'12:00',end_time:'13:00'})` against a `09:00–12:00` block; client mirror `CalendarEvent.test.ts:131-132` — `expect(availabilityConflictsWith(…,[timed])).toBe(false)` both ways; strict comparison in SQL `20261019120100:42-43` — `p_start_time < av.end_time AND p_end_time > av.start_time` | ✅ |
| 9 | Adapter throws an unhandled exception ⇒ catch, log, appointment intact | `notify-…:186-193` — `notify_status='failed'`, `expect(state.appointment?.status).toBe('pending')`, `expect(state.attempts).toEqual([{attempt:1,status:'failed',providerResponse:'conexão recusada'}])` | ✅ |
| 10 | Manager's own calendar selected ⇒ never query `collaborator_appointments` | `agenda-…:226-227` — `expect(calls.from('collaborator_appointments')).toHaveLength(0)` and the same for `collaborator_availability` | ✅ |

**Edge cases: 10/10.**

---

## Discrimination Sensor (round 4 — my own mutations)

Executed in an isolated scratch: `git worktree add --detach %TEMP%\r4-sensor-collab-agenda HEAD` (HEAD = `4c9b92b`) with a **directory junction** to the real `node_modules`. **The real worktree was never mutated; `git stash` was never used.** Each fault was applied with a script that `assert`s the exact old text occurs once, then reverted with `git checkout -- .` **inside the scratch only**.

Scratch baseline before any mutation: `npm run test` → **161 passed, exit 0**; `npm run test:db` → **61 passed, exit 0** — reproducing the real gates exactly, so the scratch is faithful.

**Six of the nine mutations target code written in fix rounds 1–3**, which I had never mutated: M1/M2 (fix round 2's `2703d26`, `a95af09`, `bc262f0` denial tests), M3 and M6 (fix round 1's `f0a5220`, `b042698`), M4 (fix round 1's `6f981a1`), M5 (round-3 fix `4c9b92b`).

| # | Mutation (behaviour-level fault) | File:line | Layer | Aimed at | Killed? |
| - | -------------------------------- | --------- | ----- | -------- | ------- |
| **M1** | Weakened policy: availability **DELETE** `USING (auth.uid() = member_user_id)` → `USING (true)` | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:114` | SQL RLS (**fix round 2**) | the AVAIL-12 denial case | ✅ **Killed** — 1 failed / 60 passed, exit 1, `tests/db/schema-collaborator-agenda.test.ts` |
| **M2** | Weakened policy: appointments **UPDATE** `USING` — dropped the collaborator branch, leaving manager-only (`is_workspace_admin OR is_super_admin`) | `20261019120000:135-139` | SQL RLS (**fix round 2** — the same policy `bc262f0`'s test pins) | COLAB-02/03/04/05, AVAIL-10, ACK-01 | ✅ **Killed** — **11 failed** / 50 passed, exit 1 across `behavior-…` and `notification-…` |
| **M3** | Changed a spec-defined value: `WHATSAPP_DIGITS_ERROR` → `'Informe o WhatsApp com DDD e número, apenas dígitos.'` (DDI dropped) | `src/components/areapj/TeamMemberForm.tsx:33` | TS validation (**fix round 1**, `f0a5220`) | the digits-only edge case | ✅ **Killed** — 1 failed / 160 passed, exit 1 |
| **M4** | Changed a required payload field: ACK trigger `link` `'/pj/agenda'` → `'/pj/compromissos'` | `supabase/migrations/20261019150000_collaborator_appointment_ack_notification.sql:42` | SQL trigger (**fix round 1**, `6f981a1`) | ACK-01's payload assertions | ✅ **Killed** — 2 failed / 59 passed, exit 1 |
| **M5** | Removed a required side effect: `useMemo(() => availability.data ?? [], [availability.data])` → `useMemo(() => [], [availability.data])` | `src/pages/colaborador/ColaboratorAgendaPage.tsx:58` | TS memo (**round-3 fix**, `4c9b92b`) | AVAIL-07, AVAIL-09, AVAIL-10 on the collaborator page | ✅ **Killed** — 3 failed / 158 passed, exit 1 |
| **M6** | Wrong target: delete affordance `removeAvailability.mutate(row.id)` → `removeAvailability.mutate('av-nonexistent')` | `src/pages/colaborador/ColaboratorAgendaPage.tsx:237` | TS wiring (**fix round 1**, `b042698`) | AVAIL-09's `toHaveBeenCalledWith('av-1')` | ✅ **Killed** — 1 failed / 160 passed, exit 1 |
| **M7** | Removed a required side effect: the conflict `RAISE EXCEPTION … USING ERRCODE='23P01'` → `RAISE NOTICE` | `supabase/migrations/20261019120100_collaborator_agenda_behavior.sql:105-106` | SQL trigger (**authority for MGR-04**) | MGR-04 both cases | ✅ **Killed** — 2 failed / 59 passed, exit 1 |
| **M8** | Off-by-one in a spec literal: `formatConflictMessage` template's trailing `.` removed | `src/hooks/useCollaboratorAppointments.ts:16` | TS message (**MGR-04**) | MGR-04 exact-string assertions | ✅ **Killed** — 3 failed / 158 passed, exit 1 across two suites |
| **M9** | Weakened a guard: `IF NOT EXISTS (… AND ct.is_active)` → `IF EXISTS (… AND NOT ct.is_active)` so an account with **no** `corporate_team` row is accepted | `supabase/migrations/20261019140000_collaborator_appointment_member_guard.sql:50-56` | SQL trigger (**the SPEC_DEVIATION half**, open question b) | `guard-…:136-147` | ✅ **Killed** — 1 failed / 60 passed, exit 1 |

**Sensor depth**: expanded (9 mutations across SQL RLS ×2 / SQL conflict trigger / SQL member guard / SQL ACK trigger / TS validation / TS memo / TS wiring / TS message literal; **6 of 9 on fix-round code**).

**Result**: **9 injected · 9 killed · 0 survived** → **PASS ✅**.

### Probe P1 (open question a) — recorded as a probe, **not** a mutation

Added a fully permissive `CREATE POLICY … FOR UPDATE … USING (true) WITH CHECK (true)` on `public.collaborator_availability` (`20261019120000`). Result: **61 passed, exit 0**. No test in either gate discriminates. This is *expected* — it adds a capability the spec defines no rule for, so it is not a fault and not counted in the 9. It is the empirical grounding for open question (a) below.

**Isolation check**: after `git worktree remove --force` + `git worktree prune` (both sensor scratch and the lint-baseline scratch at `1716a95`), `git worktree list` shows only the real tree, and `git status --porcelain` reads:

```
 M .specs/STATE.md
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
```

> **Note for the orchestrator**: the pre-sensor baseline I captured at the start of this run was **only the four `??` directories**, matching the brief. `.specs/STATE.md` became ` M` at **00:30:15**, after my baseline capture and while my gates were running — its Handoff block (`:71-78`) was filled in by an external actor during this round. **I never wrote to it**: I only ran Read/Bash/`git diff`. The sensor itself ran entirely inside the removed worktree. There is therefore no evidence of sensor leakage; the extra line is real but not mine.

---

## Gate Check

Gate commands from `tasks.md` "Gate Check Commands" (Build level = `npm run lint && npm run build && npm run test && npm run test:db`), plus the typecheck the brief asks for.

| Gate | Command | Result | Exit code |
| ---- | ------- | ------ | --------- |
| Unit | `npm run test` | **161 passed** (20 files), 0 failed, 0 skipped | **0** |
| Database | `npm run test:db` | **61 passed** (5 files), 0 failed, 0 skipped | **0** |
| Build | `npm run build` | `dist/` emitted, `✓ built in 10.58s` | **0** |
| Typecheck | `npx tsc --noEmit` | no output | **0** |
| Lint | `npm run lint` | **218 problems (172 errors, 46 warnings)** across **85** files | **1** |

- **Test count before the feature**: 0 — the repo shipped with no runner, no test files and no `test` script (`design.md` R2 / AD-004).
- **Test count after**: 161 + 61 = **222**; delta **+222** (round 1 recorded 199, round 2 220, round 3 222).
- **Skipped tests**: none in either gate.
- **Failures**: none in either gate.
- Every mutation run above reproduced these counts when reverted, so the scratch was faithful.

### Lint, measured honestly

I re-measured the baseline myself rather than trusting a prior report: a throwaway worktree at `1716a95` with a junction to `node_modules`, `npx eslint . -f json` → **202 problems across 80 files**. Current: **218 across 85 files**. **Net +16.**

| Rule | `1716a95` | now | Δ |
| ---- | --------- | --- | - |
| `@typescript-eslint/no-explicit-any` | 129 | 139 | **+10** |
| `react-refresh/only-export-components` | 15 | 21 | **+6** |
| `react-hooks/exhaustive-deps` | 23 | 23 | **0** ← round 3's four are gone |
| `no-case-declarations` | 25 | 25 | 0 |
| `prefer-const` | 5 | 5 | 0 |
| `no-empty-object-type` / `no-require-imports` / `null` | 5 | 5 | 0 |
| **Total** | **202** | **218** | **+16** |

The feature's entire remaining contribution is **+16 across 4 files**: `useCollaboratorAppointments.ts` (7 `any`), `useCollaboratorAvailability.ts` (3 `any`), `AvailabilityForm.tsx` (4 `react-refresh`), `TeamMemberForm.tsx` (1), `CollaboratorSelector.tsx` (1). (`views/EventPopoverContent.tsx` also reports 1 `react-refresh`, but it is a move of pre-existing code out of `AgendaPJ.tsx`, so it nets to zero.)

**Assessment of the documented reasons:**

| Class | n | Do the reasons hold? |
| ----- | - | -------------------- |
| `no-explicit-any` | 10 | **Yes.** Every one is a deliberate `'collaborator_appointments' as any` / `'fn_collaborator_has_conflict' as any`, and the reason is stated in code at `useCollaboratorAppointments.ts:51` and `useCollaboratorAvailability.ts:36`: *"The generated Supabase types predate this table."* The repo already carries 129 of them, so this is consistent with the existing style rather than a new pattern. Not a gate failure. |
| `react-refresh/only-export-components` | 6 | **Yes, and the reason is structural rather than asserted.** All six come from exporting spec-literal constants (`AVAIL_DATE_ORDER_ERROR`, `AVAIL_SINGLE_DAY_ERROR`, `AVAIL_TIME_ORDER_ERROR`, `WHATSAPP_DIGITS_ERROR`) and the pure `collaboratorOptionsFromTeam` helper from component files **so tests can assert them byte-for-byte against `spec.md`** — which is exactly what `validate.md` asks for. It is a dev-HMR-only warning and 15 instances pre-exist. Hoisting the constants to a non-component module would clear them in minutes; round 2 offered "hoist **or** accept", so accepting is within what was asked. |
| `react-hooks/exhaustive-deps` | 0 of feature code | **N/A — round 3's four are gone** (measured, see the rule table above). |

**Lint verdict**: exit 1, but the gate was **never green** — it failed with 202 problems before the feature existed, so the feature did not flip it. Net +16 against a pre-existing red baseline, **all 16 with documented, defensible reasons**. Round 3's only substantive lint objection (the four undocumented `exhaustive-deps` warnings) is closed. Minor; not attributable as a gate failure.

---

## Code Quality Check

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ⚠️ → ✅ now marked | `fn_assert_appointment_member_active` also refuses a `member_user_id` with **no** `corporate_team` row at all (`20261019140000:50-56`, tested at `guard-…:136-147`), whereas `spec.md:215` names only the *deactivated* case. It now carries an explicit `SPEC_DEVIATION` marker at `20261019140000:23-27` citing AD-008 — the unmarked-implementation finding from round 3 is closed. Justified; see open question (b). |
| No unnecessary flexibility / abstractions | ✅ | `CalendarEvent`, `schedule.ts`, the message builder and `notify-appointment.ts` are each consumed by ≥2 callers. |
| Only touched files required | ✅ | 61 `.ts`/`.tsx` files in the range: harness, feature code, `.specs/`, and four pre-existing files the feature legitimately wraps (`CollaboratorRoute.tsx`, `Auth.tsx`, `TeamMemberForm.tsx`, `vite.config.ts`). No drive-by refactors found. |
| Didn't "improve" unrelated code | ✅ | `AgendaPJ.tsx` was reduced to 397 lines by the extraction and is still covered by `AgendaPJ.test.tsx` (3 tests pass). |
| Matches existing patterns | ✅ | Hooks mirror `useAgendaPJ.ts`; the ACK trigger follows `handle_video_briefing_notification()`; migrations keep the repo's `DO`-block and no-policy-log patterns. |
| Tests map to ACs and are non-shallow | ✅ | 54/54 ACs map 1:1 to assertions I re-read myself. Payload fields are asserted on **value or state**, not merely that a call happened (`toEqual` payloads, `created_at` `expect.any(Date)`, `link - range).toBe(2)` for the exact intervening line). |
| Spec-anchored outcome check | ✅ | Every asserted message, status, SQLSTATE and number was checked against `spec.md`: **all 8 named literals in the spec exist verbatim in the source** (`grep` over `.ts`/`.tsx`/`.sql`). 2 spec-precision gaps flagged in code (MGR-04, COLAB-05); AVAIL-05's display half inferred; AD-003 boundary honest. **No assertion contradicts `spec.md`.** |
| Per-layer coverage expectation | ✅ | Domain/DB logic 1:1 with ACs; routes/nav cover happy + edge + error for every route in scope; both pages cover happy + badge + empty + permission paths. |
| Every test maps to an AC / edge case / Done-when | ✅ | The 14 `tests/db/harness.test.ts` cases and `src/test/harness.test.tsx` map to T1/T2 Done-when; `views.test.tsx` to T8; `schedule.test.ts` to T3; `rt-…:103-105` pins the pre-existing `time_blocks` binding (design R10). The round-3 "orphan `AVAIL-12` label" is gone now that `spec.md:85` defines the requirement. |
| Documented guidelines followed | ✅ | **none found** — `tasks.md:18` records "Guidelines found: none - strong defaults applied". Strong defaults (co-located tests, exact-string assertions) applied consistently. |

---

## SPEC_DEVIATION markers

Exactly **three** exist (`grep -rn SPEC_DEVIATION supabase/ src/ tests/`), one more than round 3 saw — `4c9b92b` added the third.

| Marker | Location | Verdict |
| ------ | -------- | ------- |
| Manager-side RLS uses `is_workspace_admin(…) OR is_super_admin(…)` instead of `has_workspace_access(workspace_id)` | `20261019120000_collaborator_agenda_schema.sql:79-94` | **Justified, correctly attributed.** `spec.md:154` (COLAB-09) is absolute — *any* row whose `member_user_id` differs from their own — while `has_workspace_access` is true for any `workspace_members` row and `create-collaborator` inserts collaborators there as `member`. `schema-…:312-328` proves the stricter predicate is what makes COLAB-09 hold for a real workspace member. The marker now names `AD-001 (.specs/STATE.md:5)` and `AD-006 (.specs/STATE.md:45)`; I opened `STATE.md` and **both line numbers are the correct AD headers** (`### AD-001` at line 5, `### AD-006` at line 45), and both decisions say what the marker says they say. The false "design.md's reuse table says…" premise from earlier rounds is gone. |
| `20261019130000` supersedes the manager branch of `20261019120100` | `20261019130000_collaborator_appointment_manager_cancel.sql:4-22` | **Justified; puts the spec above the design.** `20261019120100:181-189` had blocked the manager from `status` entirely, contradicting MGR-09 ("WHEN the manager cancels **or edits** … SHALL persist the change") and the user-confirmed assumption. `design.md:337` (Tech Decisions) and `STATE.md` AD-007 were both updated to match, and `behavior-…:363-489` pins the corrected contract. |
| The member guard's "no `corporate_team` row at all" half exceeds the spec's named deactivation case | `20261019140000_collaborator_appointment_member_guard.sql:23-27` | **Honest and justified** — full analysis under open question (b) below. Added by `4c9b92b`, closing round 3's "the one implementation that exceeds `spec.md` still carries no marker" finding. |

**Remaining `SPEC_PRECISION_GAP` markers** (all honest): `20261019120100:65-68` (MGR-04 placeholder ambiguity), `20261019120100:157` + `20261019130000:57` (COLAB-05 has no spec message), `notify-appointment.test.ts:348` + `schema-…:561` (AD-003 Deno boundary), `src/components/agenda/CalendarEvent.ts:70-74` (the spec does not say which `start`/`end` a whole-day row takes — `00:00`–`23:59` stated as the literal reading), and an untagged prose comment at `AvailabilityForm.tsx:36-40` ("the spec defines the granularity, not the clock bounds") for the half-day presets.

**Not marked**: the client-side COLAB-05 string at `useCollaboratorAppointments.ts:239` has no `SPEC_PRECISION_GAP` tag even though the SQL side does — see residual R4.

---

## design.md vs the migrations

### Ownership table (`design.md:88-92`) — every attribution re-derived

| design.md claim | Reality (grep of the actual file) | Holds? |
| --------------- | --------------------------------- | ------ |
| `20261019120000` owns both calendar tables, the log table, their CHECKs, all 6 RLS policies, the realtime registration, and `set_collaborator_appointments_updated_at` | tables `:10/:31/:61`; CHECKs `:20-27` and `:42/:47/:51`; policies `:100/:108/:112/:116/:124/:133` (6); realtime `DO` block `:158-184`; trigger `:55` | ✅ |
| `20261019120100` owns `fn_collaborator_has_conflict`, `fn_assert_appointment_no_conflict`, `fn_assert_appointment_transition`, and the `assert_appointment_no_conflict` / `assert_appointment_transition` triggers | functions `:16/:54/:124`; triggers `:113/:197` | ✅ |
| `20261019130000` replaces `fn_assert_appointment_transition` to add the manager branch | `:24` `CREATE OR REPLACE FUNCTION public.fn_assert_appointment_transition()` | ✅ |
| `20261019140000` owns `fn_assert_appointment_member_active` and its `BEFORE INSERT` trigger (AD-008) | `:43`, trigger `:68` | ✅ |
| `20261019150000` owns `collaborator_appointment_ack_notification`, a `SECURITY DEFINER` `AFTER UPDATE` trigger (ACK-01) | `:13` (SECURITY DEFINER, `SET search_path`), trigger `:54-57` | ✅ |
| `design.md:96` — "Total: 5 migrations, 5 distinct SQL functions, 5 triggers, 6 RLS policies" | counted independently: 5 / 5 / 5 / 6 | ✅ |

**Round 3's three mis-attributions are gone.** I verified this by grep rather than by reading the row text alone.

### Other design claims checked against the tree

| design.md claim | Reality | Holds? |
| --------------- | ------- | ------ |
| `:201-204` four availability CHECKs | `20261019120000:20-27`, four named constraints | ✅ |
| `:248-251` `fn_collaborator_has_conflict` is `SECURITY INVOKER`, `STABLE`, overlap `a.start < b.end AND a.end > b.start` | `20261019120100:16-47` — `LANGUAGE sql`, `STABLE`, no `SECURITY DEFINER`; `p_start_time < av.end_time AND p_end_time > av.start_time`; asserted `prosecdef:false, provolatile:'s'` at `behavior-…:124` | ✅ |
| `:257-258` transition-guard contract | `20261019130000:44-107` implements exactly that (collaborator field rights, terminal refusal, manager cancel-only, `decided_*` only alongside a status change) | ✅ |
| `:274` member guard refuses unless an **active** `corporate_team` row exists | `20261019140000:50-56`, `SECURITY DEFINER` + `SET search_path`, INSERT-only (`:70`) | ✅ (design text already covered the "absent" case; it is the *spec* that did not, hence the new marker) |
| `:242-244` `appointment_notification_log`: RLS on, zero policies, `UNIQUE(appointment_id, attempt)` | `20261019120000:61-73` and `:68`; asserted `relrowsecurity=true` and policy count `'0'` at `schema-…:524-530` | ✅ |
| `:115` `verify_jwt` stays default | `notify-appointment.test.ts:443-444` | ✅ |
| `:56` selector filter `is_active === true && member_user_id != null` | `CollaboratorSelector.tsx`, asserted `sel-…:57-77` | ✅ |
| `:62` two realtime entries appended | `realtime-query-config.ts:53-54` | ✅ |
| `:117-126` `schedule.ts` interfaces (4) | file exports **5** — `hasConflict` is also exported and consumed (`design.md` omits it) | 🔶 minor |
| `:28` mermaid node `fn_assert_valid_transition()` | the function is `fn_assert_appointment_transition()` (`design.md:253` uses the right name) | 🔶 minor — stale name in the diagram only |
| ACK notification anywhere in Data Models / Tech Decisions | Components row (`:92`) + `Reuses` line (`:95`) + `Dependencies` (`:94`) only — **no Data Model row and no Tech Decision row** | 🔶 residual R1 |

**Conclusion**: the counts and the per-migration ownership table — the brief's round-4 criteria — are **correct**. Three cosmetic residuals remain (R1 ACK entry, plus the two minor rows above); none affects a gate or an AC.

---

## Open question (a) — `public.collaborator_availability` has no UPDATE policy

**Facts I verified myself:**

- `20261019120000` defines exactly **three** policies on `collaborator_availability` — SELECT (`:100`), INSERT (`:108`), DELETE (`:112`). **No `FOR UPDATE` policy exists.**
- `:151` nonetheless does `GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_availability TO authenticated;`
- With RLS enabled and no UPDATE policy, every `UPDATE` by `authenticated` matches zero rows — **including a collaborator's own row**. It fails silently, with no error.
- `grep` for any availability update in `src/`, `tests/`, `supabase/` → **no hits**. Nothing in the feature edits availability.
- **My probe P1**: adding `CREATE POLICY … FOR UPDATE … USING (true) WITH CHECK (true)` leaves all **61** DB tests green. No test discriminates.

**My verdict: withholding the test is correct — I concur with round 3 — and it is not a FAIL gap.** Reasons, re-derived:

1. **The spec states no update rule anywhere.** AVAIL-01…03 create, AVAIL-04…06 validate, AVAIL-07 render, AVAIL-08 schema, AVAIL-09 **delete**, AVAIL-10 reverse-conflict, AVAIL-11 INSERT scoping, AVAIL-12 DELETE scoping. There is no "WHEN the collaborator edits an existing unavailability THEN …", no such edge case, and no Out-of-Scope row either. The user story (`spec.md:68`) asks to **mark** the periods; the confirmed granularity decision (`:40`) describes creation only.
2. **`validate.md` forbids writing that test.** Where the spec defines no precise outcome the rule is "mark ⚠️ Spec-precision gap … Do NOT silently pass a vague assertion." A test asserting "a collaborator cannot update another's row" would encode an outcome `spec.md` never defines — that is authoring a requirement, not verifying one.
3. **The failure mode is fail-closed.** An absent UPDATE policy can only ever affect **0** rows; it can never leak. Delete + re-create is a complete editing path under AVAIL-09.
4. **It would not have discriminated anything.** Probe P1 proves it: the suite is green either way, so the test would be a regression guard against a hypothetical future migration — speculative work outside the diff's scope.

**One genuine defect I am recording anyway (not the withheld test):** `20261019120000:151` **grants `UPDATE` on a table whose RLS then silently denies every update.** The grant and the policies disagree, so the next reader is invited to wire an edit UI that never lands, and the failure is silent rather than loud. That is a shipped inconsistency in the SQL, independent of whether an AC covers it. **Recommended fix task (Minor)**: drop `UPDATE` from the grant at `:151`, or add a one-line comment saying the capability is deliberately withheld and is a spec change first. Either is a one-line edit; neither requires an AC.

So: **defensible omission** for the test, **minor real defect** for the grant.

---

## Open question (b) — the `20261019140000` "no `corporate_team` row at all" `SPEC_DEVIATION`

**Is the marker honest?** Yes, on a line-by-line reading of `20261019140000:23-27`:

- It states plainly that *"o Edge Case do spec nomeia apenas o colaborador DESATIVADO"* and that *"a metade 'sem linha alguma em corporate_team' vai além do texto"* — i.e. it says, in the code, that this behaviour **exceeds** the spec. It does not pretend the spec covers it.
- It names **AD-008** as the governing decision. `STATE.md:61-67` says AD-008 is about an INSERT `WITH CHECK` that must constrain **who the row is about**, implemented as a `SECURITY DEFINER` function with an explicit `SET search_path` where the validating table is not readable by the writer. The guard is exactly that shape: `SECURITY DEFINER` (`:46`), `SET search_path = public, pg_temp` (`:47`), target-scoped predicate on `NEW.member_user_id`/`NEW.workspace_id`, reachable only after the table's own INSERT `WITH CHECK` has already constrained the actor. **The citation is a real match, not a decorative one.**
- The prose at `:16-21` states the concrete hole it closes: the INSERT `WITH CHECK` validates only the actor, so an admin could write a row for any `auth.users`, who would then see it in their own portal via `auth.uid() = member_user_id`.

**Is the deviation justified against the spec?** Yes:

- Spec MGR-01 fixes the selector to `is_active = true AND member_user_id IS NOT NULL`, and MGR-05 requires persisting "**the selected collaborator's** `member_user_id`". A `member_user_id` with no `corporate_team` row is therefore **never** a legitimate scheduling target under the spec's own model — the extension is the fail-closed reading of an existing rule, not a new user-facing rule.
- The edge case (`spec.md:215`) names only the deactivated case because that is the case a *select-then-save* race produces; it is silent about hand-crafted writes, which is precisely where the hole is.
- It is marked, it is documented in prose, **and it is tested** — `guard-…:136-147` asserts `{ code:'P0001', messageIncludes: SPEC_MESSAGE }` with `persistedCount === '0'`. My sensor **M9** (predicate flipped from `NOT EXISTS(… is_active)` to `EXISTS(… NOT is_active)`) kills exactly that case, so the deviation is **covered, not silent**.
- No AC or edge case is left unmet or contradicted by it.

**Verdict: honest and justified.** Round 3's objection — that it was "argued in prose but carries no marker" — is closed by `4c9b92b`.

---

## "Also check" — results

| Check | Result |
| ----- | ------ |
| Any test asserting a value **contradicting** `spec.md` | **None found.** I compared every asserted literal, status, SQLSTATE and count against the spec: the 8 messages the spec names verbatim all exist byte-for-byte in source (`AvailabilityForm.tsx:23-25`, `TeamMemberForm.tsx:33`, `AppointmentNotifier.tsx:26`, `useCollaboratorAppointments.ts:12/16`, `20261019120100:105/165`, `20261019130000:65/86`, `20261019140000:57`); the status vocabulary (`pending → confirmed \| cancelled`) matches the CHECK at `20261019120000:41-43`; `notify_status` includes `no_whatsapp` as MGR-07 requires (`:46-48`); the 10-second abort is pinned at `notify-appointment.test.ts:226`. |
| Any AC implemented differently from what the spec asked | **No unmet AC.** Four are implemented *partially below the assertion level* and are flagged rather than passed silently: AVAIL-05's display half (schema-level only), COLAB-08 (cache-invalidation level), COLAB-11's "portal" half (pre-existing and vacuous), NOTIF-07/ACK-02 (structural absence). None contradicts the spec. |
| `SPEC_DEVIATION` in `20261019120000`, `20261019130000`, `20261019140000` — justified? | **All three justified** — table above; (b) analysed in full. |
| Does `design.md` match the migrations throughout? | **Counts and ownership table: yes (verified per object).** Three cosmetic residuals: R1 (no ACK Data Model/Tech Decision row), a stale `fn_assert_valid_transition()` name in the mermaid diagram (`:28`), and `schedule.ts`'s interfaces list omitting the exported `hasConflict`. |
| Lint: do the remaining ~16 net-new problems have documented reasons? | **Yes — all 16.** 10 `any` with an in-code reason at `useCollaboratorAppointments.ts:51` / `useCollaboratorAvailability.ts:36`; 6 `react-refresh` structurally required so tests can assert spec literals byte-for-byte (dev-HMR-only, 15 pre-existing). Round 3's undocumented-`exhaustive-deps` objection is closed (measured: 23 → 23 vs baseline). |
| AVAIL-12 present, EARS-shaped, spec/test agree? | **Yes** — see gap-closure row 1. |
| Traceability honest, not blanket-stamped? | **Yes** — 54 `Verified`, coverage arithmetic re-counted, 5 spot-checks all real. |

---

## Findings / Residual recommendations (non-blocking)

None of these unmet-tests an AC, contradicts the spec, or survives a mutation. They are recorded so they are not lost; **none blocks the PASS verdict**.

### R1 — `design.md` has no Data Model or Tech Decision entry for the ACK notification (Cosmetic)
- **Evidence**: `design.md` Data Models covers `collaborator_availability`, `collaborator_appointments`, `appointment_notification_log`, `fn_collaborator_has_conflict`, `fn_assert_appointment_transition`; Tech Decisions covers conflict logic, field rights, the manager/`status` rule, the message builder, transport, `notify_status`, RLS predicate, tables vs `time_blocks`, insert rights, timezone, provider seam. The ACK path appears only as a Components row (`:92`) and a `Reuses` line (`:95`).
- **Fix task**: add a Data Model row for `public.notifications` (via `SECURITY DEFINER` `AFTER UPDATE`, `decided_by <> created_by`, `link = '/pj/agenda'`, `type = 'agenda'`) or a Tech Decision row for why it is a DB trigger rather than a client call.
- **Priority**: Cosmetic. This is the one sub-item of round-3 gap 3 the brief did not list among its round-4 criteria.

### R2 — `GRANT … UPDATE` on a table whose RLS denies every update (Minor)
- **Evidence**: `20261019120000:151` grants `UPDATE`; `:100/:108/:112` define only SELECT/INSERT/DELETE. Probe P1 confirms a permissive UPDATE policy passes all 61 tests, so nothing in the suite notices the disagreement.
- **Fix task**: drop `UPDATE` from the grant, or add a comment that the capability is deliberately withheld pending a spec AC. One line.
- **Priority**: Minor.

### R3 — COLAB-05 has two different invented messages (Minor, already lesson L-016)
- **Evidence**: client `useCollaboratorAppointments.ts:239` `'Sem permissão para responder este compromisso.'` vs DB `20261019120100:158` / `20261019130000:58` `'Colaborador não pode alterar os dados do compromisso (…)'`. Which the user sees depends on whether the pre-check or the trigger fires. The SQL side carries `SPEC_PRECISION_GAP`; the client side does not.
- **Fix task**: extract one shared literal, or tag the client constant too.
- **Priority**: Minor (spec defines no message, so no AC is at stake).

### R4 — AVAIL-05's display half is inferred (Cosmetic)
- **Evidence**: `AvailabilityForm.test.tsx:46-56` asserts the zod schema rejects; unlike AVAIL-04 (`:190-202`) and AVAIL-06 (`:176-188`) there is no dialog case proving the message renders. The wiring is identical and exercised by both siblings.
- **Fix task**: add a third dialog case with `granularity: 'intervalo'`, times set, dates differing.
- **Priority**: Cosmetic.

---

## Requirement Traceability Update

**Applied by the orchestrator in `4455d5d`, re-verified here as read-only.** The Verifier does not modify `spec.md`.

| Requirement group | Status in `spec.md` | Round-4 verdict |
| ----------------- | ------------------- | ----------------- |
| AVAIL-01 … AVAIL-12 | Verified | ✅ Verified (AVAIL-05 carries ⚠️ display-half note) |
| MGR-01 … MGR-12 | Verified | ✅ Verified (MGR-04 carries ⚠️ spec-precision gap) |
| NOTIF-01 … NOTIF-09 | Verified | ✅ Verified (NOTIF-02 / NOTIF-08 behind the honest AD-003 boundary) |
| COLAB-01 … COLAB-12 | Verified | ✅ Verified (COLAB-05 ⚠️ precision gap; COLAB-08 ⚠️ assertion layer) |
| SYNC-01 … SYNC-04 | Verified | ✅ Verified |
| PERM-01 … PERM-03 | Verified | ✅ Verified |
| ACK-01, ACK-02 | Verified | ✅ Verified (ACK-02 structural, justified by absence) |

**Coverage line `spec.md:287`**: `54 total, 49 mapped to tasks, 5 unmapped` — **confirmed accurate** against an independent recount of `tasks.md`.

---

## Summary

**Overall**: ✅ **Ready** — **PASS**

**Spec-anchored check**: **54/54 ACs** carry evidence whose asserted value equals the spec-defined outcome · **0** uncovered · **0** contradicting · **10/10** edge cases. **5** ACs flagged ⚠️ spec-precision gaps (MGR-04 placeholder ambiguity, COLAB-05's missing message with two different strings, AVAIL-05's inferred display half, COLAB-08's assertion layer, and the honest AD-003/Deno boundary behind NOTIF-02/NOTIF-08), plus the pre-existing `CalendarEvent.ts:70-74` whole-day gap and the untagged half-day preset note at `AvailabilityForm.tsx:36-40`.
**Gate**: `npm run test` **161 passed / exit 0**; `npm run test:db` **61 passed / exit 0**; `npm run build` **exit 0**; `npx tsc --noEmit` **exit 0**; `npm run lint` **218 problems (172 errors, 46 warnings) / exit 1** — baseline re-measured by me at `1716a95` = **202 / 80 files**, so net **+16**, and **all 16 documented**; round 3's four `react-hooks/exhaustive-deps` warnings are gone (23 → 23 vs baseline).
**Round-3 gaps**: **4/4 closed** against the brief's stated criteria — AVAIL-12 restored and EARS-shaped with matching assertions; traceability 54/`Verified` with an accurate coverage line; `design.md` counts and all five ownership attributions verified correct and committed; the four memo-dep lint warnings fixed and measured away.
**Sensor**: **9 mutations injected, 9 killed, 0 survived** — **6 of 9 on fix-round code** (`2703d26`/`a95af09`, `bc262f0`, `f0a5220`, `b042698`, `6f981a1`, `4c9b92b`). Plus probe P1 (availability UPDATE policy), recorded as a probe and not counted.
**Diff range**: `1716a95..HEAD` — 41 commits, HEAD `4c9b92b`.

**What works**: all five availability granularities and all three AVAIL messages (client zod + DB CHECK, byte-exact spec literals); the delete affordance with cache invalidation **and** a denial test that discriminates the DELETE policy under an unscoped statement; the conflict hard block with the exact spec sentence and nothing persisted; the reverse-conflict badge in both views with a negative control; two overlapping concurrent appointments both persisting; cross-workspace and cross-collaborator RLS on read **and** write including the unscoped statements; the appointment state machine in both directions plus the manager's asymmetric branch; the notification lifecycle (exactly-once, attempt history, dedup, pinned 10-second default, failure/timeout/no-whatsapp verdicts, deep link + observation placement, five-column log row); the in-app ACK to the creating manager with three negative cases; the digits-only WhatsApp rule at entry; the deep-link round trip through `/auth`; realtime bindings on both tables; and the permission flag on nav + route.

**Issues found**: none blocking. Four non-blocking residuals (R1 `design.md` ACK entry, R2 grant/policy divergence, R3 dual COLAB-05 message, R4 inferred AVAIL-05 display half), and one external note (`.specs/STATE.md` was modified by another actor during this run).

**Next steps**: this is round 4 of a loop the user explicitly authorised beyond the 3-iteration bound. **PASS** — run `python3 <skill-dir>/scripts/validate_state.py collaborator-agenda` to confirm the report is real, then mark the feature done. The four residuals can be picked up as low-priority follow-ups or deliberately deferred; none warrants a round 5.
