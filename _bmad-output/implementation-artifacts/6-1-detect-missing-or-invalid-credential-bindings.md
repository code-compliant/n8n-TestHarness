# Story 6.1: Detect missing or invalid credential bindings

Status: review

## Story

As an operator,
I want environment checks to reject invalid credential bindings before execution,
so that unsafe runs are prevented.

## Acceptance Criteria

1. Given a candidate is evaluated for execution, when bindings are missing or invalid, then execution halts with targeted remediation guidance.
2. Given validation runs, when bindings are checked, then no secret material is read into logs or artifacts.
3. Given valid bindings, when validation completes, then the service returns a pass result with no missing or invalid items.

## Tasks / Subtasks

- [x] Implement credential binding validation service
  - [x] Enforce reference format validation (env:NAME)
  - [x] Return missing/invalid lists without exposing secrets
  - [x] Provide remediation guidance on blocked result

- [x] Add persistence support for credential bindings
  - [x] Add SQLite table for bindings
  - [x] Add repository for binding lookup and upsert

- [x] Add validation tests
  - [x] Unit test missing binding detection
  - [x] Unit test invalid reference detection

## Dev Notes

### FR coverage
- FR31, FR33, FR39

### Relevant Architecture Patterns and Constraints

- No secret values are persisted; references only.
- Validation must block execution before any setup or run actions.

### Source Tree Notes

- `src/services/credential-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/credential-repository.ts`
- `test/unit/services/credential-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

Subagent implementation

### Completion Notes List

- Added credential binding schema and repository.
- Implemented binding validation with remediation guidance and safe reference rules.
- Added unit test for missing and invalid bindings.

### File List

- `_bmad-output/implementation-artifacts/6-1-detect-missing-or-invalid-credential-bindings.md`
- `src/services/credential-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/connection.ts`
- `src/infra/persistence/sqlite/repositories/credential-repository.ts`
- `src/domain/models/credentials.ts`
- `test/unit/services/credential-service.spec.ts`
- `test/support/sqlite-test-helper.ts`

### Change Log

- 2026-03-19: Implemented credential binding validation and safe reference checks.
