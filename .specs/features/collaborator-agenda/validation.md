# Collaborator Agenda Validation — Round 3

**Date**: 2026-10-20
**Spec**: `.specs/features/collaborator-agenda/spec.md`
**Diff range**: `1716a95..HEAD` — 39 commits, HEAD = `6d74837` (enumerated with `git log --oneline 1716a95..HEAD`). Covers the original 18 tasks, the manager-cancel fix (`30d7c92`), the member-active guard (`5212a98`), fix round 1 (`a014ea3` … `6f981a1` + `d546638`), and fix round 2 (`2703d26`, `a95af09`, `e0a1460`, `bc262f0`, `6d74837`).
**Verifier**: independent round-3 sub-agent — author ≠ verifier, and distinct from both prior Verifiers. Every expected outcome below was re-derived from `spec.md` alone. No citation in the round-2 report was accepted without being re-resolved against the current tree; **roughly 20 of round 2's `file:line` citations do not land on the assertion they name** (they point at setup code, blank lines or an adjacent test), so every citation here was re-derived and re-read.

**Verdict**: ❌ **FAIL**

Legend: ✅ PASS = `file:line` evidence whose asserted value equals the spec-defined outcome · ⚠️ Spec-precision gap = the spec defines no precise outcome for that element · ❌ GAP = no evidence after searching, or an asserted outcome that contradicts/omits the spec outcome.

---

## Executive summary

Behaviourally the feature is in good shape and the two things round 2 called *blocking* are genuinely fixed:

- **Both gates are green**: `npm run test` **161 passed / exit 0**, `npm run test:db` **61 passed / exit 0** (was 59), `npm run build` **exit 0**.
- **All 53 ACs and all 10 edge cases carry spec-matching evidence**, re-derived and re-read by me — not inherited.
- **My own 8-mutation sensor killed 8 of 8**, including a direct re-injection of round 2's sole survivor (the `collaborator_availability` DELETE `USING` predicate). Round 2's Fix 1 *test* half is therefore genuinely closed.

The verdict is FAIL because **none of round 2's four gaps is fully closed**, and one of them is a source-of-truth integrity problem rather than a style nit:

1. **`AVAIL-12` does not exist in `spec.md`.** The brief states the orchestrator added it after round 2; it did not. `spec.md` still holds **53** ACs and **11** AVAIL rows at both `HEAD` and in the working tree (`git show HEAD:…spec.md | grep -c "^| AVAIL"` → `11`; working tree → `11`), and `AVAIL-12` appears nowhere except comments and a test title in `tests/db/schema-collaborator-agenda.test.ts`. So the new denial test asserts an outcome **the source of truth never states** — exactly the thing round 2's Fix 1 part (b) asked to fix ("add one sentence to `spec.md` naming the rule").
2. **Traceability is untouched.** `spec.md:231-283` still reads `Pending` for all 53 requirements and `spec.md:285` still reads "**Coverage:** 53 total, 0 mapped to tasks, 53 unmapped", while `tasks.md` names **49** of 53. `spec.md` has not been modified since `fc563a0`. Round 2's Fix 4 was not started.
3. **`design.md`'s fix never reached `HEAD`, and what is in the working tree is still partly wrong.** `git show HEAD:…design.md` still says `4 migrations: … 4 triggers, 4 SQL functions` and still describes a single `supabase/migrations/<ts>_collaborator_agenda.sql`. The corrected version exists **only as an uncommitted working-tree change**. Its totals (5/5/5/6) are now right, but the Components table credits `20261019120000` with `fn_collaborator_has_conflict` + the no-conflict/transition triggers (all three live in `20261019120100`) and credits `20261019120100` with `set_collaborator_appointments_updated_at` (it lives in `20261019120000`) — three of five rows mis-attributed. The ACK notification still has **no Data Model / Tech Decision entry** (round 2's Fix 2c).
4. **Lint**: 202 → **222** (+20), exit 1. Round 2's Fix 3 halved the debt (+29 → +20) but left the four `react-hooks/exhaustive-deps` warnings with **no documented reason** — the one class round 2 itself identified as a real defect (`x.data ?? []` gives the memo a fresh array every render).

The one item the brief asked about that **is** genuinely closed: the `SPEC_DEVIATION` re-point at `20261019120000:79` now cites **AD-001** (`.specs/STATE.md:5`) and **AD-006** (`.specs/STATE.md:45`) — both line numbers correct.

---

## Round-2 gap closure

| # | Round-2 gap | Fix commit(s) | Is the fix real and spec-conformant? | Result |
| - | ----------- | ------------- | ------------------------------------ | ------ |
| 1a | Availability DELETE policy had no denial-side test (mutant `USING (true)` survived 59/59) | `2703d26`, `a95af09` | `tests/db/schema-collaborator-agenda.test.ts:452-513` — the positive control at `:415-438` (`deleted.rowCount` `toBe(1)`), then three attempted denials as `COLLABORATOR_B`: targeted by id `:483` `expect(byId.rowCount).toBe(0)`, by owner `:489` `expect(byOwner.rowCount).toBe(0)`, and **unscoped** `:494` `expect(unscoped.rowCount).toBe(Number(ownedBefore.rows[0].count))`; then under the superuser `:502` foreign count unchanged and `:511-512` `expect(remaining.rowCount).toBe(1)` / `toEqual(targetRow)`. The unscoped statement is the correct sensor design — it is the only form that puts the DELETE policy's `USING` alone on the plan, and the test comment at `:441-450` states that reasoning explicitly. **My own M1 re-injection of round 2's mutant is now KILLED.** | ✅ Closed |
| 1b | Add a sentence to `spec.md` naming the delete-scoping rule | **none** | `spec.md` is unmodified since `fc563a0`. Edge cases (`:210-221`) still hold 10 items, none about delete scoping; the traceability table still ends at `AVAIL-11`. The rule therefore remains **unstated**, and the new test labels itself `AVAIL-12` against an AC id that does not exist. | ❌ **Not closed** |
| 1c | "Mirror it for `collaborator_appointments`" | n/a | Not applicable: `20261019120000` defines **no** `FOR DELETE` policy on `collaborator_appointments` (only SELECT/INSERT/UPDATE at `:116/:124/:133`), so there is no predicate to weaken and no mirror to write. | ✅ N/A |
| 2 | `design.md` counts 5/5/5 + Components section + ACK entry | uncommitted working-tree edit | Totals now `5 migrations: 3 tables, 5 triggers, 5 SQL functions, 6 RLS policies` (matches my independent count: 5 migrations, 5 `CREATE TRIGGER`, 5 function bodies, 6 `CREATE POLICY`). Components rewritten as a five-row table. **But**: (i) the change is **not committed** — `git show HEAD:…design.md` still reads `4/4/4` and the single-migration prose; (ii) three of five rows mis-attribute their objects (see above); (iii) the ACK notification has no Data Model or Tech Decision entry, only a Components row. | 🔶 **Partially closed** |
| 3 | 30 new lint problems | `6d74837` | 231 → **222**. `6d74837` replaced the `any`-cast Supabase builder doubles in three test files (its own message says nine problems). Remaining feature-area debt: **21** problems — 7 `react-refresh/only-export-components`, 10 `@typescript-eslint/no-explicit-any`, 4 `react-hooks/exhaustive-deps`. Reasons assessed below: the 17 `any`/`react-refresh` ones hold; the 4 `exhaustive-deps` ones do not (undocumented, and they mark a real defect). | 🔶 **Partially closed** |
| 4 | Stale traceability statuses | **none** | `spec.md:231-283` all `Pending`; `:285` still "53 total, 0 mapped to tasks, 53 unmapped". `tasks.md` in fact names 49 ACs (missing: `AVAIL-10`, `MGR-06`, `ACK-01`, `ACK-02`). Untouched. | ❌ **Not closed** |
| 5 | `SPEC_DEVIATION` re-point at `20261019120000:79` | `e0a1460` | The marker now reads `AD-001 (.specs/STATE.md:5)` and `AD-006 (.specs/STATE.md:45)`. I opened `.specs/STATE.md`: AD-001's header **is** line 5, AD-006's header **is** line 45, and both decisions say what the marker says they say (AD-001 = new tables + `has_workspace_access`; AD-006 = manager-side RLS must use `is_workspace_admin OR is_super_admin` on a table carrying per-collaborator rows). The old, false premise ("design.md's reuse table says…") is gone. Comment-only commit; no executable SQL changed. | ✅ **Closed** |

**Round-2 gaps: 1 genuinely closed (the SPEC_DEVIATION re-point), 1 closed on the test half only, 2 partially closed, 2 not started.**

---

## Task Completion

All 105 checkboxes in `tasks.md` are `- [x]`; 0 unchecked. Every named commit exists in `1716a95..HEAD`.

| Task group | Status | Notes |
| ---------- | ------ | ----- |
| T1–T3 Foundation (vitest harness, schedule primitives, DB harness) | ✅ Done | `bff5c7b`, `31fc6e2`, `c33390b` |
| T4–T8 Database, notify seam, view extraction | ✅ Done | `68e6a84`, `57b0280`, `4a63924`, `abad55c`, `e1f621e` |
| T9–T18 Core / Integration | ✅ Done | `211e11f` … `e6ad2e0` |
| Unplanned follow-ups | ✅ Done | `30d7c92` manager cancel, `5212a98` member guard |
| Fix round 1 | ✅ Done | `a014ea3`, `b042698`, `f0a5220`, `d8351ea`, `6cd345e`, `a29c172`, `c218da8`, `dfba97c`, `6f981a1`, `d546638` |
| Fix round 2 | 🔶 Partial | `2703d26`, `a95af09` (delete denial ✅), `e0a1460` (deviation re-point ✅), `bc262f0` (MGR-08 unscoped UPDATE ✅), `6d74837` (lint, partial 🔶). No commit touches `spec.md` or `design.md`. |
| Traceability hygiene | ❌ Not done | See gap 1 above. |

