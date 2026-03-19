# Story 7.1: Publish and surface candidate state artifacts

Status: review

## Story

As a team lead,
I want lifecycle states and history in GitHub-native artifacts,
so that all decisions are visible and reviewable.

## Acceptance Criteria

1. Given a candidate state changes, when the event persists, then artifacts include a lifecycle timeline with linked evidence.
2. Given lifecycle data is rendered, when artifacts are stored, then the repository remains the source of truth (file-based JSON artifacts).

## Tasks / Subtasks

- [x] Define candidate lifecycle and transition records
  - [x] Add SQLite tables for candidates, transitions, and deployment attempts
  - [x] Ensure transitions are append-only and include evidence references

- [x] Implement file-based state artifact publishing
  - [x] Build artifact writer to render lifecycle timeline and evidence refs
  - [x] Persist artifacts in `_bmad-output/implementation-artifacts/`

- [x] Add tests
  - [x] Validate lifecycle artifacts are generated with timeline and evidence

## Dev Notes

### FR coverage
- FR46, FR50

### Relevant Architecture Patterns and Constraints

- State transitions are immutable and append-only.
- File-based JSON artifacts act as repository-source-of-truth.
- Timeline artifacts include linked evidence references per transition.

### Source Tree Notes

- `src/services/artifact-service.ts`
- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `test/unit/services/candidate-artifacts.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added candidate, transition, and deployment attempt tables to SQLite schema.
- Implemented lifecycle artifact writer with timeline and evidence references.
- Added lifecycle service to publish artifacts on transitions.
- Added unit test for artifact publishing and evidence linkage.
- Story status set to `review`.

### File List

- `_bmad-output/implementation-artifacts/7-1-publish-and-surface-candidate-state-artifacts.md`
- `src/domain/models/candidate.ts`
- `src/services/artifact-service.ts`
- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `test/unit/services/candidate-artifacts.spec.ts`

### Change Log

- 2026-03-19: Implemented state artifact publishing for candidate lifecycle governance.
