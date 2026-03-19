# Story 2.2: Regenerate upgrades with placeholder preservation

Status: review

## Story

As a platform operator,
I want upgrade generation to preserve business logic placeholders,
so that environment-sensitive logic remains safe.

## Acceptance Criteria

1. Given an upgrade request includes placeholders, when regeneration runs, then placeholders remain structurally intact.
2. Given placeholder preservation executes, when candidate is persisted, then the placeholder occurrences are recorded in the candidate artifact.
3. Given an upgrade candidate is generated, when diff packaging runs, then placeholder-preserved sections remain mapped to workflow nodes.

## Tasks / Subtasks

- [x] Define placeholder contract and detection rules
- [x] Implement placeholder preservation in candidate service
- [x] Persist placeholder occurrences with candidate artifact
- [x] Unit test preservation behavior

## Dev Notes

### FR coverage
- FR8, FR10

### Placeholder Contract

- Placeholder tokens are strings containing `{{PLACEHOLDER_NAME}}` (double-brace syntax).
- Placeholder preservation is path-based: any placeholder tokens found in the base workflow are re-applied to the regenerated workflow at the same path when available.

### Source Tree Notes

- `src/services/candidate-service.ts`
- `src/domain/models/candidate.ts`
- `test/unit/services/candidate-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`
- Source: `_bmad-output/planning-artifacts/prd.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added placeholder extraction and preservation utilities in candidate service.
- Preserved placeholders by path during upgrade regeneration.
- Persisted placeholder occurrence list alongside candidate artifacts.
- Added unit test covering placeholder preservation.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/2-2-regenerate-upgrades-with-placeholder-preservation.md`
- `src/services/candidate-service.ts`
- `src/domain/models/candidate.ts`
- `test/unit/services/candidate-service.spec.ts`

### Change Log

- 2026-03-19: Implemented placeholder preservation contract and tests.