---

## Spec-Anchored Acceptance Criteria (53 — `spec.md` defines 54 only in the brief, not in the file)

### P1 — Collaborator declares unavailable time

| # | Criterion (WHEN/WHILE/IF THEN) | Spec-defined outcome | `file:line` + assertion expression | Result |
| - | ------------------------------ | -------------------- | ---------------------------------- | ------ |
| AVAIL-01 | submits 14:00–16:00 on 2026-11-05 | one row, both dates `2026-11-05`, `start_time` `14:00`, `end_time` `16:00` | `tests/db/schema-collaborator-agenda.test.ts:215` — `expect(inserted.rows[0]).toEqual({ start_date: '2026-11-05', end_date: '2026-11-05', start_time: '14:00', end_time: '16:00' })`; client payload `src/components/areapj/AvailabilityForm.test.tsx:167` — `expect(mutateAsync).toHaveBeenCalledWith({…})`; one insert call `src/hooks/useCollaboratorAvailability.test.tsx:175` — `expect(fromMock.callsFor('insert')[0]).toEqual([expected])` | ✅ PASS |
| AVAIL-02 | submits 2026-12-01→2026-12-31, no times | one row, both times `NULL`, both dates set | `schema-…:191` — `expect(inserted.rows[0]).toEqual({ start_date: '2026-12-01', end_date: '2026-12-31', start_time: null, end_time: null, workspace_id: WORKSPACE_A, member_user_id: COLLABORATOR_A })`; `AvailabilityForm.test.tsx:141` `buildAvailabilityInput` → `{ start_date:'2026-12-01', end_date:'2026-12-31', reason:null }`; mutation payload at `:212` | ✅ PASS |
| AVAIL-03 | submits 2026-11-10→2026-11-14, no times | a **single** row covering all five days inclusively | `AvailabilityForm.test.tsx:129` — `expect(buildAvailabilityInput({…})).toEqual({ start_date:'2026-11-10', end_date:'2026-11-14', reason:null })`; single insert call `useCollaboratorAvailability.test.tsx:175`; inclusive per-day expansion `src/components/agenda/CalendarEvent.test.ts:88` — `expect(events.map(e => e.date)).toEqual(['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14'])` + `:92` `expect(new Set(events.map(e => e.id)).size).toBe(5)` | ✅ PASS |
| AVAIL-04 | `start_date` later than `end_date` | reject, display `A data final deve ser igual ou posterior à data inicial.`, no DB write | `AvailabilityForm.test.tsx:43` — `expect(result.error?.issues[0].message).toBe(AVAIL_DATE_ORDER_ERROR)`; rendered + no write at `:199` `expect(screen.getAllByText(AVAIL_DATE_ORDER_ERROR).length).toBeGreaterThan(0)` and `:201` `expect(mutateAsync).not.toHaveBeenCalled()`; literal `AvailabilityForm.tsx:23` byte-equal to `spec.md:77` (verified by exact-string comparison); DB backstop `schema-…:137` — `{ code:'23514', constraint:'collaborator_availability_dates_check' }` | ✅ PASS |
| AVAIL-05 | time-bounded submission whose dates differ | reject, display `Horários só podem ser usados em um único dia.`, no DB write | `AvailabilityForm.test.tsx:55` — `expect(result.error?.issues[0].message).toBe(AVAIL_SINGLE_DAY_ERROR)` (`:54` `expect(result.success).toBe(false)`); literal `AvailabilityForm.tsx:24` byte-equal to `spec.md:78`; DB backstop `schema-…:159` — `{ code:'23514', constraint:'collaborator_availability_times_single_day_check' }`. **The display half is inferred, not rendered**: unlike AVAIL-04 (`:190-201`) and AVAIL-06 (`:176-187`) there is no dialog case for AVAIL-05, though the identical `formSchema → errorMessage → errorMessage` wiring is exercised by both siblings. | ✅ PASS (display half inferred) |
| AVAIL-06 | `start_time` ≥ `end_time` | reject, display `O horário final deve ser posterior ao inicial.`, no DB write | `AvailabilityForm.test.tsx:68` over `['16:00','14:00']` **and** `['16:00','16:00']` (`:59`) — `expect(result.error?.issues[0].message).toBe(AVAIL_TIME_ORDER_ERROR)`; rendered + no write at `:185` and `:187`; literal `AvailabilityForm.tsx` byte-equal to `spec.md:79`; DB `schema-…:170` — `{ code:'23514', constraint:'collaborator_availability_times_order_check' }` | ✅ PASS |
| AVAIL-07 | rows exist in period | each rendered as a distinct blocked block over affected days or hours | `src/pages/colaborador/ColaboratorAgendaPage.test.tsx:107` — `expect([...chips].some(c => c.textContent?.includes('Consulta médica'))).toBe(true)`; `:109` — `expect(screen.getAllByText('Consulta médica').length).toBeGreaterThanOrEqual(2)`; `CalendarEvent.test.ts:91` `expect(events.every(e => e.kind === 'unavailability')).toBe(true)` + `:92` 5 distinct ids; timed row `:106-108` (`start:'13:00'`, `end:'18:00'`); whole day `:113-114` (`'00:00'`–`'23:59'`) | ✅ PASS |
| AVAIL-08 | (ubiquitous) | `workspace_id` and `member_user_id` populated and non-null | `schema-…:191` — the same `toEqual` carries `workspace_id: WORKSPACE_A, member_user_id: COLLABORATOR_A`; insert payload `useCollaboratorAvailability.test.tsx:175` with fixture `:142-143` `workspace_id:'ws-1', member_user_id:'member-1'` | ✅ PASS |
| AVAIL-09 | collaborator deletes a row | row removed + calendar re-renders without a full reload | affordance `src/pages/colaborador/ColaboratorAgendaPage.tsx:237` — `onClick={() => removeAvailability.mutate(row.id)}`; `ColaboratorAgendaPage.test.tsx:121` `expect(deleteMutate).toHaveBeenCalledWith('av-1')` + `:129` `expect(screen.queryByText('Consulta médica')).not.toBeInTheDocument()`; hook `src/hooks/useCollaboratorAvailability.test.tsx:190-192` — `expect(fromMock.steps).toContain('delete')`, `expect(fromMock.callsFor('eq')[0]).toEqual(['id','av-1'])`, `expect(invalidate).toHaveBeenCalledWith({ queryKey:['collab-availability'] })`; DB authority `schema-…:415-438` — `expect(deleted.rowCount).toBe(1)` / `expect(remaining.rows[0].count).toBe('0')` | ✅ PASS |
| AVAIL-10 | unavailability overlaps a `pending`/`confirmed` appointment | save the unavailability **and** render a conflict badge on that appointment **in both views** | Save: `tests/db/behavior-collaborator-agenda.test.ts:265` `expect(inserted.rowCount).toBe(1)` + `:268-269` `expect((await readAppointment(pendingId)).status).toBe('pending')` / `.toBe('confirmed')`. Manager view: `src/pages/PJ/AgendaPage.test.tsx:324-325` `expect(overlapping!.className).toContain('ring-destructive')` + `expect(overlapping!.querySelector('svg')).toBeTruthy()`, with the negative control `:329-330` `expect(free!.className).not.toContain('ring-destructive')` / `.querySelector('svg')).toBeFalsy()`. Collaborator view: `ColaboratorAgendaPage.test.tsx:148-154` — the identical two-sided pair. | ✅ PASS |
| AVAIL-11 | (ubiquitous) | reject any submission where `member_user_id` ≠ authenticated user | `schema-…:394-410` — `expectFailure(INSERT …, { code:'42501', messageIncludes:'collaborator_availability' })` at `:397-404`, then `:410` `expect(persisted.rows[0].count).toBe('0')` | ✅ PASS |

