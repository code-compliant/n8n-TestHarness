# Story 8.1: Persist reusable patterns and integration context

Status: review

## Story

As a maintainer,
I want successful workflow patterns and context stored in-repo,
so that future generation benefits from prior work.

## Acceptance Criteria

1. Given a candidate completes successfully, when post-processing runs, then reusable pattern metadata is persisted.
2. Given pattern metadata is stored, when integration context is queried, then results are searchable by integration and tags.
3. Given pattern persistence succeeds, when repository storage is inspected, then pattern metadata exists in both SQLite and file-backed storage.

## Tasks / Subtasks

- [x] Add pattern domain models and persistence tables
  - [x] Define pattern metadata contract
  - [x] Add SQLite schema for patterns and pattern lineage
  - [x] Add file-backed JSON persistence for pattern metadata

- [x] Implement pattern service
  - [x] Derive deterministic pattern identifiers
  - [x] Persist successful candidate patterns
  - [x] Support searchable integration context

- [x] Add unit tests
  - [x] Validate file + SQLite persistence
  - [x] Validate search results with integration context

## Dev Notes

### FR coverage
- FR51

### Relevant Architecture Patterns and Constraints

- SQLite remains authoritative store for pattern metadata.
- File-backed storage is maintained for repo-native artifacts.
- Deterministic identifiers use hashing and stable inputs.

### Source Tree Notes

- Added modules:
  - `src/domain/models/patterns.ts`
  - `src/infra/persistence/sqlite/repositories/pattern-repository.ts`
  - `src/services/pattern-service.ts`
  - `test/unit/services/pattern-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added pattern metadata model and persistence schema.
- Implemented SQLite + file-backed pattern storage.
- Implemented pattern service for successful candidate persistence and search.
- Added unit tests for persistence and search.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/8-1-persist-reusable-patterns-and-integration-context.md`
- `src/domain/models/patterns.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/pattern-repository.ts`
- `src/services/pattern-service.ts`
- `test/unit/services/pattern-service.spec.ts`

### Change Log

- 2026-03-19: Implemented pattern persistence and searchable integration context.
