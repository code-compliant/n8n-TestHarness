# Story 7.2: Enforce role-based deployment action controls

Status: review

## Story

As a team lead,
I want role-based controls on deployment actions,
so that only approved operators can execute critical transitions.

## Acceptance Criteria

1. Given a deployment or rollback is requested, when action authorization is evaluated, then unauthorized roles are denied with a clear reason.
2. Given any deployment action attempt, when authorization executes, then all attempts are logged.

## Tasks / Subtasks

- [x] Define deployment action authorization policy
  - [x] Allow-list deploy and rollback roles
  - [x] Return explicit denial reasons

- [x] Log all attempts
  - [x] Persist deployment attempt records with actor, role, and outcome
  - [x] Ensure both allowed and denied attempts are recorded

- [x] Add tests
  - [x] Validate unauthorized role denial and attempt logging

## Dev Notes

### FR coverage
- FR49

### Relevant Architecture Patterns and Constraints

- Command actions must be role-checked before state transitions.
- All authorization attempts are stored immutably for audit.

### Source Tree Notes

- `src/services/authorization-service.ts`
- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/repositories/deployment-repository.ts`
- `test/unit/services/deployment-authorization.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

bmad-create-story workflow context

### Completion Notes List

- Added authorization service with allow-listed role policy for deploy/rollback.
- Logged all deployment attempts into SQLite for audit.
- Added unit test confirming denial reason and attempt persistence.
- Story status set to `review`.

### File List

- `_bmad-output/implementation-artifacts/7-2-enforce-role-based-deployment-action-controls.md`
- `src/domain/models/candidate.ts`
- `src/services/authorization-service.ts`
- `src/services/candidate-lifecycle-service.ts`
- `src/infra/persistence/sqlite/repositories/deployment-repository.ts`
- `test/unit/services/deployment-authorization.spec.ts`

### Change Log

- 2026-03-19: Implemented role-based deployment authorization controls with attempt logging.
