# Story 4.3: Enforce credential swap and safe promotions

## Summary
- Added promotion policy enforcement for environment boundary transitions.
- Cross-boundary promotions require audited deployment action and safe credential bindings.

## Implementation Notes
- PromotionService rejects unsafe or non-audited transitions.

## Tests
- `test/unit/services/promotion-service.spec.ts`
