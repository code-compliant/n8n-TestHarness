# Story 4.1: Classify candidates into risk bands

## Summary
- Added deterministic risk scoring with low/medium/high bands using validation failure taxonomy and credential binding status.
- Persisted immutable risk classifications per decision period (SQLite).
- Added stable JSON hashing for deterministic IDs.

## Implementation Notes
- RiskService computes rationale with failure summary and credential status.
- Risk classifications are immutable per decision period via unique constraint.

## Tests
- `test/unit/services/risk-service.spec.ts`
- `test/unit/shared/stable-json.spec.ts`
