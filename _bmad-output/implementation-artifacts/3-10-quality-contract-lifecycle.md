# Story 3.10: QualityContract Lifecycle

Status: ready

## Story

As a platform operator,
I want quality contracts authored automatically at request time, versioned in GitHub, and migrated safely when workflow features change,
so that quality gates stay accurate across the full lifecycle of every workflow without requiring manual spec maintenance.

## Acceptance Criteria

1. Given a new workflow request, when the harness initialises a greenfield candidate, then a `QualityContract` is generated from the PRD FR mapping (Story 3.5) plus a short elicitation step asking what "correct output" looks like for this workflow family.
2. Given a contract is generated, then it is written to `test/fixtures/contracts/<slug>.json` and committed to the feature branch — never to main directly.
3. Given a change request affects nodes referenced in existing assertions, when the harness detects the overlap, then a Telegram prompt is sent asking Chris to confirm: update contract / run with old contract / skip loop.
4. Given "update contract" is selected, when elicitation completes, then the contract diff is generated, committed to the branch, and the Ralph Loop proceeds with the updated contract.
5. Given a feature is removed from a workflow, when the contract is migrated, then assertions targeting nodes belonging to that feature are automatically removed. Remaining assertions are untouched.
6. Given a feature is added, when the contract is migrated, then the harness prompts for the new assertions scoped to the new feature only — not a full rewrite.
7. Given a brownfield workflow with no existing contract, when first encountered, the contract is auto-derived (Story 3.5), registered in the workflow registry, and treated as `source: "auto-derived"` — flagged for Chris to review and approve as a PR before being used as a blocking gate.
8. Given any contract update, the SQLite workflow registry `contractVersion` field is incremented and `updatedAt` is stamped.

## Contract Schema

```typescript
interface QualityContract {
  version: string;           // semver, e.g. "1.0.0"
  workflowSlug: string;
  source: "authored" | "auto-derived";
  features: string[];        // e.g. ["classify", "reply", "delegate"]
  assertions: Assertion[];
  createdAt: string;         // ISO timestamp
  updatedAt: string;
}

interface Assertion {
  id: string;                // stable ID, e.g. "assert-classify-tags"
  feature: string;           // which feature this assertion belongs to
  type: AssertionType;
  target: string;            // node name or field path
  spec: unknown;             // type-specific: allowed set, expected value, judge path, etc.
}
```

## Contract Migration Rules

| Change | Migration Action |
|--------|-----------------|
| Node renamed | Update `target` field, preserve assertion ID |
| Node removed (feature removed) | Remove assertions where `feature === removedFeature` |
| Node added (new feature) | Prompt for new assertions scoped to new feature |
| LLM prompt changed | Flag `llm_judge`/`perspective_check` assertions for that node as stale; prompt for re-review |
| Error handler changed | Update `error_handler_check` spec value automatically |

## Change Detection

- Diff incoming workflow JSON against previous version stored in SQLite `candidate_versions` table
- Identify added/removed/modified nodes
- Cross-reference with `assertions[].target` to find overlaps
- If overlap found → trigger Telegram migration prompt before loop starts

## Implementation Summary

- `ContractManager`: CRUD for contracts on disk + registry in SQLite
- `ContractMigrator`: diff-based migration, applies rules table above, flags stale assertions
- `ContractElicitor`: Telegram prompt flow for new-feature assertion authoring (inline buttons for assertion type selection, free text for spec values)
- `ChangeDetector`: diffs workflow JSON versions, returns `{ added[], removed[], modified[] }` node lists
- Auto-generated judge prompts (for `llm_judge`/`perspective_check`) written to `test/fixtures/judges/<slug>-<assertionId>.md` at contract creation time

## Files

- `src/services/contract-manager.ts`
- `src/services/contract-migrator.ts`
- `src/services/contract-elicitor.ts`
- `src/services/change-detector.ts`
- `src/domain/models/quality-contract.ts`
- `test/fixtures/contracts/` (directory, .gitkeep)
- `test/unit/services/contract-migrator.spec.ts`
- `test/unit/services/change-detector.spec.ts`

## Dev Notes

FR coverage: FR13, FR15, FR16, FR29, FR30, FR47
Contract files are committed to the feature branch, not main. They only reach main via PR approval — same gate as workflow files.
`source: "auto-derived"` contracts are non-blocking until Chris approves the PR. Until approved they run in `WARN` mode: failures are reported but do not halt the loop.
Judge prompt auto-generation: template-based for known assertion types, LLM-generated for novel workflow families.

## Change Log

- 2026-03-21: Story authored — Ralph Loop epic.
