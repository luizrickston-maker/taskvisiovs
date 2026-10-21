# Collaborator Agenda Specification

## Problem Statement

The manager has no visibility into when a collaborator can actually work, and no way to place an appointment on a collaborator's calendar. Scheduling today is done out-of-band (conversation, WhatsApp) with no record, no confirmation, and no protection against booking someone who is off. The collaborator's availability is invisible, so the manager discovers the conflict only after the fact.

This feature gives the collaborator a way to declare unavailable time at whatever granularity they need, gives the manager a view of that calendar with a hard block against booking unavailable time, and closes the loop with a WhatsApp notification that the collaborator confirms or declines from inside their own panel.

## Goals

- [ ] A collaborator can declare unavailable time as a specific hour range, half day, full day, a multi-day range, or a whole month, and the manager cannot create an appointment overlapping any of it.
- [ ] A manager can select an active collaborator inside `/pj/agenda`, see that collaborator's calendar, and create an appointment that reaches the collaborator by WhatsApp with a deep link to their panel.
- [ ] A collaborator can confirm or cancel a pending appointment from `/colaborador/agenda`, and both parties see the resulting status without a page reload.
- [ ] Zero cross-workspace or cross-user data leakage: a collaborator reads only their own rows, a manager reads only their own workspace's rows.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Collaborators registered without an email/password account | User decision: only collaborators with a full account (`member_user_id` set) participate. `member_user_id IS NULL` rows are filtered out of the feature entirely. |
| WhatsApp notification on appointment edit or cancellation | User decision: notification is sent "somente quando eu marcar" (creation only). Edit/cancel propagate in-app only. |
| Manager notification when a collaborator confirms/cancels | Not requested. Logged as an assumption with a default, deferred to P3. |
| Email / push / SMS channels | The only requested channel is WhatsApp. |
| Shared or team-wide calendars beyond one collaborator at a time | User asked for a per-collaborator selector, not a merged multi-collaborator grid. |
| Modifying the existing personal `time_blocks` agenda semantics | The personal PJ agenda stays personal. This feature reads and writes new tables only. |
| Availability recurrence rules (e.g. "every Monday") | User specified ranges and day sets, not recurring patterns. A month range and repeated single days cover the stated need. |
| Backfill or migration of existing `time_blocks` data | No existing data belongs to collaborators; nothing to migrate. |
| Migration from agzap to the user's own UAZapi instance | User decision 4: keep the working integration for now. The provider sits behind one adapter function, so the later swap is isolated and does not touch feature code. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Availability model granularity | One table with `start_date`, `end_date`, nullable `start_time`/`end_time`. Times may be set only when `start_date = end_date`. | Covers all five requested granularities (hour range, half day, full day, multi-day range, month) in a single row shape without a special-case "month" type. | n — inferred from answer 1, awaiting spec approval |
| Collaborator marks availability over an appointment that already exists | The availability saves successfully; the overlapping appointment is rendered with a conflict badge in both views. No stored status is added — the conflict is computed at read time. | Blocking the collaborator from taking time off because the manager booked first would invert the purpose of the feature. User confirmed 2026-10-19. | y |
| Manager can edit or cancel a created appointment | Manager can edit and cancel. Neither sends a WhatsApp. | A mistyped appointment must be fixable; the user confirmed the no-extra-notification rule on 2026-10-19 ("para nao gerar notificacoes desnecessarias"). | y |
| Collaborator re-notification after manager edits/cancels | In-app only (realtime refresh of the panel). | Follows directly from the confirmed edit/cancel decision — no extra notifications. | y |
| Appointment carries a free-text observation | `notes text` on `collaborator_appointments`, optional, written by the manager at creation or edit, rendered in the collaborator's panel, and appended to the WhatsApp message when non-empty. | User asked on 2026-10-19 for an observation to travel with the notification. | y |
| Message body of the WhatsApp notification | Portuguese text containing collaborator first name, appointment title, date in `dd/MM/yyyy`, time range `HH:MM–HH:MM`, the observation when present, and a deep link to `https://taskvisiovs.vercel.app/colaborador/agenda`. | User approved the copy on 2026-10-19 ("ta perfeito assim"). | y |
| WhatsApp provider | Keep the existing agzap integration — `POST https://app.agzap.com.br/send` with body `{ token, number, type: "text", message }` — behind a single `sendWhatsAppText(number, text)` adapter. Migration to the user's own UAZapi instance is deferred. | User decision 4 on 2026-10-19: keep what already generates notifications today and change later. The adapter seam means swapping providers afterwards is a one-file change. The contract is already implemented in six existing edge functions, so it needs no guessing. | y |
| Notification failure handling | Appointment is created and persisted regardless; it is marked "notificação não enviada" and the manager gets a manual "Reenviar" action. | External-dependency failure must never roll back a successful calendar write, or the manager loses their own scheduling action to a WhatsApp outage. | n |
| Appointment status vocabulary | `pending` → `confirmed` \| `cancelled`. Manager may additionally set `cancelled` by cancelling. | Three states cover the described loop; a fourth (`rejected` vs `cancelled`) would be a distinction the user did not draw. | n |
| Permission key `agenda` in `collaborator_permissions` | The existing `agenda` key gates the collaborator's access to `/colaborador/agenda`. Off ⇒ the nav item is hidden and the route redirects to `/colaborador`. | The key already exists in the schema and is currently a dead switch; wiring it is cheaper than inventing a second mechanism. | n |
| Timezone | All availability and appointment times are interpreted in `America/Sao_Paulo`, matching the hard-coded TZ already used by the edge functions. | `time_blocks` stores naive `date` + `HH:MM`; this feature follows the same convention rather than introducing `timestamptz`. | n |
| Date construction | Every date-only value is constructed as `YYYY-MM-DDT12:00:00` client-side, never `new Date(dateString)`. | The codebase already does this at `CollaboratorPortal.tsx:604` and already gets it wrong at `:251` (off-by-one in UTC-3). New code must not copy the bug. | n |
| Collaborators without a full account | Filtered out of the collaborator selector and the portal entirely. | User decision 4. | **y** |
| Conflict is a hard block for the manager | Save is rejected with a visible error naming the conflicting availability range. | User decision 2: "nao pode ser possivel". | **y** |
| WhatsApp is sent only on creation | Exactly one message per created appointment. | User decision 3: "somente quando eu marcar". | **y** |
| Manager selects a collaborator in `/pj/agenda` to view their calendar | Dropdown of active collaborators (`is_active = true`, `member_user_id IS NOT NULL`) in the agenda page header; default selection = the manager's own calendar (current behavior). | User decision 5. Keeps today's personal agenda as the default so nothing changes until the manager opts in. | **y** |
| Collaborator's own agenda route | New route `/colaborador/agenda`, reachable from the sidebar nav and from the WhatsApp deep link. | User decision 3 requires a link into "a agenda dele do painel dele". | **y** |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

