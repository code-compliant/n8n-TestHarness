# Story 6.2: Trigger setup skill and populate references

Status: review

## Story

As an operator,
I want missing bindings to trigger setup automation using references and IDs,
so that test environments are consistently prepared.

## Acceptance Criteria

1. Given setup is required for missing test bindings, when setup starts, then credential entries are populated from `.env` references.
2. Given setup completes, when results are recorded, then an auditable setup record is created.
3. Given setup runs, then secret values are never persisted or logged.

## Tasks / Subtasks

- [x] Implement setup service orchestration
  - [x] Load reference values from environment variables
  - [x] Invoke setup skill adapter with reference-only payloads
  - [x] Persist setup outcome in SQLite

- [x] Add audit recording for setup attempts
  - [x] Emit audit record for setup outcome
  - [x] Link audit to candidate lifecycle identifiers

- [x] Add unit tests
  - [x] Setup populates credential bindings from env references
  - [x] Setup outcome produces audit record

## Dev Notes

### FR coverage
- FR40, FR41

### Relevant Architecture Patterns and Constraints

- Use auditable setup records for operator review.
- Reference-only payloads; no secret values.

### Source Tree Notes

- `src/services/setup-service.ts`
- `src/infra/persistence/sqlite/repositories/setup-repository.ts`
- `src/services/audit-service.ts`
- `test/unit/services/setup-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

Subagent implementation

### Completion Notes List

- Implemented setup orchestration using env references.
- Stored setup outcomes and audit records.
- Added tests for setup success and audit capture.
- Switched setup identifiers to deterministic sha256-based IDs.

### File List

- `_bmad-output/implementation-artifacts/6-2-trigger-setup-skill-and-populate-references.md`
- `src/services/setup-service.ts`
- `src/services/audit-service.ts`
- `src/infra/persistence/sqlite/repositories/setup-repository.ts`
- `src/infra/persistence/sqlite/repositories/audit-repository.ts`
- `test/unit/services/setup-service.spec.ts`

### Change Log

- 2026-03-19: Implemented setup skill orchestration and auditable records.
- 2026-03-19: Updated setup IDs to deterministic sha256-based hashes.
