# Story 3.2: Run deterministic test pass and synthetic trigger substitutions

Status: review

## Story

As a platform operator,
I want deterministic test execution with synthetic trigger alternatives,
so that workflows can be validated even without native inbound generation.

## Acceptance Criteria

1. Given direct trigger generation is unavailable, when simulation mode is enabled, then standardized synthetic events execute via test-safe substitutions.
2. Given substitutions are applied, when tests run, then outputs map to the same intended workflow contract deterministically.

## Implementation Summary

- Added deterministic test executor with synthetic event generation.
- Added test-safe substitution rules for sensitive inputs and production environment values.
- Ensured output hashes are stable for identical inputs.
- Added unit test to validate synthetic triggers and substitutions.

## Files

- `src/services/test-execution-service.ts`
- `src/shared/util/test-substitutions.ts`
- `src/shared/util/hash.ts`
- `src/shared/util/stable-json.ts`
- `test/unit/services/deterministic-test.spec.ts`

## Dev Notes

FR coverage: FR14, FR21, FR22, FR23

## Change Log

- 2026-03-19: Implemented deterministic test execution and synthetic trigger substitutions.