All four items that were previously open were resolved by the user on 2026-10-19: reverse-conflict rule (allow, badge the appointment), manager edit/cancel without notification, message copy approved, and the WhatsApp provider stays agzap for now. No unresolved decision remains — the spec is closed and ready for design.

---

## User Stories

### P1: Collaborator declares unavailable time ⭐ MVP

**User Story**: As a collaborator, I want to mark the periods I am not available to work — a specific hour, half a day, a full day, a run of consecutive days, or an entire month — so that my manager does not book me when I cannot work.

**Why P1**: Without declared availability the hard-block requirement has nothing to check against, and the whole feature reduces to a calendar the manager already cannot see.

**Acceptance Criteria**:

1. WHEN the collaborator opens `/colaborador/agenda` and submits an unavailability covering 14:00–16:00 on 2026-11-05 THEN the system SHALL persist one row with `start_date` and `end_date` equal to `2026-11-05`, `start_time` `14:00`, and `end_time` `16:00`. <!-- event-driven -->
2. WHEN the collaborator submits an unavailability from 2026-12-01 to 2026-12-31 with no time bounds THEN the system SHALL persist one row with both times `NULL` and both dates set, representing the full month. <!-- event-driven -->
3. WHEN the collaborator submits an unavailability spanning 2026-11-10 to 2026-11-14 with no time bounds THEN the system SHALL persist a single row covering all five days inclusively. <!-- event-driven -->
4. WHEN the collaborator submits a range whose `start_date` is later than its `end_date` THEN the system SHALL reject the submission and display `A data final deve ser igual ou posterior à data inicial.` without writing to the database. <!-- unwanted-behavior -->
5. WHEN the collaborator submits a time-bounded unavailability whose `start_date` differs from its `end_date` THEN the system SHALL reject the submission and display `Horários só podem ser usados em um único dia.` without writing to the database. <!-- unwanted-behavior -->
6. WHEN the collaborator submits a range whose `start_time` is later than or equal to its `end_time` THEN the system SHALL reject the submission and display `O horário final deve ser posterior ao inicial.` without writing to the database. <!-- unwanted-behavior -->
7. WHILE the collaborator has unavailability rows in the selected period, the system SHALL render each one on `/colaborador/agenda` as a distinct blocked block over the affected days or hours. <!-- state-driven -->
8. The system SHALL persist availability rows with `workspace_id` and `member_user_id` both populated and non-null. <!-- ubiquitous -->
9. WHEN the collaborator deletes an unavailability row THEN the system SHALL remove it and immediately re-render the calendar without a full reload. <!-- event-driven -->
10. IF the collaborator submits an unavailability overlapping an appointment already in `pending` or `confirmed` state, THEN the system SHALL save the unavailability and render a conflict badge on that appointment in both the manager and collaborator views. <!-- unwanted-behavior -->
11. The system SHALL reject any unavailability submission where `member_user_id` does not equal the authenticated user's id. <!-- ubiquitous -->
12. IF the collaborator attempts to delete an unavailability row whose `member_user_id` differs from their own id, THEN the system SHALL refuse the deletion and persist nothing. <!-- unwanted-behavior -->

