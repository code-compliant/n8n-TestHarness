# Story 6.3: Seed fixtures and execute browser fallback

Status: review

## Story

As an operator,
I want setup to seed fixtures and continue with browser fallback when APIs are unavailable,
so that the harness stays resilient.

## Acceptance Criteria

1. Given API credential setup fails or is unavailable, when fallback flow activates, then Playwright setup path executes first.
2. Given Playwright fallback fails, when setup cannot complete, then manual guided setup path is offered before deployment continues.
3. Given setup starts, when fixture seeding occurs, then results are captured in the action sequence.

## Tasks / Subtasks

- [x] Add fixture seeding to setup flow
- [x] Add Playwright fallback stub path
- [x] Provide manual guidance path when fallback fails
- [x] Add unit tests for fallback and manual guidance

## Dev Notes

### FR coverage
- FR42, FR43, FR44

### Relevant Architecture Patterns and Constraints

- Playwright integration remains stubbed for tests.
- Manual guidance is a deterministic, operator-facing path with no secret data.

### Source Tree Notes

- `src/services/setup-service.ts`
- `test/unit/services/setup-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

Subagent implementation

### Completion Notes List

- Added fixture seeding step to setup flow.
- Added Playwright fallback stub execution and manual guidance fallback.
- Added tests covering fallback and manual guidance paths.

### File List

- `_bmad-output/implementation-artifacts/6-3-seed-fixtures-and-execute-browser-fallback.md`
- `src/services/setup-service.ts`
- `test/unit/services/setup-service.spec.ts`

### Change Log

- 2026-03-19: Implemented fixture seeding and fallback execution paths.
