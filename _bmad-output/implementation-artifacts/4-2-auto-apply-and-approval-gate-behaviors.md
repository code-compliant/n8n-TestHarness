# Story 4.2: Auto-apply and approval-gate behaviors

## Summary
- Added policy evaluation to auto-approve low-risk candidates when checks pass.
- Medium/high candidates stay in operator review; failed checks are blocked.
- Persisted policy decisions in SQLite.

## Implementation Notes
- PolicyService evaluates evidence + credential safety and risk band.
- Decisions stored append-only in `policy_decisions`.

## Tests
- `test/unit/services/policy-service.spec.ts`
