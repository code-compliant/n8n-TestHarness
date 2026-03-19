# Story 2.3: Create execution-ready diff and section traceability

Status: review

## Story

As a platform operator,
I want a candidate diff and section mapping,
so that review and approval are precise.

## Acceptance Criteria

1. Given candidate generation completes, when diff packaging executes, then a diff artifact is stored with change details.
2. Given workflow changes touch specific nodes, when section mapping executes, then section-level traceability is recorded.
3. Given the candidate package exists, when returned to the caller, then it remains in review-only state until deployment.

## Tasks / Subtasks

- [x] Implement deterministic diff builder for base vs candidate workflows
- [x] Map diff changes to workflow node sections
- [x] Persist diff and section traceability with candidate artifacts
- [x] Unit tests for diff and section mapping behavior

## Dev Notes

### FR coverage
- FR9, FR11, FR12

### Diff Packaging Notes

- Diff output uses path-based change entries (`add`, `remove`, `modify`).
- Section mapping targets workflow `nodes[index]` paths and resolves section id/name from node metadata.

### Source Tree Notes

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

- Added diff builder and section traceability mapping in candidate service.
- Persisted diff and section traceability with candidate artifacts.
- Added unit tests for diff output and section mapping.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/2-3-create-execution-ready-diff-and-section-traceability.md`
- `src/services/candidate-service.ts`
- `src/domain/models/candidate.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `test/unit/services/candidate-service.spec.ts`
- `test/unit/commands/candidate-generate.spec.ts`

### Change Log

- 2026-03-19: Implemented diff packaging and section traceability with tests.
