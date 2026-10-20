# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Assert a derived conflict flag where it is rendered in each named view, not only in the mapper that computes it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `agenda` · harmful: 0
- features: collaborator-agenda
- evidence: AVAIL-10 (agenda)
- last seen: 2026-10-20T20:54:54Z

### L-002 - When the spec scopes conflict detection to one entity, assert that two overlapping creations of the other entity both persist
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `db` · harmful: 0
- features: collaborator-agenda
- evidence: MGR-06 (db)
- last seen: 2026-10-20T20:54:54Z

### L-003 - Every requirement left Pending in the spec traceability table needs a task, or the spec must move it out of scope before Execute ends
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: collaborator-agenda
- evidence: ACK-01 (spec)
- last seen: 2026-10-20T20:54:54Z

### L-004 - A deep-link route guard must carry the intended location through /auth instead of dropping it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: collaborator-agenda
- evidence: src/components/auth/CollaboratorRoute.tsx:27 (routes)
- last seen: 2026-10-20T20:54:55Z

### L-005 - Assert timeout and duration constants by value; injecting the duration into the call bypasses the production default
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `edge-functions` · harmful: 0
- features: collaborator-agenda
- evidence: M5 supabase/functions/_shared/notify-appointment.ts:13 (edge-functions)
- last seen: 2026-10-20T20:55:23Z

### L-006 - Mutate page-level wiring in the discrimination sensor, not only shared modules, to prove page tests discriminate
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `agenda` · harmful: 0
- features: collaborator-agenda
- evidence: M8 src/pages/PJ/AgendaPage.tsx:124; M9 src/pages/colaborador/ColaboratorAgendaPage.tsx:63 (agenda)
- last seen: 2026-10-20T20:55:23Z

### L-007 - Probe a scope-limited SQL function with a widening fault, or its scoping rule has no test at all
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `db` · harmful: 0
- features: collaborator-agenda
- evidence: M11 supabase/migrations/20261019120100_collaborator_agenda_behavior.sql:46 (db)
- last seen: 2026-10-20T20:55:23Z

### L-008 - Say in the spec which values fill each placeholder in a named error message
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: collaborator-agenda
- evidence: MGR-04 (spec)
- last seen: 2026-10-20T20:55:48Z

### L-009 - Give every rejection criterion an exact message string in the spec, never leave it to the implementation
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: collaborator-agenda
- evidence: COLAB-05 (spec)
- last seen: 2026-10-20T20:55:48Z

### L-010 - Write a SPEC_DEVIATION marker against the design's current text, or re-point it after the design is corrected
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `db` · harmful: 0
- features: collaborator-agenda
- evidence: supabase/migrations/20261019120000_collaborator_agenda_schema.sql:79 (db)
- last seen: 2026-10-20T20:55:48Z

### L-011 - A digits-only field rule must be enforced at entry with the spec's exact message, not by silently stripping characters
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `forms` · harmful: 0
- features: collaborator-agenda
- evidence: spec.md:218 (forms)
- last seen: 2026-10-20T20:55:48Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
