# Story 1.1: Capture Telegram request and classify journey type

Status: review

## Story

As a platform operator,
I want request intake to accept natural-language input and classify journey type,
so that requests consistently enter the correct automation path.

## Acceptance Criteria

1. Given a request payload arrives from Telegram or API, when intake parsing executes, then the request is normalized into a stable request object.
2. Given classification inputs are present, when classifier runs, then the journey type is one of: new, modify, repair, upgrade, test, rollback.
3. Given classification has low confidence, when route selection occurs, then the request is blocked from candidate execution and surfaces a clarification path.
4. Given classification succeeds, when the request is persisted, then request record includes source, journey type, confidence, actor, timestamp, and deterministic `request_id`.
5. Given a classification result exists, when summary generation runs, then a concise pre-execution summary artifact is emitted and visible before downstream commands can execute.

## Tasks / Subtasks

- [x] Implement request intake normalization
  - [x] Define the intake payload schema for request body, workflow identifiers, context flags, and optional failure payload
  - [x] Add deterministic parsing rules for Telegram/text input and machine event payloads
  - [x] Persist normalized intake object in SQLite with immutable audit linkage

- [x] Implement journey classification
  - [x] Implement deterministic classification path for the six journey types
  - [x] Add confidence thresholds and fallback/clarification branch
  - [x] Persist route metadata (`journey`, `confidence`, `reason`) as part of request record

- [x] Add pre-execution summary gate
  - [x] Build summary payload contract and serializer
  - [x] Emit summary artifact before candidate generation or repair flows can proceed
  - [x] Add explicit test to ensure summary contains intent, targets, risk hints, and next action

- [x] Add validation and tests
  - [x] Unit tests for parser and classifier happy path
  - [x] Unit tests for low-confidence branch and blocked execution
  - [x] Contract test for summary payload shape and required fields
  - [x] Verify no secret-bearing fields are serialized in intake artifacts

## Dev Notes

### FR coverage
- FR1, FR4, FR6

### Relevant Architecture Patterns and Constraints

- Keep intake, classification, and summary generation as explicit command-layer entrypoint plus domain service calls.
- Store request state in SQLite with immutable transitions and auditable records.
- Avoid leaking secrets or workflow credentials through intake artifacts.
- Maintain deterministic behavior for identical input.
- Use existing contract format fields (status/state/correlation/request identifiers).

### Source Tree Notes

- Suggested implementation locations:
  - `src/commands/intake.ts` (or `src/commands/candidate/intake.ts` if intake is grouped under candidate)
  - `src/domain/models/intake.ts`
  - `src/services/intent-service.ts`
  - `src/infra/persistence/sqlite/repositories/intake-repository.ts`
  - `src/shared/schemas/intake-schema.ts`
  - `src/shared/telemetry/request-summary.ts`
  - `test/unit/services/intent-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`
- Source: `_bmad-output/planning-artifacts/prd.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Story has been converted from Epic 1 Story 1.1 with concrete acceptance criteria and implementation tasks.
- Story status set to `review`.
- Story key: `1-1-capture-telegram-request-and-classify-journey-type`
- Added command-layer intake handling at `src/commands/candidate/intake.ts` with deterministic gate routing.
- Added intake normalization, classification, and low-confidence guard in `src/services/intent-service.ts`.
- Added normalized request schema, deterministic request ID, and redact/validation helpers in `src/shared/schemas/intake-schema.ts`.
- Added pre-execution summary contract in `src/shared/telemetry/request-summary.ts`.
- Added SQLite schema, connection helper, and idempotent intake repository in `src/infra/persistence/sqlite/*`.
- Added unit tests for parser/classifier, low-confidence blocking, summary fields, and secret redaction.
- Story moved to `review`; acceptance criteria are implemented in code and tests were added.

### File List

- `_bmad-output/implementation-artifacts/1-1-capture-telegram-request-and-classify-journey-type.md`
- `src/commands/candidate/intake.ts`
- `src/domain/models/intake.ts`
- `src/services/intent-service.ts`
- `src/shared/schemas/intake-schema.ts`
- `src/shared/telemetry/request-summary.ts`
- `src/infra/persistence/sqlite/connection.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/intake-repository.ts`
- `src/index.ts`
- `test/unit/services/intent-service.spec.ts`
- `test/unit/shared/intake-schema.spec.ts`
- `test/unit/shared/request-summary.spec.ts`
- `package.json`
- `tsconfig.json`
- `.gitignore`

### Change Log

- 2026-03-19: Implemented Story 1.1 end-to-end intake pipeline (command entrypoint, schema parsing, classification, gating, summary contract, SQLite persistence, and test coverage).
