# Story 6.4: Record setup outcomes for audit and evidence

Status: review

## Story

As an operator,
I want all setup attempts, fallbacks, and outcomes to be auditable,
so that environment operations are traceable.

## Acceptance Criteria

1. Given any setup attempt occurs, when execution completes or fails, then an audit event records action sequence, actor, environment, and final status.
2. Given audit events are stored, when queried for a candidate lifecycle, then setup evidence is linked to the candidate identifier.

## Tasks / Subtasks

- [x] Add audit event persistence for setup outcomes
- [x] Link audit events to candidate ID and environment
- [x] Add unit test assertions for audit entries

## Dev Notes

### FR coverage
- FR45

### Relevant Architecture Patterns and Constraints

- Audit entries are immutable and reference-only.
- Action sequences remain safe for logging (no secret values).

### Source Tree Notes

- `src/services/audit-service.ts`
- `src/infra/persistence/sqlite/repositories/audit-repository.ts`
- `test/unit/services/setup-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

Subagent implementation

### Completion Notes List

- Implemented audit repository and service for setup events.
- Persisted action sequence with actor/environment/status per candidate.
- Added test assertions that audit records are stored for setup.
- Ensured audit IDs are deterministic sha256-based hashes.

### File List

- `_bmad-output/implementation-artifacts/6-4-record-setup-outcomes-for-audit-and-evidence.md`
- `src/services/audit-service.ts`
- `src/infra/persistence/sqlite/repositories/audit-repository.ts`
- `test/unit/services/setup-service.spec.ts`

### Change Log

- 2026-03-19: Added auditable setup outcome records.
- 2026-03-19: Updated audit identifiers to deterministic sha256-based hashes.
