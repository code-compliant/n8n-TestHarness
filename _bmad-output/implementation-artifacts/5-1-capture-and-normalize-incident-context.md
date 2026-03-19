# Story 5.1: Capture and normalize incident context

Status: review

## Story

As an operator,
I want runtime failure context captured in a canonical structure,
so that repair candidates start from complete evidence.

## Acceptance Criteria

1. Given production execution fails with incident metadata, when capture runs, then workflow id, error context, payload, and run snapshot are stored.
2. Given an incident is captured, when capture completes, then a repair request artifact is created and linked to the incident.

## Tasks / Subtasks

- [x] Define incident domain models and normalized schema
- [x] Persist incident context in SQLite with deterministic incident ids
- [x] Emit repair request artifact on capture
- [x] Add unit tests for incident capture and artifact linkage

## Dev Notes

### FR coverage
- FR34, FR3

### Relevant Architecture Patterns and Constraints

- Use SQLite persistence with deterministic IDs and immutable records.
- Store incident context as serialized JSON strings to keep schema stable.
- Keep capture deterministic and stable for identical incident input.

### Source Tree Notes

- `src/domain/models/incident.ts`
- `src/shared/schemas/incident-schema.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/incident-repository.ts`
- `test/unit/services/incident-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Completion Notes List

- Added normalized incident schema with deterministic id generation and redaction.
- Added SQLite incidents + repair_requests tables and repository.
- Implemented incident capture with repair request artifact emission.
- Added unit coverage for capture and persistence.

### File List

- `_bmad-output/implementation-artifacts/5-1-capture-and-normalize-incident-context.md`
- `src/domain/models/incident.ts`
- `src/shared/schemas/incident-schema.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/incident-repository.ts`
- `test/unit/services/incident-service.spec.ts`