**Independent Test**: Log in as a collaborator, mark 14:00–16:00 unavailable on a future date, reload, and confirm the block persists and the validation errors fire on each malformed input.

---

### P1: Manager views a collaborator's calendar and books without conflict ⭐ MVP

**User Story**: As a manager, I want to select an active collaborator inside my own agenda page and see their calendar, so that I can place an appointment on a day they are actually working.

**Why P1**: This is the manager-facing half of the loop and the enforcement point for the hard block.

**Acceptance Criteria**:

1. WHEN the manager opens `/pj/agenda` THEN the system SHALL display a collaborator selector listing exactly those `corporate_team` rows where `is_active = true` AND `member_user_id IS NOT NULL`. <!-- event-driven -->
2. WHEN the manager opens `/pj/agenda` without changing the selector THEN the system SHALL render the manager's own `time_blocks`, preserving current behavior unchanged. <!-- ubiquitous -->
3. WHEN the manager selects a collaborator THEN the system SHALL replace the rendered events with that collaborator's appointments and unavailability rows, and SHALL NOT render the manager's personal `time_blocks`. <!-- event-driven -->
4. WHEN the manager attempts to create an appointment overlapping any unavailability row of the selected collaborator THEN the system SHALL refuse the write, persist nothing, and display `Este período está indisponível para {nome} de {início} a {fim}.` <!-- unwanted-behavior -->
5. WHEN the manager creates an appointment for the selected collaborator with no overlap THEN the system SHALL persist one row with `status = 'pending'`, the selected collaborator's `member_user_id`, and the manager's `workspace_id`. <!-- event-driven -->
6. WHEN two managers attempt to create overlapping appointments for the same collaborator concurrently THEN the system SHALL persist both rows without data loss, because conflict detection is scoped to unavailability only. <!-- event-driven -->
7. IF the selected collaborator has no `corporate_team.whatsapp` value, THEN the system SHALL still create the appointment and SHALL display `Colaborador sem WhatsApp cadastrado — notificação não enviada.` alongside a manual resend action. <!-- unwanted-behavior -->
8. The system SHALL deny a manager read or write access to a `collaborator_appointments` row whose `workspace_id` differs from any workspace the authenticated user belongs to. <!-- ubiquitous -->
9. WHEN the manager cancels or edits an appointment THEN the system SHALL persist the change and SHALL NOT send a WhatsApp message. <!-- event-driven -->
10. WHILE the selector is set to a collaborator, the system SHALL show that collaborator's unavailability blocks visually distinct from appointment blocks. <!-- state-driven -->
11. WHEN the manager switches the selector back to their own calendar THEN the system SHALL restore the personal `time_blocks` view with no residual collaborator rows. <!-- event-driven -->
12. WHEN the manager supplies an observation while creating or editing an appointment THEN the system SHALL persist it as `notes` on that row, and SHALL store `NULL` when no observation is given. <!-- event-driven -->