### P1 — Manager views a collaborator's calendar and books without conflict

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| MGR-01 | opens `/pj/agenda` | selector lists **exactly** `is_active = true` AND `member_user_id IS NOT NULL` | `src/components/agenda/CollaboratorSelector.test.tsx:57` — `expect(collaboratorOptionsFromTeam(TEAM)).toEqual([{ id:'uid-maria', … }, { id:'uid-joao', … }])`; `:65` `expect(ids).not.toContain('uid-carlos')` (inactive but has account); `:70-71` `expect(ids).not.toContain('uid-debora')` / `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])`; rendered `:89-90` `expect(labels).not.toContain('Carlos Dias')` / `not.toContain('Débora Lima')` | ✅ PASS |
| MGR-02 | opens without changing selector | manager's own `time_blocks`, current behavior unchanged | `src/pages/PJ/AgendaPage.test.tsx:224` `expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument()` + `:226-227` `expect(calls.from('collaborator_appointments')).toHaveLength(0)` / `expect(calls.from('collaborator_availability')).toHaveLength(0)`; default selection `CollaboratorSelector.test.tsx:93` (`it('defaults to the manager's own calendar (MGR-02)')`) | ✅ PASS |
| MGR-03 | selects a collaborator | replace events with their appointments + unavailability; **not** the personal `time_blocks` | `AgendaPage.test.tsx:241` `expect((await screen.findAllByText('Visita técnica')).length).toBeGreaterThan(0)`; `:242` `expect(screen.queryByText('Meu bloco pessoal')).not.toBeInTheDocument()`; `:244` the `eq` args include `['member_user_id','uid-maria']` | ✅ PASS |
| MGR-04 | create overlapping unavailability | refuse, persist **nothing**, display `Este período está indisponível para {nome} de {início} a {fim}.` | DB authority `behavior-…:136` — `{ code:'23P01', messageIncludes:'Este período está indisponível para Colaborador C de ' }` and `:145` `expect(persisted.rows[0].count).toBe('0')`. Client `src/hooks/useCollaboratorAppointments.test.tsx:179` `expect(calls.of('insert')).toHaveLength(0)` with the exact sentence built at `:183` `expect(formatConflictMessage('Maria','01/12/2026','31/12/2026')).toBe('Este período está indisponível para Maria de 01/12/2026 a 31/12/2026.')`. Page `AgendaPage.test.tsx:361-362` `toHaveTextContent(expected)` + `expect(calls.inserts()).toHaveLength(0)` | ✅ PASS — **⚠️ Spec-precision gap #1**: `spec.md:101` does not say whether `{início}`/`{fim}` are the availability bounds or the proposed window. Flagged in code at `20261019120100_collaborator_agenda_behavior.sql:65-68` as `SPEC_PRECISION_GAP`; tests pin the availability-bounds reading, which is the one the sentence reads as. |
| MGR-05 | create with no overlap | one row, `status = 'pending'`, collaborator's `member_user_id`, manager's `workspace_id` | `schema-…:258-277` — `expect(inserted.rows[0]).toEqual({ status:'pending', member_user_id:COLLABORATOR_A, workspace_id:WORKSPACE_A, created_by:MANAGER_A, … })` at `:272`; `AgendaPage.test.tsx:389-398` insert payload `workspace_id:'ws-1', member_user_id:'uid-maria', created_by:MANAGER_ID, …` | ✅ PASS |
| MGR-06 | two managers create **overlapping** appointments concurrently | **both rows persisted**, no data loss | `behavior-…:206-224` — second `pg` `Client` bound to `MANAGER_D`, both INSERTs via `Promise.all` on `OVERLAP_DATE` (`10:00–11:00` and `10:30–11:30`); `:226-227` `expect(first.rows).toHaveLength(1)` / `expect(second.rows).toHaveLength(1)`; `:235` `expect(persisted.rows.map(row => row.created_by).sort())` equals `[MANAGER_A, MANAGER_D].sort()` | ✅ PASS |
| MGR-07 | collaborator has no `corporate_team.whatsapp` | **still create**, display `Colaborador sem WhatsApp cadastrado — notificação não enviada.` + manual resend | `src/components/agenda/AppointmentNotifier.test.tsx:108` `expect(await screen.findByText(NO_WHATSAPP_MESSAGE)).toBeInTheDocument()`, `:110` `data-status='no_whatsapp'`, `:111` resend button present; literal `AppointmentNotifier.tsx:25-26` byte-equal to `spec.md:104`; DB edge fn `supabase/functions/notify-appointment/notify-appointment.test.ts:374-381` — `expect(calls).toHaveLength(0)`, `notify_status='no_whatsapp'`, `expect(state.appointment?.status).toBe('pending')` | ✅ PASS |
| MGR-08 | (ubiquitous) | deny a manager **read or write** on any row whose `workspace_id` differs from their workspaces | Read `schema-…:290-291` — `expect(appointments.rows[0].count).toBe('0')` and `expect(availability.rows[0].count).toBe('0')`. Write/INSERT `:346` `expect(persisted.rows[0].count).toBe('0')` after `{ code:'42501', messageIncludes:'collaborator_appointments' }`. Write/UPDATE **filtered** `:369` `expect(updated.rowCount).toBe(0)` + `:376` title unchanged; **unscoped** (the discriminating form) `:384` `UPDATE … SET title = 'Reescrito'` with no WHERE, then `:391` `expect(afterUnscoped.rows[0].title).toBe(before.rows[0].title)` | ✅ PASS |
| MGR-09 | manager cancels or edits | change persisted **and no WhatsApp sent** | `behavior-…:375-377` `expect(row.status).toBe('cancelled')` / `decided_by` `toBe(MANAGER_A)` / `decided_at` `not.toBe(null)`; already-confirmed → `:396-397`; body edit `:476-488` with `status`/`decided_*` untouched. Page payload `AgendaPage.test.tsx:450-454` `{ status:'cancelled', decided_at:…, decided_by:MANAGER_ID }`. No-WhatsApp: `useCollaboratorAppointments.test.tsx:295` `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` over the whole hook file, plus `:282-284` `expect(payload).not.toHaveProperty('status'/'decided_at'/'decided_by')` | ✅ PASS |
| MGR-10 | selector on a collaborator | unavailability blocks visually distinct from appointment blocks | `AgendaPage.test.tsx:296-297` — `expect(unavailabilityStyle.background).toBeTruthy()` and `expect(unavailabilityStyle.background).not.toBe(appointmentStyle.background)` | ✅ PASS |
| MGR-11 | switches back to own calendar | personal view restored, no residual collaborator rows | `AgendaPage.test.tsx:258-259` — `expect(await screen.findByText('Meu bloco pessoal')).toBeInTheDocument()` and `expect(screen.queryByText('Visita técnica')).not.toBeInTheDocument()` | ✅ PASS |
| MGR-12 | observation given / not given | persist as `notes`; store `NULL` when absent | Given: `AgendaPage.test.tsx:389-398` — `expect(calls.inserts()[0].args[0]).toEqual({ …, notes: 'Levar o equipamento de teste', … })`. Absent: `:416` `expect((calls.inserts()[0].args[0] as Record<string, unknown>).notes).toBeNull()` | ✅ PASS |

### P1 — WhatsApp notification with deep link on creation

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| NOTIF-01 | appointment created | adapter invoked **exactly once** with `corporate_team.whatsapp`; message contains title, date, time range and the deep link | `AppointmentNotifier.test.tsx:83-84` — `expect(invokeMock).toHaveBeenCalledTimes(1)` / `expect(invokeMock).toHaveBeenCalledWith(NOTIFY_FUNCTION,{ body:{ appointment_id:'ap-1' } })`. Body `notify-appointment.test.ts:133-143` — `expect(calls).toHaveLength(1)`, `expect(body.number).toBe('5511999990001')` (the `corporate_team.whatsapp` read at `supabase/functions/notify-appointment/index.ts:75-83`), `expect(body.message).toContain('Reunião de alinhamento')` / `toContain('05/11/2026')` / `toContain('14:00–16:00')` / `toContain(DEEP_LINK)`. First-name-only `supabase/functions/_shared/collaborator-agenda.test.ts:32-38` — `toContain('Maria')` **and** `not.toContain('Maria Silva')` | ✅ PASS |
| NOTIF-02 | adapter fails or times out after 10 s | appointment kept `status='pending'`, failure recorded in `appointment_notification_log`, resend affordance surfaced | `notify-appointment.test.ts:173-179` — `notify_status='failed'`, `expect(state.appointment?.status).toBe('pending')`, `expect(state.attempts).toEqual([{ attempt:1, status:'failed', providerResponse: expect.stringContaining('agzap_500') }])`; timeout `:214-220`; resend `AppointmentNotifier.test.tsx:126` `expect(screen.getByRole('button',{ name:/Reenviar/ })).toBeInTheDocument()` | ✅ PASS (see AD-003 caveat below) |
| NOTIF-03 | resend requested | new row appended, previous attempt untouched | `notify-appointment.test.ts:297-306` — `expect(first.body.attempt).toBe(1)`, `expect(second.body.attempt).toBe(2)`, `expect(state.attempts[0]).toEqual({ attempt:1, status:'sent', providerResponse:null })`, `expect(state.attempts[1].attempt).toBe(2)` / `.status).toBe('failed')`. Client half `AppointmentNotifier.test.tsx:133-136` — both invocations carry only `{ appointment_id:'ap-1' }` | ✅ PASS |
| NOTIF-04 | adapter invoked twice in one attempt | at most one message, keyed on `appointment_id` + attempt | `notify-appointment.test.ts:265-269` — `expect(second.body.skipped).toBe('attempt already claimed')`, `expect(calls).toHaveLength(1)`, `expect(state.attempts).toHaveLength(1)`; DB uniqueness `schema-…:533-558` — second insert `{ code:'23505', constraint:'appointment_notification_log_appointment_id_attempt_key' }` and `expect(attempts.rows[0].count).toBe('1')` | ✅ PASS |
| NOTIF-05 | (ubiquitous) | UAZapi/agzap base URL, path and credential only in server-side config, never in a `VITE_` variable or client source | `notify-appointment.test.ts:396-399` — env withheld ⇒ `expect(calls).toHaveLength(0)` and `notify_status='failed'`; `:402-403` `expect(coreSource).not.toContain('VITE_')` / `expect(indexSource).not.toContain('VITE_')`; client `AppointmentNotifier.test.tsx:183` `expect(source).not.toMatch(/VITE_\|AGZAP\|agzap\.com\.br/)` | ✅ PASS |
| NOTIF-06 | send not complete within **10 seconds** | abort the attempt and record it as `timeout` | `notify-appointment.test.ts:226` — `expect(SEND_TIMEOUT_MS).toBe(10_000)`; `:223-248` with **no** injected `timeoutMs`, advancing exactly `SEND_TIMEOUT_MS` ⇒ `:247` `expect(result.body.notify_status).toBe('timeout')` and `:248` `expect(state.attempts).toEqual([{ attempt:1, status:'timeout', providerResponse:null }])`; injected path `:214-220`. **My sensor M5 (10_000 → 5_000) killed.** | ✅ PASS |
| NOTIF-07 | appointment edited or cancelled | no WhatsApp message | `notify-appointment.test.ts:413-414` — `expect(Object.keys(shared).sort()).toEqual(['SEND_TIMEOUT_MS','handleNotifyAppointment'])` and `expect(indexSource).toContain('req.method !== "POST"')` (entry point at `index.ts:38`); `useCollaboratorAppointments.test.tsx:295` — the edit/cancel hook source contains no `functions.invoke` / `notify-appointment` / `AGZAP` | ✅ PASS |
| NOTIF-08 | (ubiquitous) | one row per attempt with `appointment_id`, `attempt`, `status`, `provider_response`, `created_at` | `notify-appointment.test.ts:328-335` — `expect(state.logged).toEqual([{ appointmentId:'appointment-1', attempt:1, status:'failed', providerResponse: expect.stringContaining('agzap_503') }])`; `:343-344` one row per attempt sharing `'appointment-1'`; column names pinned in the entry point `:354-356` `.from("appointment_notification_log")` / `appointment_id: id` / `provider_response: providerResponse`. The real row shape, including `created_at`, is asserted against the real table `schema-…:592` — `expect(inserted.rows[0]).toEqual({ …, created_at: expect.any(Date) })`. **Honest AD-003 boundary stated in code at `notify-appointment.test.ts:348-353` and `schema-…:561`.** | ✅ PASS (boundary honest → scored as precision gap, not absence) |
| NOTIF-09 | non-empty `notes` | appended between the time range and the deep link | `_shared/collaborator-agenda.test.ts:52-57` — `expect(link).toBeGreaterThan(range)`, **`expect(link - range).toBe(2)`** (exactly one intervening line), `expect(lines[range+1]).toContain('Levar o contrato')` / `toContain('Observação')`; absent cases `:64` and `:71` — `expect(linkLine(lines) - rangeLine(lines)).toBe(1)` for `null` and for `''`/`'   '` | ✅ PASS |

### P1 — Collaborator confirms or cancels from their panel

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| COLAB-01 | follows the deep link | render appointments + unavailability with no login step when a session exists | `ColaboratorAgendaPage.test.tsx:99` — `expect(screen.queryByText('LOGIN-SCREEN')).not.toBeInTheDocument()`; route registration `CollaboratorAgendaRoute.test.tsx:125-130` — `expect(routeStart).toBeGreaterThan(-1)` and `expect(routeBlock).toContain('<CollaboratorRoute>')` / `'<CollaboratorAgendaRoute>'` / `'<ColaboratorAgendaPage />'` | ✅ PASS (session-keeping itself delegated to the pre-existing `CollaboratorRoute`, asserted structurally) |
| COLAB-02 | confirms a `pending` appointment | `status='confirmed'`, `decided_at` and `decided_by = auth.uid()` recorded | `behavior-…:286-288` — `expect(row.status).toBe('confirmed')`, `expect(row.decided_by).toBe(COLLABORATOR_C)`, `expect(row.decided_at).not.toBe(null)` (the UPDATE sends only `status`, so the DB fills the rest); hook `useCollaboratorAppointments.test.tsx:198` — `expect(calls.of('update')[0].args).toEqual([{ status:'confirmed', decided_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), decided_by:'member-1' }])` | ✅ PASS |
| COLAB-03 | cancels a `pending` appointment | `status='cancelled'`, `decided_at`, `decided_by = auth.uid()` | `behavior-…:301-303` same three assertions with `'cancelled'`; hook `useCollaboratorAppointments.test.tsx:214` — same `toEqual` shape with `'cancelled'` | ✅ PASS |
| COLAB-04 | action on `confirmed`/`cancelled` row | reject, persist nothing, display `Esta solicitação já foi respondida.` | `behavior-…:306-330` — `{ code:'P0001', messageIncludes:'Esta solicitação já foi respondida.' }` for both terminal states, then `:329-330` `expect(await readAppointment(confirmed)).toEqual(confirmedBefore)` / `cancelledBefore`; hook `useCollaboratorAppointments.test.tsx:233` `expect(calls.of('update')).toHaveLength(0)` with the throw asserted over `['confirmed','cancelled']` at `:222-231`; literal `useCollaboratorAppointments.ts:12` byte-equal to `spec.md:148` | ✅ PASS |
| COLAB-05 | action on a row whose `member_user_id` ≠ own | reject, persist nothing | hook `useCollaboratorAppointments.test.tsx:243` `rejects.toThrow('Sem permissão para responder este compromisso.')` + `:246` `expect(calls.of('update')).toHaveLength(0)`; DB `behavior-…:353` `{ code:'P0001', messageIncludes:'Colaborador não pode alterar' }` over six columns, then `:356` `expect(await readAppointment(id)).toEqual(before)` | ✅ PASS — **⚠️ Spec-precision gap #2**: `spec.md:149` names no message, and **two different invented strings exist** — client `useCollaboratorAppointments.ts:239` `'Sem permissão para responder este compromisso.'` vs DB `20261019120100:158` / `20261019130000:58` `'Colaborador não pode alterar os dados do compromisso (…)'`. Flagged in code at both `:157` and `:57` as `SPEC_PRECISION_GAP`. Which string the user sees depends on whether the pre-check or the trigger fires. |
| COLAB-06 | `pending` | render **both** confirm and cancel | `ColaboratorAgendaPage.test.tsx:164-165` — `expect(within(section).getByRole('button',{ name:/Confirmar/ })).toBeInTheDocument()` and `…/Cancelar…` both present | ✅ PASS |
| COLAB-07 | `confirmed` or `cancelled` | render **no** confirm/cancel action | `:173-174` (confirmed) and `:182-183` (cancelled) — `expect(screen.queryByRole('button',{ name:/Confirmar/ })).not.toBeInTheDocument()` and the same for `Cancelar` in **both** statuses | ✅ PASS |
| COLAB-08 | manager changes appointment while panel open | rendered status updates without a manual reload | `src/lib/realtime-query-config.test.tsx:114` `expect(new Set(entries.map(e => e.queryKey)).size).toBe(2)` (two independent caches) and `:120` `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)` after one `collaborator_appointments` event; negative control `:129` `expect(entries.some(entry => entry.state.isInvalidated)).toBe(false)` for an unrelated table | ✅ PASS (asserted at cache-invalidation level — the refetch the page consumes — not on a rendered status string) |
| COLAB-09 | (ubiquitous) | deny collaborator SELECT on any row with a different `member_user_id` | `schema-…:304-310` — `expect([...new Set(ownAppointments.rows.map(r => r.member_user_id))]).toEqual([COLLABORATOR_A])` and the same for availability `:307-310`; `:322-328` the same for `COLLABORATOR_B`, a `workspace_members` row with role `member` (the exact shape that would break `has_workspace_access`) | ✅ PASS |
| COLAB-10 | `collaborator_permissions.agenda` disabled | hide the agenda nav item **and** redirect `/colaborador/agenda` → `/colaborador` | `src/components/layout/AppSidebar.test.tsx:55-56` — `expect(screen.queryByRole('link',{ name:/Agenda/ })).not.toBeInTheDocument()` while `Meu Painel` stays; `MobileNav.test.tsx:47-48` same; redirect `CollaboratorAgendaRoute.test.tsx:87-88` — `expect(screen.getByText('COLABORADOR-PORTAL')).toBeInTheDocument()` / `expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument()` | ✅ PASS |
| COLAB-11 | collaborator without `member_user_id` | excluded from selector, portal and all appointment queries | `CollaboratorSelector.test.tsx:70-71` `expect(ids).not.toContain('uid-debora')` / `expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([])` and `:74-77` the same for `member_user_id: undefined` ("excludes null and undefined member_user_id alike"); queries keyed on `member_user_id` — `useCollaboratorAppointments.test.tsx:341` `expect(calls.of('eq')[0].args).toEqual(['member_user_id','member-1'])` | ✅ PASS — the "portal" half (`CollaboratorPortal.tsx`) is pre-existing and outside `1716a95..HEAD`; it is also vacuous, since a `member_user_id IS NULL` row has no account and therefore no portal session. |
| COLAB-12 | non-empty `notes` | render the observation alongside the appointment details | `ColaboratorAgendaPage.test.tsx:194-196` — `expect(within(section).getByText('Trazer o contrato assinado')).toBeInTheDocument()` with `:195-196` a `notes`-present and a `notes`-absent sibling both rendering | ✅ PASS |

### P2 — Realtime propagation

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| SYNC-01 | collaborator confirms | manager's open `/pj/agenda` reflects it without reload | `realtime-query-config.test.tsx:120` — `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)` across both parties' caches after one `collaborator_appointments` event (`:114` proves they are two queryKeys) | ✅ PASS |
| SYNC-02 | manager creates | collaborator's open `/colaborador/agenda` shows it without reload | `:72-86` builds one cache as `collab-self` and one as `manager-a`; `:114` `expect(new Set(entries.map(entry => entry.queryKey)).size).toBe(2)`; `:120` both invalidated; negative control `:129` | ✅ PASS |
| SYNC-03 | new table added to the realtime publication | `REPLICA IDENTITY FULL` via the idempotent `DO` block pattern of `20260617120000_realtime_react_query_tables.sql` | `schema-…:615` `expect(published.rowCount).toBe(2)`; `:616-621` filter `relreplident.toUpperCase() === 'F'` → `.toEqual(['collaborator_appointments','collaborator_availability'])`. The idempotent block itself is `20261019120000_collaborator_agenda_schema.sql:158-184` — `ALTER PUBLICATION … EXCEPTION WHEN duplicate_object`, looped over both tables | ✅ PASS |
| SYNC-04 | collaborator adds unavailability | manager's open view reflects it without reload | `realtime-query-config.test.tsx:140` — `expect(entries.every(entry => entry.state.isInvalidated)).toBe(true)`; binding asserted at `:99-100` | ✅ PASS |

### P2 — Permission flag gates the feature

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| PERM-01 | `agenda` false | omit agenda from sidebar **and** mobile nav | Off: `AppSidebar.test.tsx:55` / `MobileNav.test.tsx:47` — `expect(screen.queryByRole('link',{ name:/Agenda/ })).not.toBeInTheDocument()`. On: `AppSidebar.test.tsx:47-48` / `MobileNav.test.tsx:39-40` — `expect(link).toHaveAttribute('href','/colaborador/agenda')` | ✅ PASS |
| PERM-02 | `agenda` false, direct URL | redirect to `/colaborador` | `CollaboratorAgendaRoute.test.tsx:87-88` — `expect(screen.getByText('COLABORADOR-PORTAL')).toBeInTheDocument()` / `expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument()` after `setRows([{ feature_key:'agenda', enabled:false }])` at `:84` | ✅ PASS |
| PERM-03 | no flag row | apply the schema default and grant access | `CollaboratorAgendaRoute.test.tsx:91-96` — `setRows([])` at `:92`, then `:95` `expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument()` and `:96` `expect(screen.queryByText('COLABORADOR-PORTAL')).not.toBeInTheDocument()`, driven through the real `useCollaboratorPermissions` hook (`:71` `setRows([])` is the suite default) | ✅ PASS |

### P3 — Manager acknowledgement

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| ACK-01 | collaborator confirms/cancels | write an in-app notification to the creating manager | `tests/db/notification-collaborator-appointment-ack.test.ts:112-124` — `expect(rows).toHaveLength(1)`, `expect(row.user_id).toBe(MANAGER)`, `expect(row.workspace_id).toBe(WORKSPACE)`, `expect(row.type).toBe('agenda')`, `expect(row.link).toBe('/pj/agenda')`, `expect(row.read).toBe(false)`, `expect(row.created_at).not.toBe(null)`, `expect(row.title).toBe('Compromisso confirmado')`, `expect(String(row.message)).toContain('confirmou')` / `toContain('Reunião de alinhamento')` / `toContain('11/01/2027')`; cancel half `:133-143` (`'Compromisso cancelado'`, `'cancelou'`); negative controls `:146-163` — manager withdrawal `:153` and creator self-answer `:162` both write **nothing**. Trigger `20261019150000_collaborator_appointment_ack_notification.sql:23-46`. **My sensor M7 (drop `decided_by IS DISTINCT FROM created_by`) killed 3 cases.** | ✅ PASS |
| ACK-02 | collaborator confirms/cancels | **no** WhatsApp message | `useCollaboratorAppointments.test.tsx:295` — `expect(source).not.toMatch(/functions\.invoke\|notify-appointment\|AGZAP/i)` on `useCollaboratorAppointments.ts`, the file implementing `useRespondAppointment`; `notify-appointment.test.ts:413-414` — the only entry point is the POST-only `handleNotifyAppointment`, reachable only from creation (`index.ts:38`). The ACK trigger is pure SQL against `public.notifications` and cannot reach a provider. | ✅ PASS |

**Tally**: **53 ✅ · 0 🔶 Partial · 0 ❌ GAP.** Of the 53, **2 carry ⚠️ spec-precision gaps** (MGR-04, COLAB-05), **1** has an inferred display half (AVAIL-05), and **2** (NOTIF-02, NOTIF-08) sit behind the AD-003/Deno boundary with honest `SPEC_PRECISION_GAP` comments.

### The AD-003 / Deno boundary — scored as a precision gap, not an absence

`AD-003` (`.specs/STATE.md:21-27`) records that Deno is not installed, so `notify-appointment/index.ts` cannot execute locally. I checked the boundary is declared honestly rather than papered over:

- `supabase/functions/notify-appointment/notify-appointment.test.ts:348-353` — `// SPEC_PRECISION_GAP: Deno is not installed on this machine (AD-003), so index.ts's real INSERT/UPDATE never executes here…`
- `tests/db/schema-collaborator-agenda.test.ts:561` — same marker, pointing at the DB-side assertion that stands in for it.
- The substitute evidence is not vacuous: the column list is pinned against the **real entry-point source** (`:354-356`) and the **real table** produces the row shape `schema-…:592`.

