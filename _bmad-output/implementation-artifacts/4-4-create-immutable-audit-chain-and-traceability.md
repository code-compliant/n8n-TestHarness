# Story 4.4: Create immutable audit chain and traceability

## Summary
- Added append-only audit events with actor, timestamp, policy links, and artifacts.
- Audit events support request/candidate/approver traceability.

## Implementation Notes
- SQLite-backed audit_events table with append-only repository.

## Tests
- `test/unit/services/audit-service.spec.ts`