**Independent Test**: As the manager, select a collaborator, attempt to book inside a range they marked unavailable, and confirm the save is refused with the named range; then book a free slot and confirm the row lands with `pending`.

---

### P1: WhatsApp notification with deep link on creation ⭐ MVP

**User Story**: As a manager, I want creating an appointment to notify the collaborator on WhatsApp with a link into their panel, so that they know to act on it without me following up.

**Why P1**: The user's stated loop is "ele entra no painel... e confirma ou cancela". Without delivery there is no loop.

**Acceptance Criteria**:

1. WHEN an appointment is created successfully THEN the system SHALL invoke the WhatsApp adapter exactly once with the collaborator's `corporate_team.whatsapp` value and a message containing the appointment title, date, time range, and the deep link `https://taskvisiovs.vercel.app/colaborador/agenda`. <!-- event-driven -->
2. WHEN the WhatsApp adapter returns a failure or times out after 10 seconds THEN the system SHALL keep the appointment persisted with `status = 'pending'`, record the failure in `appointment_notification_log`, and surface a resend affordance to the manager. <!-- unwanted-behavior -->
3. WHEN a resend is requested for an appointment THEN the system SHALL write a new row to `appointment_notification_log` rather than mutating the previous attempt, preserving the full attempt history. <!-- event-driven -->
4. WHEN the adapter is invoked twice for the same appointment within the same retry attempt THEN the system SHALL send at most one message, keyed on `appointment_id` plus attempt number. <!-- ubiquitous -->
5. The system SHALL keep the UAZapi base URL, endpoint path, and credential exclusively in server-side configuration, never in any `VITE_`-prefixed variable or client source file. <!-- ubiquitous -->
6. IF the WhatsApp send has not completed within 10 seconds, THEN the system SHALL abort the attempt and record it as `timeout`. <!-- unwanted-behavior -->
7. WHEN an appointment is edited or cancelled THEN the system SHALL send no WhatsApp message. <!-- event-driven -->
8. The system SHALL log one row per send attempt with `appointment_id`, `attempt`, `status`, `provider_response`, and `created_at`. <!-- ubiquitous -->
9. WHEN the appointment being notified carries a non-empty `notes` value THEN the system SHALL append it to the message body between the time range and the deep link. <!-- event-driven -->

**Independent Test**: Create an appointment with a valid number and confirm exactly one message with the deep link; point the adapter at a dead endpoint and confirm the appointment still saves with a visible resend affordance.

---

### P1: Collaborator confirms or cancels from their panel ⭐ MVP

**User Story**: As a collaborator, I want to open my agenda from the panel link and confirm or cancel what my manager scheduled, so that my calendar reflects reality rather than someone else's assumptions.

**Why P1**: This closes the loop the user described and is the only path out of `pending`.

**Acceptance Criteria**:

