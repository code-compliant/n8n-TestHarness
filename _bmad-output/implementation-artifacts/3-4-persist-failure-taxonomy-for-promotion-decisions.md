# Story 3.4: Persist failure taxonomy for promotion decisions

Status: review

## Story

As a platform operator,
I want every failed validation classified in a stable taxonomy,
so that policy gates apply consistently.

## Acceptance Criteria

1. Given validation reports failures, when fail classification executes, then each failure is tagged with deterministic class and retryability.
2. Given classification completes, when persistence runs, then policy gates can consume the stored taxonomy consistently.

## Implementation Summary

- Added failure taxonomy classification with deterministic IDs.
- Added SQLite persistence for validation failures.
- Added unit test coverage for fixture mismatch classification and persistence.

## Files

- `src/services/failure-taxonomy-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/failure-repository.ts`
- `test/unit/services/failure-taxonomy.spec.ts`

## Dev Notes

FR coverage: FR16

## Change Log

- 2026-03-19: Implemented failure taxonomy persistence for validation failures.
