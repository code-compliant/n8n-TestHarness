# Story 3.1: Run fixture-based validation for every candidate

Status: review

## Story

As a platform operator,
I want each candidate validated against structured fixtures,
so that baseline behavior is consistently checked.

## Acceptance Criteria

1. Given a candidate is ready for testing, when fixture validation starts, then all required fixtures are loaded and executed.
2. Given fixture inputs are missing, when validation runs, then validation hard-fails with a deterministic failure record.

## Implementation Summary

- Added fixture loader with strict schema validation and missing-fixture hard fail.
- Validation service orchestrates deterministic run IDs and fixture execution.
- Failure taxonomy persistence captures missing fixtures as deterministic failures.
- Added unit test coverage for missing fixture behavior.

## Files

- `src/services/fixture-loader.ts`
- `src/services/validation-service.ts`
- `src/domain/models/validation.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/failure-repository.ts`
- `test/unit/services/fixture-validation.spec.ts`

## Dev Notes

FR coverage: FR13, FR20

## Change Log

- 2026-03-19: Implemented fixture-based validation with hard-fail behavior and tests.