**Scored ⚠️ precision gap, not ❌ absence** — as instructed.

---

## Edge Cases (`spec.md:210-221`)

| Edge case | `file:line` + assertion | Result |
| --------- | ----------------------- | ------ |
| No unavailability rows ⇒ fully bookable, no empty-state error | `ColaboratorAgendaPage.test.tsx:95-97` — `expect(screen.getByText('Nenhuma indisponibilidade declarada neste mês.')).toBeInTheDocument()` + `expect(screen.getByText('Seg')).toBeInTheDocument()` (the calendar itself renders) | ✅ |
| Collaborator with zero appointments and zero unavailability ⇒ empty calendar with an invitation, not an error | `AgendaPage.test.tsx:269-274` — `findByText(/Nenhum compromisso agendado/)`, `getByRole('button',{ name:/Novo compromisso/ })`, `getByText(/Sem indisponibilidade declarada/)`, `getByText('Seg')`, `expect(screen.queryByRole('alert')).not.toBeInTheDocument()` | ✅ |
| Collaborator deactivated between select and save ⇒ reject `Este colaborador não está mais ativo.` | `AgendaPage.test.tsx:430-431` — `expect(await screen.findByRole('alert')).toHaveTextContent('Este colaborador não está mais ativo.')` + `expect(calls.inserts()).toHaveLength(0)`; DB authority `tests/db/guard-collaborator-appointment-member.test.ts:127` `{ code:'P0001', messageIncludes: SPEC_MESSAGE }` (literal at `:31` byte-equal to spec) and `:133` persisted `'0'` | ✅ |
| Deep link opened unauthenticated ⇒ `/auth`, **then return to `/colaborador/agenda`** | `src/components/auth/CollaboratorRoute.tsx:30` — `<Navigate to="/auth" state={{ from: location }} replace />`; `src/pages/Auth.tsx:42-43` — `const from = (location.state as {from?:{pathname?:string}}\|null)?.from; return <Navigate to={from?.pathname ?? '/'} replace />`; test `CollaboratorRoute.test.tsx:73-75` `expect(screen.getByText('ORIGIN: /colaborador/agenda')).toBeInTheDocument()` and `:86-89` — after a session appears, `expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument()` with `queryByText('ROOT')` / `('COLABORADOR-PORTAL')` absent. **My sensor M4 (force `to="/"`) killed.** | ✅ |
| Deep link opened by a non-`collaborator` ⇒ redirect `/caixa` | `CollaboratorAgendaRoute.test.tsx:104` (manager) and `:112` (admin) — `expect(screen.getByText('CAIXA-PAGE')).toBeInTheDocument()` | ✅ |
| Unavailability spanning a month boundary ⇒ rendered across both months, inclusive | `CalendarEvent.test.ts:99` — `expect(events.map(e => e.date)).toEqual(['2026-11-30','2026-12-01','2026-12-02'])` | ✅ |
| Non-digit `corporate_team.whatsapp` ⇒ rejected at entry with `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.` | literal `TeamMemberForm.tsx:32-33`; `TeamMemberForm.test.tsx:30-33` `expect(WHATSAPP_DIGITS_ERROR).toBe('Informe o WhatsApp com DDI, DDD e número, apenas dígitos.')` + `expect(onSave).not.toHaveBeenCalled()`, rendered at `:29`; digits-only passes `:44-46`. **My sensor M3 (rule returns `null`) killed.** | ✅ |
| Touching endpoints ⇒ non-conflicting, save permitted | `behavior-…:186-187` — `expect(before.rows[0]).toEqual({ start_time:'06:00', end_time:'09:00' })` and `expect(after.rows[0]).toEqual({ start_time:'12:00', end_time:'13:00' })` against a `09:00–12:00` block; client mirror `CalendarEvent.test.ts:131-132` — `expect(availabilityConflictsWith(…, [timed])).toBe(false)` both ways. **My sensor M6 (`<` → `<=`) killed.** | ✅ |
| Adapter throws an unhandled exception ⇒ catch, log, appointment intact | `notify-appointment.test.ts:188-193` — `notify_status='failed'`, `expect(state.appointment?.status).toBe('pending')`, `expect(state.attempts).toEqual([{ attempt:1, status:'failed', providerResponse:'conexão recusada' }])` | ✅ |
| Manager's own calendar selected ⇒ never query `collaborator_appointments` | `AgendaPage.test.tsx:226-227` — `expect(calls.from('collaborator_appointments')).toHaveLength(0)` and the same for `collaborator_availability` | ✅ |

