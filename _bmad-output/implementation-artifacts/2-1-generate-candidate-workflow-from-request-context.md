# Story 2.1: Generate candidate workflow from request context

Status: review

## Story

As a platform operator,
I want the system to create a workflow candidate from request context,
so that manual workflow editing is minimized.

## Acceptance Criteria

1. Given a validated request exists, when candidate generation runs, then a candidate workflow artifact is produced with deterministic identifiers.
2. Given candidate creation executes, when persistence occurs, then the candidate is stored in SQLite as a read-only artifact without mutating production state.
3. Given identical request inputs, when candidate generation repeats, then the candidate id remains deterministic.

## Tasks / Subtasks

- [x] Define candidate domain model and persistence contract
- [x] Implement deterministic candidate id generation
- [x] Create candidate command entrypoint and service orchestration
- [x] Add SQLite table and repository for candidates
- [x] Unit tests for deterministic id and command output

## Dev Notes

### FR coverage
- FR7, FR11

### Relevant Architecture Patterns and Constraints

- Use deterministic ids with `candidate_` prefix and sha256 seed.
- Persist candidate artifacts only; avoid production mutation.
- SQLite table naming uses lower_snake_case and indexes on id fields.

### Source Tree Notes

- `src/commands/candidate/generate.ts`
- `src/services/candidate-service.ts`
- `src/domain/models/candidate.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `test/unit/services/candidate-service.spec.ts`
- `test/unit/commands/candidate-generate.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`
- Source: `_bmad-output/planning-artifacts/prd.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added deterministic candidate id generation and candidate domain model.
- Added SQLite candidates table and repository with idempotent insert behavior.
- Added candidate command entrypoint and orchestration service.
- Added unit tests for deterministic id and command output.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/2-1-generate-candidate-workflow-from-request-context.md`
- `src/commands/candidate/generate.ts`
- `src/services/candidate-service.ts`
- `src/domain/models/candidate.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/connection.ts`
- `test/unit/services/candidate-service.spec.ts`
- `test/unit/commands/candidate-generate.spec.ts`

### Change Log

- 2026-03-19: Implemented candidate generation command, service, persistence, and tests.