1. WHEN the collaborator navigates to `/colaborador/agenda` following the deep link THEN the system SHALL render their appointments and unavailability without requiring a login step if a session already exists. <!-- event-driven -->
2. WHEN the collaborator confirms a `pending` appointment THEN the system SHALL transition its status to `confirmed` and record `decided_at` and `decided_by = auth.uid()`. <!-- event-driven -->
3. WHEN the collaborator cancels a `pending` appointment THEN the system SHALL transition its status to `cancelled` and record `decided_at` and `decided_by = auth.uid()`. <!-- event-driven -->
4. IF the collaborator attempts to confirm or cancel an appointment whose status is already `confirmed` or `cancelled`, THEN the system SHALL reject the transition, persist nothing, and display `Esta solicitação já foi respondida.` <!-- unwanted-behavior -->
5. IF the collaborator attempts an action on an appointment whose `member_user_id` does not equal their own id, THEN the system SHALL reject it and persist nothing. <!-- unwanted-behavior -->
6. WHILE an appointment is `pending`, the system SHALL render both a confirm and a cancel action for it in `/colaborador/agenda`. <!-- state-driven -->
7. WHILE an appointment is `confirmed` or `cancelled`, the system SHALL render no confirm or cancel action for it. <!-- state-driven -->
8. WHEN the manager changes the appointment while the collaborator's panel is open THEN the system SHALL update the rendered status without a manual reload. <!-- event-driven -->
9. The system SHALL deny a collaborator SELECT access to any appointment or unavailability row whose `member_user_id` differs from their own id. <!-- ubiquitous -->
10. WHEN the collaborator's `collaborator_permissions.agenda` flag is disabled THEN the system SHALL hide the agenda nav item and redirect `/colaborador/agenda` to `/colaborador`. <!-- event-driven -->
11. WHEN a collaborator without a `member_user_id` is inspected anywhere in this feature THEN the system SHALL exclude them from the selector, the portal, and all appointment queries. <!-- ubiquitous -->
12. WHILE an appointment carries a non-empty `notes` value, the system SHALL render that observation in `/colaborador/agenda` alongside the appointment details. <!-- state-driven -->

**Independent Test**: From the WhatsApp link, confirm a pending appointment and reload to see it stays `confirmed`; then attempt to cancel that same one and confirm the transition is refused.

---

### P2: Realtime propagation across both views

**User Story**: As a manager and a collaborator, I want changes made by the other party to appear without reloading, so that the calendar is authoritative for both of us in the same session.

**Why P2**: Not required for the first working loop, but the project already ships the realtime plumbing and a stale calendar would immediately cause double-booking confusion.

**Acceptance Criteria**:

1. WHEN a collaborator confirms an appointment THEN the manager's open `/pj/agenda` view SHALL reflect `confirmed` without a page reload. <!-- event-driven -->
2. WHEN the manager creates an appointment THEN the collaborator's open `/colaborador/agenda` view SHALL show it without a page reload. <!-- event-driven -->
3. WHEN a new appointment table is added to the realtime publication, the system SHALL set `REPLICA IDENTITY FULL` on it using the idempotent `DO` block pattern from `supabase/migrations/20260617120000_realtime_react_query_tables.sql`. <!-- ubiquitous -->
4. WHEN the collaborator adds unavailability THEN the manager's open view SHALL reflect it without a page reload. <!-- event-driven -->

**Independent Test**: Open both views in two browsers and create/confirm an appointment from each side, confirming both update live.

---

### P2: Permission flag actually gates the feature

**User Story**: As a manager, I want the existing `agenda` permission switch in the collaborator's "Acesso" tab to control whether that collaborator can reach their agenda, so that one mechanism governs access.

**Why P2**: The key exists in the schema today and is dead. Wiring it protects the feature without new schema, but the loop works without it.

**Acceptance Criteria**:

1. WHERE `collaborator_permissions.agenda` is `false` for a collaborator, the system SHALL omit the agenda entry from that collaborator's sidebar and mobile navigation. <!-- optional-feature -->
2. WHERE `collaborator_permissions.agenda` is `false`, WHEN the collaborator requests `/colaborador/agenda` directly by URL, THEN the system SHALL redirect to `/colaborador`. <!-- optional-feature -->
3. WHERE the flag row does not exist for a collaborator, the system SHALL apply the schema default and grant access. <!-- optional-feature -->

**Independent Test**: Flip the switch off in the Acesso tab, reload as the collaborator, and confirm both the nav entry and the direct URL are unavailable.

---

### P3: Manager receives acknowledgement of the collaborator's decision

**User Story**: As a manager, I want to know my collaborator accepted or declined without having to ask, so that I can react to a cancellation.

**Why P3**: Valuable but not part of the loop the user described; it can ship on top of the existing notification seam.

**Acceptance Criteria**:

1. WHEN a collaborator confirms or cancels an appointment THEN the system SHALL write an in-app notification to the creating manager. <!-- event-driven -->
2. WHEN a collaborator confirms or cancels an appointment THEN the system SHALL send no WhatsApp message. <!-- event-driven -->