**Edge cases: 10/10.**

---

## Discrimination Sensor (round 3 — my own mutations)

Executed in an isolated scratch: `git worktree add --detach %TEMP%\sensor-r3-collab-agenda HEAD` (HEAD = `6d74837`) with a **directory junction** to the real `node_modules`. **The real worktree was never mutated; `git stash` was never used.**

Scratch baseline before any mutation: `npx vitest run` → **161 passed, exit 0**; `npx vitest run --config tests/db/vitest.config.ts` → **61 passed, exit 0** — reproducing the real gates exactly, so the scratch is faithful.

**Five of the eight mutations target code written by fix rounds 1 and 2**, which had never been independently mutated: M1 and M2 (fix round 2's `2703d26`/`a95af09`/`bc262f0` denial tests), M3 and M4 and M5 (fix round 1's `f0a5220`, `a014ea3`, `a29c172`), M7 (fix round 1's `6f981a1`).

| # | Mutation (behaviour-level fault) | File:line | Layer | Aimed at | Killed? |
| - | -------------------------------- | --------- | ----- | -------- | ------- |
| **M1** | Weakened policy: availability **DELETE** `USING (auth.uid() = member_user_id)` → `USING (true)` — a direct re-injection of round 2's surviving mutant M6 | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:114` | SQL RLS (**fix round 2**) | the new AVAIL-12 denial case | ✅ **Killed** — 1 failed / 60 passed, exit 1, in `tests/db/schema-collaborator-agenda.test.ts` |
| **M2** | Weakened policy: appointments **UPDATE** `USING (auth.uid() = member_user_id OR is_workspace_admin … OR is_super_admin …)` → `USING (true)` | `20261019120000:135-139` | SQL RLS (**fix round 2**) | `bc262f0`'s unscoped-UPDATE case | ✅ **Killed** — 1 failed / 60 passed, exit 1 (the unscoped `UPDATE … SET title = 'Reescrito'` now reaches the row and the transition guard raises) |
| **M3** | Gutted a required validation: `whatsappDigitsError` `return /^\d+$/.test(trimmed) ? null : WHATSAPP_DIGITS_ERROR;` → `return null;` | `src/components/areapj/TeamMemberForm.tsx:39` | TS validation (**fix round 1**) | the digits-only edge case | ✅ **Killed** — 1 failed / 1 passed, exit 1 |
| **M4** | Removed a required side effect: `<Navigate to={from?.pathname ?? '/'} />` → `<Navigate to="/" />` | `src/pages/Auth.tsx:43` | TS routing (**fix round 1**) | the deep-link return edge case | ✅ **Killed** — 1 failed / 1 passed, exit 1 |
| **M5** | Changed a spec-defined value: `SEND_TIMEOUT_MS = 10_000` → `5_000` | `supabase/functions/_shared/notify-appointment.ts:13` | TS edge fn (**fix round 1**) | NOTIF-06's "10 seconds" | ✅ **Killed** — 1 failed / 19 passed, exit 1 |
| **M6** | Off-by-one / boundary flip: strict overlap `p_start_time < av.end_time` → `<=` so touching endpoints become a conflict | `supabase/migrations/20261019120100_collaborator_agenda_behavior.sql:42` | SQL conflict fn | the touching-endpoints edge case + MGR-04 | ✅ **Killed** — 1 failed / 60 passed, exit 1 in `tests/db/behavior-collaborator-agenda.test.ts` |
| **M7** | Weakened a guard: dropped `AND NEW.decided_by IS DISTINCT FROM NEW.created_by` from the ACK trigger | `supabase/migrations/20261019150000_collaborator_appointment_ack_notification.sql:25` | SQL trigger (**fix round 1**) | ACK-01's two negative controls | ✅ **Killed** — **3 failed** / 58 passed, exit 1 |
| **M8** | Removed a required payload field: `notes: input.notes ?? null` → `notes: null` | `src/hooks/useCollaboratorAppointments.ts:130` | TS hook | MGR-12 | ✅ **Killed** — 2 failed / 24 passed, exit 1 across two suites |

**Sensor depth**: expanded (8 mutations across SQL RLS ×2 / SQL conflict fn / SQL trigger / TS validation / TS routing / TS edge-fn constant / TS hook payload; **5 of 8 on fix-round code**).

**Result**: **8 injected · 8 killed · 0 survived** → **PASS ✅**. Round 2's survivor is confirmed closed.

**Isolation check**: after `git worktree remove --force` + `git worktree prune`, `git status --porcelain` in the real tree is **byte-identical** to the pre-sensor baseline. `git worktree list` shows only the real tree (a second worktree used for the lint baseline at `1716a95` was likewise removed).

```
 M .specs/LESSONS.md
 M .specs/features/collaborator-agenda/design.md
 M .specs/features/collaborator-agenda/validation.md
 M .specs/lessons.json
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
```

> **Note for the orchestrator**: the brief's expected baseline (only the four `??` directories) does **not** match the tree. Four `.specs/` files were already modified **before** I started — the round-2 report, the fix worker's `design.md` edit, and two lessons entries. They are uncommitted work from previous rounds, not mine; my pre-sensor capture (above) includes them and my post-sensor capture is identical.

---

## Gate Check

| Gate | Command | Result | Exit code |
| ---- | ------- | ------ | --------- |
| Unit (prompted) | `npm run test` | **161 passed** (20 files), 0 failed, 0 skipped | **0** |
| Database (prompted) | `npm run test:db` | **61 passed** (5 files), 0 failed, 0 skipped | **0** |
| Build (from `tasks.md` Gate Check Commands) | `npm run build` | `dist/` emitted | **0** |
| Lint (from `tasks.md` Gate Check Commands) | `npm run lint` | **222 problems (172 errors, 50 warnings)** across 87 files | **1** |

- **Test count before the feature**: 0 — the repo shipped with no runner, no test files and no `test` script (`design.md` R2 / AD-004).
- **Test count after**: 161 + 61 = **222**; delta **+222** (round 1 recorded 199, round 2 recorded 220; fix round 2 added the AVAIL-12 pair and the MGR-08 unscoped case).
- **Skipped tests**: none in either gate.
- **Failures**: none in either prompted gate.

### Lint, measured honestly

I re-measured the baseline myself rather than trusting round 2: a throwaway worktree at `1716a95` with a junction to `node_modules`, `npx eslint . -f json` → **202 problems across 80 files**. Current: **222 across 87 files**. **Net +20.**

By rule, baseline → now:

| Rule | `1716a95` | now | Δ |
| ---- | --------- | --- | - |
| `@typescript-eslint/no-explicit-any` | 129 | 139 | **+10** |
| `react-refresh/only-export-components` | 15 | 21 | **+6** |
| `react-hooks/exhaustive-deps` | 23 | 27 | **+4** |
| `no-case-declarations` / `prefer-const` / others | 52 | 52 | 0 |

The feature's own remaining contribution is **21 problems across 11 files** (the other −1 comes from `AgendaPJ.tsx`, reduced by the view extraction). Assessing the reasons round 2 gave:

| Class | n | Do the reasons hold? |
| ----- | - | -------------------- |
| `no-explicit-any` | 10 | **Yes.** Each is a deliberate `'collaborator_appointments' as any` / `'fn_collaborator_has_conflict' as any`, and `useCollaboratorAppointments.ts:50` states the reason in code: *"The generated Supabase types predate this table."* The repo already carries 129 of them. Not a gate failure. |
| `react-refresh/only-export-components` | 7 | **Weakly, but acceptably.** Caused by exporting the spec-literal message constants (`AVAIL_*`, `WHATSAPP_DIGITS_ERROR`, `NO_WHATSAPP_MESSAGE`) from component files so tests can assert them byte-for-byte. Dev-HMR-only warning; 15 instances pre-exist. Hoisting them to a non-component module would clear all 7 in minutes — round 2's Fix 3 named it as the optional branch of "hoist **or accept**", so accepting is within what was asked. |
| `react-hooks/exhaustive-deps` | 4 | **No — this is the one where the reason does not hold.** `AgendaPage.tsx:116-117` and `ColaboratorAgendaPage.tsx:58-59` put `availability.data ?? []` / `appointments.data ?? []` directly in a `useMemo` dependency array, so each render produces a fresh array and the memo never stabilises. That is exactly what the lint message says, round 2 named it as a real defect rather than a style nit, **and no reason is documented anywhere in the tree.** No AC is affected and no behaviour is wrong — Minor, but it is an undocumented, genuine smell. |

**Lint verdict**: exit 1, but the gate was **never green** — it failed with 202 problems before the feature existed, so the feature did not flip it. Net +20 against a pre-existing red baseline, of which 17 have defensible reasons and **4 do not**. Minor; not attributable as a gate failure, but it is not "fully documented" either.

---

## Code Quality Check

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ⚠️ | Unchanged from rounds 1 and 2: `fn_assert_appointment_member_active` also refuses a `member_user_id` with **no** `corporate_team` row at all (`20261019140000:44-53`, tested at `guard-…:136-147`), whereas `spec.md:214` names only the *deactivated* case. Fail-closed, argued in-prose from MGR-05 and AD-008, but it is a rule `spec.md` does not state — and unlike MGR-04/COLAB-05 it carries **no** `SPEC_DEVIATION` or `SPEC_PRECISION_GAP` marker. |
| No unnecessary flexibility / abstractions | ✅ | `CalendarEvent`, `schedule.ts`, the message builder and `notify-appointment.ts` are each consumed by ≥2 callers. |
| Only touched files required | ✅ | 61 `.ts`/`.tsx` files in the range: harness, feature code, `.specs/`, and four pre-existing files the feature legitimately wraps (`CollaboratorRoute.tsx`, `Auth.tsx`, `TeamMemberForm.tsx`, `vite.config.ts`). No drive-by refactors found. |
| Didn't "improve" unrelated code | ✅ | `AgendaPJ.tsx` was reduced by the extraction and is covered by `AgendaPJ.test.tsx` (3 tests still pass). |
| Matches existing patterns | ✅ | Hooks mirror `useAgendaPJ.ts`; the ACK trigger follows `handle_video_briefing_notification()`; migrations keep the repo's `DO`-block and no-policy-log patterns. |
| Tests map to ACs and are non-shallow | ✅ | 53/53 ACs map 1:1 to assertions I re-read myself. Payload fields are asserted on **value or state**, not merely that a call happened (`toEqual` payloads, `created_at` `expect.any(Date)`, `link - range).toBe(2)` for the exact intervening line). |
| Spec-anchored outcome check | ⚠️ | Every asserted message, status, SQLSTATE and number was byte-compared to `spec.md`: **all 9 named literals exist verbatim in the source** (exact-string search across all tracked `.ts`/`.tsx`/`.sql`). 2 spec-precision gaps flagged in code (MGR-04, COLAB-05); AVAIL-05's display half inferred; AD-003 boundary honest. **But the `AVAIL-12` test asserts an outcome no AC defines** (see gap 2). |
| Per-layer coverage expectation | ✅ | Domain/DB logic 1:1 with ACs; routes/nav cover happy + edge + error for every route in scope; both pages cover happy + badge + empty + permission paths. |
| Every test maps to an AC / edge case / Done-when | ✅ (with one orphan label) | The 14 `tests/db/harness.test.ts` cases and `src/test/harness.test.tsx` map to T1/T2 Done-when; `views.test.tsx` to T8; `schedule.test.ts` to T3; `realtime-query-config.test.tsx:103-104` pins the pre-existing `time_blocks` binding (design R10). The one loose end is the **`AVAIL-12` label itself**: the test's behaviour is well-motivated by AD-001/AD-002, but there is no requirement ID in `spec.md` for it to map to. |
| Documented guidelines followed | ✅ | **none found** — the repo had no runner or guideline file before this feature; `tasks.md:18` records "Guidelines found: none - strong defaults applied". Strong defaults (co-located tests, exact-string assertions) were applied consistently. |

---

## SPEC_DEVIATION markers

Exactly **two** `SPEC_DEVIATION` markers exist (`grep -rn SPEC_DEVIATION supabase/ src/ tests/`).

| Marker | Location | Verdict |
| ------ | -------- | ------- |
| Manager-side RLS uses `is_workspace_admin(…) OR is_super_admin(…)` instead of `has_workspace_access(workspace_id)` | `supabase/migrations/20261019120000_collaborator_agenda_schema.sql:79-94` | **Justified against the spec, and now correctly attributed.** `spec.md:153` (COLAB-09) is absolute — "*any appointment or unavailability row whose `member_user_id` differs from their own id*" — while `has_workspace_access` is true for any `workspace_members` row and `create-collaborator` inserts collaborators there as `member`. `schema-…:304-328` proves the stricter predicate is what makes COLAB-09 hold. **The re-point required by round 2 is genuinely done**: the marker now names `AD-001 (.specs/STATE.md:5)` and `AD-006 (.specs/STATE.md:45)`; I opened the file and both line numbers are the correct AD headers. The false "design.md's reuse table says…" premise is gone. |
| `20261019130000` supersedes the manager branch of `20261019120100` | `supabase/migrations/20261019130000_collaborator_appointment_manager_cancel.sql:4-22` | **Justified, and it correctly puts the spec above the design.** `20261019120100` had blocked the manager from `status` entirely, contradicting MGR-09 ("WHEN the manager cancels **or edits** an appointment THEN the system SHALL persist the change") and the user-confirmed assumption. `design.md:337` and `STATE.md` AD-007 were both updated to match, and `behavior-…:363-489` pins the corrected contract. |

**Remaining `SPEC_PRECISION_GAP` markers** (all honest): `20261019120100:65` (MGR-04 placeholder ambiguity), `20261019120100:157` + `20261019130000:57` (COLAB-05 has no spec message), `notify-appointment.test.ts:348` + `schema-…:561` (AD-003 Deno boundary), `src/components/agenda/CalendarEvent.ts:70` (the spec does not say which `start`/`end` a whole-day row takes — `00:00`–`23:59` is stated as the literal reading).

**The one implementation that exceeds `spec.md` still carries no marker**: `20261019140000:44-53`'s "no `corporate_team` row at all" rule is argued in prose (`:1-35`) but is neither a `SPEC_DEVIATION` nor a `SPEC_PRECISION_GAP`, although it is the clearest case of both.

---

## design.md vs the migrations

### At `HEAD` (`6d74837`) — what the diff range actually contains

| design.md claim | Reality | Holds? |
| --------------- | ------- | ------ |
| `design.md:71` — "4 migrations: 3 tables, 4 triggers, 4 SQL functions, 6 RLS policies" | **5 migrations, 5 triggers, 5 SQL functions, 6 policies** | ❌ **Stale at HEAD** |
| `design.md:82-87` — a single `supabase/migrations/<ts>_collaborator_agenda.sql` creating everything | five migrations | ❌ **Stale at HEAD** |
| ACK notification anywhere in the design | `20261019150000` writes to `public.notifications` | ❌ **Absent at HEAD** |

### In the working tree (uncommitted)

| design.md claim | Reality | Holds? |
| --------------- | ------- | ------ |
| `:71` — "5 migrations: 3 tables, 5 triggers, 5 SQL functions, 6 RLS policies, realtime publication" | I counted independently: 5 `202610191*.sql` files; 5 `CREATE TRIGGER` (`set_collaborator_appointments_updated_at`, `assert_appointment_no_conflict`, `assert_appointment_transition`, `assert_appointment_member_active`, `collaborator_appointment_ack_notification`); 5 function bodies (`fn_collaborator_has_conflict`, `fn_assert_appointment_no_conflict`, `fn_assert_appointment_transition`, `fn_assert_appointment_member_active`, `collaborator_appointment_ack_notification`); 6 `CREATE POLICY`; 3 tables | ✅ Totals correct |
| Components table, row 1 — `20261019120000` "owns `fn_collaborator_has_conflict`, the no-conflict and transition triggers" | all three live in `20261019120100` (`:16`, `:113`, `:197`) | ❌ **Mis-attributed** |
| Components table, row 2 — `20261019120100` "owns … `set_collaborator_appointments_updated_at`" | that trigger is at `20261019120000:55` | ❌ **Mis-attributed** |
| Components table, rows 3-5 (`…130000`, `…140000`, `…150000`) | match the files | ✅ |
| "Total: 5 migrations, 5 SQL functions, 5 triggers, 6 RLS policies" | matches | ✅ |
| ACK has a Data Model / Tech Decision entry | only a Components row + a `Reuses` line | ❌ **Missing** (round 2's Fix 2c) |
| Availability CHECK list (`:198-205`) | exact match, four named constraints at `20261019120000:20-27` | ✅ |
| `fn_collaborator_has_conflict` is `SECURITY INVOKER`, `STABLE`, overlap `a.start < b.end AND a.end > b.start` (`:246-251`) | `20261019120100:16-47`; asserted `prosecdef:false, provolatile:'s'` at `behavior-…:124`; **my sensor M6 proves the strict comparison is load-bearing** | ✅ |
| Transition guard contract (`:253-258`, Tech Decisions `:337`) | `20261019130000:44-107` implements exactly that | ✅ |
| `assert_appointment_member_active` refuses an inactive/absent team row (`:274`) | `20261019140000:44-53`, `SECURITY DEFINER`, `SET search_path`, INSERT-only | ✅ |
| `appointment_notification_log`: RLS on, zero policies, `UNIQUE(appointment_id, attempt)` (`:234-244`) | `20261019120000:61-73,139`; asserted `relrowsecurity=true` and policy count `'0'` at `schema-…:524-530` | ✅ |
| `verify_jwt` stays default (`:115`, R9) | asserted `notify-appointment.test.ts:443-444` | ✅ |
| Edge-function deps (`:113`) | `index.ts:52-54,129` + `AGZAP_URL` (design omits `AGZAP_URL` — minor) | ✅ |

**Conclusion**: the working-tree `design.md` fixes the **totals**, which was the headline of round 2's Fix 2 — but the correction is **not committed**, three of five Components rows name the wrong file, and the ACK mechanism still has no Data Model or Tech Decision entry. Round-2 Fix 2 is **partially closed**.

---

## The `collaborator_availability` UPDATE-policy question

**Facts I verified myself:**

- `20261019120000` defines exactly three policies on `collaborator_availability` — SELECT (`:100`), INSERT (`:108`), DELETE (`:112`). **No `FOR UPDATE` policy exists.**
- `:151` nonetheless does `GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborator_availability TO authenticated;`
- With RLS enabled and no UPDATE policy, every `UPDATE` by `authenticated` matches zero rows — so a collaborator cannot update **their own** row either, and the operation silently affects nothing.
- No client code ever updates availability: `grep -rn "UPDATE public.collaborator_availability\|collaborator_availability SET\|useUpdateAvailability" src/ tests/ supabase/` → **no hits**. No test references it either.

**Judgment: defensible omission.**

Reasons, weighed against `spec.md`:

1. **The spec states no update rule for availability — anywhere.** AVAIL-01…11 cover create (01-03), validate (04-06), render (07), schema (08), **delete** (09), reverse-conflict (10) and INSERT scoping (11). There is no "WHEN the collaborator edits an existing unavailability THEN …", no such edge case, and no such Out-of-Scope row. The user story (`spec.md:68`) asks to "**mark** the periods I am not available" and the confirmed granularity decision (`:40`) describes creation only.
2. **`validate.md` forbids exactly the test the worker proposed.** Its rule is: where the spec defines a precise outcome the assertion must target it; where it does not, mark a **⚠️ Spec-precision gap** and "Do NOT silently pass a vague assertion." A test asserting "a collaborator cannot update another's row" encodes an outcome `spec.md` never defines. Writing it would be adding a requirement, not verifying one.
3. **It would not discriminate anything today.** As the worker found, it fails only if someone later adds a permissive UPDATE policy — i.e. it is a **regression guard against a hypothetical future migration**, not evidence about this feature. That is speculative work outside the diff's scope, which is what scope creep means here. **Withholding it was the correct call**, and the orchestrator's failure to rule on it should be read as concurrence by default rather than an open question.
4. **Nothing is broken by the omission.** Delete + re-create is a complete editing path under AVAIL-09, and the failure mode of the missing policy is fail-closed (0 rows), never a leak.

**Two caveats worth recording, neither of which changes the verdict:**

- **A documentation nit, not a spec gap**: `20261019120000:151` advertises `UPDATE` on a table where RLS then silently refuses it. The grant and the policy disagree. A one-line comment (or dropping `UPDATE` from the grant) would stop the next reader from wiring an edit UI that never lands.
- **If editing availability is ever wanted, it becomes a spec change first** — a new AC with a defined outcome, then a `WITH CHECK` policy, then the test. Not the other way round.

So: **defensible omission** — not a genuine spec gap (no AC is unmet), and not scope creep (the withheld test would have been the scope creep).

---

## Findings / Fix Plans

### Fix 1 — `AVAIL-12` has no source-of-truth entry in `spec.md` (blocking)
- **Root cause**: round 2's Fix 1 was split into (a) write the test and (b) add the sentence to `spec.md`. Only (a) landed (`2703d26`, `a95af09`); the brief's premise that "the orchestrator added AVAIL-12 after round 2" is **not reflected in the file** — `spec.md` still has 53 ACs, 11 AVAIL rows, at `HEAD` and in the working tree, and `AVAIL-12` appears nowhere but `tests/db/schema-collaborator-agenda.test.ts:18,413,441,452`.
- **Evidence**: `grep -c "^| AVAIL" spec.md` → 11 (both HEAD and worktree); `grep -rn "AVAIL-12"` → only the test file; `spec.md:210-221` edge cases hold 10 items, none about delete scoping.
- **Why it matters**: an AC id in the test suite with no requirement behind it breaks traceability — evidence cannot be traced to a criterion that does not exist, and `validate.md`'s evidence-or-zero rule has nothing to anchor to.
- **Fix task**: add one AC or one edge case to `spec.md` naming the rule (e.g. `IF a collaborator attempts to delete an unavailability row whose member_user_id differs from their own id, THEN the system SHALL remove nothing.`), add the corresponding `AVAIL-12` row to the traceability table, and re-check that the assertions in `schema-…:452-513` match the wording.
- **Priority**: **Major** (source-of-truth integrity; blocks the traceability gate)

### Fix 2 — Traceability table and Coverage line are untouched (blocking)
- **Root cause**: round 2's Fix 4 was never executed.
- **Evidence**: `spec.md:231-283` — all 53 rows `Pending`; `spec.md:285` — "**Coverage:** 53 total, 0 mapped to tasks, 53 unmapped". `tasks.md` names 49 ACs (missing `AVAIL-10`, `MGR-06`, `ACK-01`, `ACK-02`); `spec.md` has not been modified since `fc563a0`.
- **Fix task**: set the Status column from this report's per-AC table (all 53 → ✅ Verified, with the ⚠️ notes on MGR-04/COLAB-05/AVAIL-05), correct the Coverage line to `54 total, 49 mapped to tasks, 5 unmapped (AVAIL-10, MGR-06, ACK-01, ACK-02 shipped as unplanned fix-round work, AVAIL-12 added at validation)`, and add the `AVAIL-12` row.
- **Priority**: **Major** (the traceability gate is the skill's mechanism for proving requirements were tracked)

### Fix 3 — `design.md` correction is uncommitted and still partly wrong (Cosmetic)
- **Evidence**: `git show HEAD:…design.md:71` → `4 migrations: … 4 triggers, 4 SQL functions`. Working tree → `5/5/5` ✅. Components table rows 1 and 2 mis-assign `fn_collaborator_has_conflict`, the no-conflict trigger, the transition trigger and `set_collaborator_appointments_updated_at` between `20261019120000` and `20261019120100`. No Data Model / Tech Decision entry for the ACK notification.
- **Fix task**: commit the working-tree `design.md`; move the three mis-attributed objects to `20261019120100` and `set_collaborator_appointments_updated_at` to `20261019120000`; add a Data Model row (or Tech Decision) for `public.notifications` via `SECURITY DEFINER` `AFTER UPDATE` with the `decided_by <> created_by` guard and the `/pj/agenda` link.
- **Priority**: Cosmetic — but it is round-1 Fix 9 + round-2 Fix 2 still not landing, for the third round.

### Fix 4 — Four undocumented `react-hooks/exhaustive-deps` warnings (Minor)
- **Evidence**: `AgendaPage.tsx:116-117`, `ColaboratorAgendaPage.tsx:58-59` — `availability.data ?? []` / `appointments.data ?? []` inside a `useMemo` dependency array. No reason is documented in the tree for these four; the other 17 of the feature's 21 do have defensible reasons (in-code `// The generated Supabase types predate this table.` for the 10 `any`; dev-only + 15 pre-existing for the 7 `react-refresh`).
- **Fix task**: hoist `availabilityRows`/`appointmentRows` into a stable reference (e.g. `const rows = data ?? EMPTY;` where `EMPTY` is a module constant), or document why the recomputation is intended.
- **Priority**: Minor (lint was already red at `1716a95`; no AC affected)

### Not a fix task, but a reporting note
Roughly **20 of the round-2 report's `file:line` citations do not land on the assertion they name** — e.g. `schema-…:199` (claimed AVAIL-01's `toEqual`) is actually `});`; `schema-…:121` (claimed the AVAIL-04 CHECK) is inside `afterAll`; `useCollaboratorAvailability.test.tsx:183-185` (claimed the AVAIL-09 delete assertions) is `QueryClient` setup; `CollaboratorAgendaRoute.test.tsx:85-89` (claimed PERM-03 granting access) actually asserts the **opposite** polarity (that the flag-off case shows the portal). The underlying assertions all exist at nearby lines and every AC is genuinely covered — but the round-2 report should not be reused as a citation source without re-resolution.

---

## Requirement Traceability Update

**Not applied** — the Verifier is read-only over the working tree and writes only this file. The orchestrator should update `spec.md:231-283` from `Pending` using the table below.

| Requirement group | New status |
| ----------------- | ---------- |
| AVAIL-01 … AVAIL-11 | ✅ Verified |
| AVAIL-12 | ⚠️ **No such AC in `spec.md`** — add the requirement, then verify (Fix 1) |
| MGR-01 … MGR-12 | ✅ Verified (MGR-04 carries ⚠️ spec-precision gap) |
| NOTIF-01 … NOTIF-09 | ✅ Verified (NOTIF-02 / NOTIF-08 real log write behind the AD-003 Deno boundary — precision gap, boundary assertions honest) |
| COLAB-01 … COLAB-12 | ✅ Verified (COLAB-05 carries ⚠️ spec-precision gap; AVAIL-05's display half inferred) |
| SYNC-01 … SYNC-04 | ✅ Verified |
| PERM-01 … PERM-03 | ✅ Verified |
| ACK-01, ACK-02 | ✅ Verified |

---

## Summary

**Overall**: ❌ **Not ready** — **FAIL**

**Spec-anchored check**: **53/53 ACs** matched the spec-defined outcome · **0** uncovered · **0** partial · **10/10** edge cases. **2** spec-precision gaps flagged in code (MGR-04 placeholder ambiguity, COLAB-05's missing message — which also has two *different* invented strings), **1** inferred display half (AVAIL-05), **1** honest AD-003/Deno boundary (NOTIF-02/NOTIF-08), plus the known `CalendarEvent.ts:70` whole-day start/end gap. The brief's **54th AC (`AVAIL-12`) does not exist in `spec.md`** — the spec has 53.
**Gate**: `npm run test` **161 passed / exit 0**; `npm run test:db` **61 passed / exit 0**; `npm run build` **exit 0**; `npm run lint` **222 problems / exit 1** (baseline re-measured by me at `1716a95` = **202 / 80 files**; net **+20**; 17 of the feature's 21 remaining problems have defensible reasons, 4 do not).
**Round-2 gaps**: **1 genuinely closed** (the `SPEC_DEVIATION` re-point), **1 closed on the test half only** (the delete denial — the matching `spec.md` sentence was never added), **2 partially closed** (`design.md` uncommitted + mis-attributed + no ACK entry; lint 29 → 20), **1 not started** (traceability).
**Sensor**: **8 mutations injected, 8 killed, 0 survived** — including a direct re-injection of round 2's survivor (availability DELETE `USING (true)`) and **5 mutations on code written in fix rounds 1 and 2**.

**What works**: all five availability granularities and all three AVAIL messages (client zod + DB CHECK, byte-exact spec literals), the delete affordance with its cache invalidation **and** a denial test that now discriminates the RLS predicate, the conflict hard block with the exact spec sentence and nothing persisted, the reverse-conflict badge in both views with a negative control, two overlapping concurrent appointments both persisting, cross-workspace and cross-collaborator RLS on read **and** write including the unscoped statements, the appointment state machine in both directions, the notification lifecycle (exactly-once, attempt history, dedup, the pinned 10-second default, failure/timeout/no-whatsapp verdicts, deep link + observation placement, the full five-column log row), the in-app ACK to the creating manager with its three negative cases, the digits-only WhatsApp rule at entry, the deep-link round trip through `/auth`, realtime bindings on both tables, and the permission flag on nav + route.

**Issues found**: `AVAIL-12` has no `spec.md` entry; traceability untouched; `design.md` fix uncommitted and still mis-attributed; 4 lint warnings with no documented reason; 1 unmarked implementation that exceeds the spec (`20261019140000`'s "no team row at all" rule); ~20 drifted citations in the round-2 report.

**Next steps**: this was **round 3 of a maximum of 3** fix→re-verify iterations. Per `validate.md` §8, the loop is exhausted — **escalate to the user** rather than dispatching a fourth fix round. The four findings are documentation-only and small (one `spec.md` AC, one Coverage line, one `design.md` commit with three corrected rows, one memo fix); no behavioural change is required.
