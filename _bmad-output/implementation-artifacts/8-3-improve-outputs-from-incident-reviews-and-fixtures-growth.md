# Story 8.3: Improve outputs from incident reviews and fixtures growth

Status: review

## Story

As a maintainer,
I want incident reviews and fixture additions to feed back into harness intelligence,
so that future candidates are higher quality.

## Acceptance Criteria

1. Given review notes or manual feedback are submitted, when growth job runs, then fixture sets and quality hints are updated.
2. Given quality hints are updated, when new candidates are scored, then scoring reflects those updates.

## Tasks / Subtasks

- [x] Add review/fixture/quality hint models and persistence
  - [x] Add SQLite tables for incident reviews, fixture sets, and quality hints
  - [x] Persist fixture artifacts to repo-backed JSON files

- [x] Implement knowledge growth service
  - [x] Accept review notes and transform into persisted artifacts
  - [x] Update quality hints for future scoring

- [x] Wire scoring adjustments
  - [x] Apply quality hints in pattern suggestion scoring

- [x] Add unit tests
  - [x] Validate fixture file persistence and hint capture
  - [x] Validate score adjustment after quality hints are applied

## Dev Notes

### FR coverage
- FR53, FR54

### Relevant Architecture Patterns and Constraints

- SQLite is the authoritative store for quality hints.
- File-backed fixtures remain in repo for auditability.
- Scoring updates must be deterministic and traceable.

### Source Tree Notes

- Added modules:
  - `src/domain/models/knowledge.ts`
  - `src/infra/persistence/sqlite/repositories/knowledge-repository.ts`
  - `src/services/knowledge-growth-service.ts`
- Updated modules:
  - `src/services/pattern-service.ts`
  - `src/infra/persistence/sqlite/schema.ts`
- Added tests:
  - `test/unit/services/knowledge-growth-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Implemented growth service to persist review notes, fixtures, and quality hints.
- Added quality hint adjustments to pattern scoring.
- Added unit tests for fixture persistence and scoring adjustments.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/8-3-improve-outputs-from-incident-reviews-and-fixtures-growth.md`
- `src/domain/models/knowledge.ts`
- `src/infra/persistence/sqlite/repositories/knowledge-repository.ts`
- `src/services/knowledge-growth-service.ts`
- `src/services/pattern-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `test/unit/services/knowledge-growth-service.spec.ts`

### Change Log

- 2026-03-19: Implemented knowledge growth pipeline and scoring updates.
