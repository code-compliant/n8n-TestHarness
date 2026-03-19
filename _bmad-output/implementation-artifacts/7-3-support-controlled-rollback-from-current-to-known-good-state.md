# Story 7.3: Support controlled rollback from current to known-good state

Status: review

## Story

As a lead operator,
I want rollback functionality to known-good revisions,
so that production stability is quickly restored.

## Acceptance Criteria

1. Given rollback criteria is triggered, when rollback executes, then the system restores the designated known-good revision.
2. Given rollback completes, when transitions are recorded, then resulting state transitions are immutable and auditable.

## Tasks / Subtasks

- [x] Implement known-good revision tracking
  - [x] Store known-good revision on candidate records
  - [x] Validate rollback targets against known-good revision

- [x] Implement rollback transition flow
  - [x] Update candidate revision/state to rolled back
  - [x] Append immutable transition record with rollback evidence

- [x] Add tests
  - [x] Validate rollback restores revision and records transition

## Dev Notes

### FR coverage
- FR47, FR48

### Relevant Architecture Patterns and Constraints

- Rollback requires explicit authorization and immutable transition logging.
- Transitions must remain append-only with evidence references.

### Source Tree Notes

- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `test/unit/services/rollback-control.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added rollback handling to lifecycle service with known-good revision validation.
- Persisted rollback transition records and updated candidate revision/state.
- Added unit test for controlled rollback path.
- Story status set to `review`.

### File List

- `_bmad-output/implementation-artifacts/7-3-support-controlled-rollback-from-current-to-known-good-state.md`
- `src/domain/models/candidate.ts`
- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `test/unit/services/rollback-control.spec.ts`

### Change Log

- 2026-03-19: Implemented controlled rollback flow with immutable transition records.
