# Story 5.3: Distinguish manual and automated recovery outcomes

Status: review

## Story

As an operator,
I want manual and automated outcomes distinguished in records,
so that post-incident analysis is accurate.

## Acceptance Criteria

1. Given a repair workflow finishes, when outcome is recorded, then the record identifies whether recovery was manual or automated.
2. Given an outcome is stored, when analysis is performed, then retained case data is available for fixture reuse.

## Tasks / Subtasks

- [x] Add recovery outcome persistence schema with manual/automated flag
- [x] Record outcome with fixture snapshot payload
- [x] Add unit test verifying recovery type and fixture retention

## Dev Notes

### FR coverage
- FR37, FR38

### Relevant Architecture Patterns and Constraints

- Outcome records are immutable and stored in SQLite for later fixture reuse.
- Manual vs automated is a first-class field with explicit enum values.

### Source Tree Notes

- `src/domain/models/incident.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/recovery-outcome-repository.ts`
- `test/unit/services/incident-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Completion Notes List

- Added recovery outcome schema with manual/automated flags.
- Stored fixture snapshot with outcome for future reuse.
- Added unit test coverage for recovery outcome recording.

### File List

- `_bmad-output/implementation-artifacts/5-3-distinguish-manual-and-automated-recovery-outcomes.md`
- `src/domain/models/incident.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/recovery-outcome-repository.ts`
- `test/unit/services/incident-service.spec.ts`
