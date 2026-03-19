# Story 8.2: Suggest reuse during request and generation

Status: review

## Story

As a platform operator,
I want prior reusable patterns to be recommended while creating candidates,
so that quality improves over time.

## Acceptance Criteria

1. Given intake has enough context, when candidate generation starts, then matching patterns are surfaced for operator opt-in.
2. Given a pattern choice is applied, when lineage is recorded, then the applied pattern is stored with request metadata.

## Tasks / Subtasks

- [x] Surface pattern suggestions at intake
  - [x] Inject pattern suggestions into request summary artifacts
  - [x] Use integration context and tags for scoring

- [x] Capture applied pattern selection
  - [x] Accept optional pattern choice in intake payload
  - [x] Persist pattern lineage record in SQLite

- [x] Add unit tests
  - [x] Validate suggestions appear in intake summary
  - [x] Validate lineage records capture applied pattern selection

## Dev Notes

### FR coverage
- FR52

### Relevant Architecture Patterns and Constraints

- Summary artifacts remain the pre-execution gate.
- Pattern lineage must be immutable and persisted in SQLite.

### Source Tree Notes

- Updated modules:
  - `src/services/intent-service.ts`
  - `src/shared/telemetry/request-summary.ts`
  - `src/shared/schemas/intake-schema.ts`
  - `src/domain/models/intake.ts`
- Added tests:
  - `test/unit/commands/intake-pattern-reuse.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added pattern suggestion flow to intake summaries.
- Recorded applied pattern selection into SQLite lineage table.
- Added unit tests to verify suggestions and lineage.
- Story moved to `review`.

### File List

- `_bmad-output/implementation-artifacts/8-2-suggest-reuse-during-request-and-generation.md`
- `src/services/intent-service.ts`
- `src/shared/telemetry/request-summary.ts`
- `src/shared/schemas/intake-schema.ts`
- `src/domain/models/intake.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `test/unit/commands/intake-pattern-reuse.spec.ts`

### Change Log

- 2026-03-19: Implemented pattern suggestion surfacing and lineage capture.
