# Story 3.3: Emit reproducible evidence and rerun artifacts

Status: review

## Story

As a platform operator,
I want machine-readable evidence and replay bundle per test run,
so that any issue can be reproduced and shared.

## Acceptance Criteria

1. Given test execution finishes, when evidence packaging runs, then outputs include outcomes, timings, diff-to-input mapping, and rerun script.
2. Given rerun inputs are identical, when rerun script is used, then it yields the same result class.

## Implementation Summary

- Added evidence bundle generator with deterministic timing and rerun script artifact.
- Added rerun script entrypoint for replaying validation runs.
- Captured per-fixture input diff mappings and output hashes.
- Added unit test to verify reproducibility of evidence bundle and rerun metadata.

## Files

- `src/services/evidence-service.ts`
- `src/shared/util/deep-diff.ts`
- `scripts/rerun-validation.ts`
- `test/unit/services/evidence-bundle.spec.ts`

## Dev Notes

FR coverage: FR15, FR17, FR18, FR19

## Change Log

- 2026-03-19: Implemented evidence bundle generation and rerun artifacts.
- 2026-03-19: Added rerun-validation script entrypoint for evidence replay.
