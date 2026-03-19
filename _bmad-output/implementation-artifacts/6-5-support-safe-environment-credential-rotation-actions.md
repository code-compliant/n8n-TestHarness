# Story 6.5: Support safe environment credential rotation actions

Status: review

## Story

As an operator,
I want credential references to swap between test and production using auditable actions,
so that scope changes are reversible and controlled.

## Acceptance Criteria

1. Given a deployment requires environment rotation, when swap action runs, then references update without exposing secret values.
2. Given swap occurs, when rotation completes, then rollback references are preserved.
3. Given rotation is executed, then an auditable rotation record is created.

## Tasks / Subtasks

- [x] Implement rotation service to swap references
- [x] Preserve rollback references in credential bindings
- [x] Persist rotation events for audit
- [x] Add unit tests for rotation outcome and rollback preservation

## Dev Notes

### FR coverage
- FR32

### Relevant Architecture Patterns and Constraints

- Reference-only rotation, no secret values.
- Rollback references stored for safe reversal.

### Source Tree Notes

- `src/services/rotation-service.ts`
- `src/infra/persistence/sqlite/repositories/rotation-repository.ts`
- `src/infra/persistence/sqlite/repositories/credential-repository.ts`
- `test/unit/services/rotation-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

Subagent implementation

### Completion Notes List

- Implemented reference-only rotation and rollback preservation.
- Persisted rotation events linked to candidate IDs.
- Added unit tests for rotation behavior.
- Enforced deterministic sha256-based rotation IDs and reference validation.

### File List

- `_bmad-output/implementation-artifacts/6-5-support-safe-environment-credential-rotation-actions.md`
- `src/services/rotation-service.ts`
- `src/infra/persistence/sqlite/repositories/rotation-repository.ts`
- `test/unit/services/rotation-service.spec.ts`

### Change Log

- 2026-03-19: Implemented credential rotation actions with rollback.
- 2026-03-19: Added deterministic rotation IDs and invalid reference guard.