**Independent Test**: Confirm an appointment as the collaborator and observe the manager's in-app notification appear with no WhatsApp sent.

---

## Edge Cases

- IF the collaborator has no unavailability rows at all, THEN the system SHALL render their calendar as fully bookable with no empty-state error.
- IF the manager selects a collaborator who has zero appointments and zero unavailability, THEN the system SHALL render an empty calendar with an invitation to schedule, not an error.
- IF the selected collaborator is deactivated (`is_active = false`) between selection and save, THEN the system SHALL reject the save with `Este colaborador não está mais ativo.`
- IF the deep link is opened by a user who is not authenticated, THEN the system SHALL route to `/auth` and return to `/colaborador/agenda` after a successful session is established.
- IF the deep link is opened by a user whose `user_roles.role` is not `collaborator`, THEN the system SHALL redirect to `/caixa`, matching `CollaboratorRoute.tsx:30`.
- WHEN an unavailability row spans a month boundary, THEN the system SHALL render it across both months correctly using inclusive `start_date`..`end_date` comparison.
- IF `corporate_team.whatsapp` contains a value that is not digits-only, THEN the system SHALL reject it at entry with `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.`
- IF an appointment's `start_time` equals an unavailability's `end_time`, or vice versa (touching but not overlapping), THEN the system SHALL treat it as non-conflicting and permit the save.
- IF the WhatsApp adapter throws an unhandled exception, THEN the system SHALL catch it, log it, and leave the appointment intact.
- WHEN the manager's own calendar is selected, THEN the system SHALL not query `collaborator_appointments` at all.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------- |
| AVAIL-01 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-02 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-03 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-04 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-05 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-06 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-07 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-08 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-09 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-10 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-11 | P1: Collaborator declares unavailable time | Design | Verified |
| AVAIL-12 | P1: Collaborator declares unavailable time | Design | Verified |
| MGR-01 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-02 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-03 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-04 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-05 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-06 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-07 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-08 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-09 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-10 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-11 | P1: Manager views collaborator calendar | Design | Verified |
| MGR-12 | P1: Manager views collaborator calendar | Design | Verified |
| NOTIF-01 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-02 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-03 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-04 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-05 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-06 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-07 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-08 | P1: WhatsApp notification on creation | Design | Verified |
| NOTIF-09 | P1: WhatsApp notification on creation | Design | Verified |
| COLAB-01 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-02 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-03 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-04 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-05 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-06 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-07 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-08 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-09 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-10 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-11 | P1: Collaborator confirms or cancels | Design | Verified |
| COLAB-12 | P1: Collaborator confirms or cancels | Design | Verified |
| SYNC-01 | P2: Realtime propagation | Design | Verified |
| SYNC-02 | P2: Realtime propagation | Design | Verified |
| SYNC-03 | P2: Realtime propagation | Design | Verified |
| SYNC-04 | P2: Realtime propagation | Design | Verified |
| PERM-01 | P2: Permission flag gates feature | Design | Verified |
| PERM-02 | P2: Permission flag gates feature | Design | Verified |
| PERM-03 | P2: Permission flag gates feature | Design | Verified |
| ACK-01 | P3: Manager acknowledgement | Design | Verified |
| ACK-02 | P3: Manager acknowledgement | Design | Verified |

**Coverage:** 54 total, 49 mapped to tasks, 5 unmapped (AVAIL-10, MGR-06, ACK-01, ACK-02, AVAIL-12 — implemented during the fix rounds and covered by the database and component suites) ⚠️

---

## Success Criteria

- [ ] A collaborator can express all five unavailability granularities (hour range, half day, full day, multi-day range, full month) and see each one render correctly after a reload.
- [ ] Zero appointments can be persisted overlapping declared unavailability — verified by attempting the save.
- [ ] One appointment creation produces exactly one WhatsApp message containing a working deep link.
- [ ] A pending appointment reaches `confirmed` or `cancelled` from the collaborator panel, and the transition cannot be replayed.
- [ ] Cross-workspace access attempts return zero rows under RLS, confirmed by querying with a second workspace's user.
- [ ] The manager's own `/pj/agenda` behaves identically to today when no collaborator is selected.
