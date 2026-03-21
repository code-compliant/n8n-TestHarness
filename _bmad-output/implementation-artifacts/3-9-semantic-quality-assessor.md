# Story 3.9: Semantic Quality Assessor

Status: ready

## Story

As a platform operator,
I want workflow outputs assessed for semantic correctness — not just structural validity —
so that bugs like wrong perspective in generated text, misclassified tags, or incorrect routing are caught automatically before the workflow reaches production.

## Acceptance Criteria

1. Given a `QualityContract` with assertions, when the assessor runs, then it evaluates all assertions in cheapest-first order: static → regex → llm_judge.
2. Given a `classification_check` assertion, when the node output is evaluated, then the assessor confirms the output value is within the allowed set defined in the spec.
3. Given a `perspective_check` assertion (subtype of `llm_judge`), when the node output is evaluated, then an LLM judge call confirms the output is written from the correct author perspective (e.g. Chris as consultant, not the client).
4. Given an `enum_match` assertion, when the node output is evaluated, then the assessor confirms the output matches the expected value exactly.
5. Given a `not_contains` assertion, when the node output is evaluated, then the assessor confirms forbidden phrases/patterns are absent from the output.
6. Given a `side_effect_check` assertion, when execution completes, then the assessor confirms the specified node executed successfully (output present in execution log).
7. Given a `context_injection_audit` assertion, when the workflow JSON is evaluated statically (pre-execution), then the assessor confirms the LLM node's system prompt contains required role/identity context tokens.
8. Given any LLM judge call, when the result is ambiguous (UNCLEAR), then the assertion is marked as `WARN` not `FAIL`, and included in the ralph-report but does not block the loop from proceeding.
9. Given all assertions complete, the assessor emits an `AssessmentResult`: `{ passCount, failCount, warnCount, assertions: AssertionResult[], overallStatus: PASS|FAIL|WARN }`.

## Assertion Type Registry

```typescript
type AssertionType =
  | 'error_handler_check'      // static: verifies error handler workflow ID wired
  | 'context_injection_audit'  // static: verifies LLM node has role context tokens
  | 'schema_match'             // static: output has required fields/types
  | 'enum_match'               // static: output matches expected value
  | 'classification_check'     // static: output is within allowed set
  | 'not_contains'             // regex: output excludes forbidden patterns
  | 'contains_topic'           // regex: output contains required topic signals
  | 'threshold_numeric'        // static: numeric output within bounds
  | 'side_effect_check'        // runtime: node executed and produced output
  | 'llm_judge'                // LLM: semantic quality via judge prompt file
  | 'perspective_check'        // LLM (subtype): author perspective validation
```

## Evaluation Order (cheapest first)

1. `error_handler_check` — structural, no API call
2. `context_injection_audit` — structural, no API call
3. `schema_match` — structural, no API call
4. `enum_match` — structural, no API call
5. `classification_check` — structural, no API call
6. `threshold_numeric` — structural, no API call
7. `not_contains` — regex, no API call
8. `contains_topic` — regex, no API call
9. `side_effect_check` — runtime log lookup, no API call
10. `llm_judge` / `perspective_check` — 1 LLM call per assertion

## Judge Prompt Convention

Judge prompts stored in `test/fixtures/judges/<slug>-<assertionId>.md`.
Format:
```
You are evaluating output from an n8n workflow node.
Context: <workflow family context>
Task: <what the node is supposed to do>
Evaluate the following output and respond with exactly one of: CORRECT / WRONG / UNCLEAR
Reason: <one sentence>

Output to evaluate:
{{ output }}
```

## Implementation Summary

- `SemanticQualityAssessor`: main service, iterates assertion list in priority order, short-circuits on static fails before LLM calls
- `AssertionEvaluator` registry: map of `AssertionType → evaluator function`
- `LLMJudgeClient`: single-call LLM wrapper for judge assertions, parses CORRECT/WRONG/UNCLEAR, maps UNCLEAR → WARN
- `ContextInjectionAuditor`: static analysis of workflow JSON — finds LLM nodes, checks `parameters.systemMessage` or equivalent for required tokens
- Judge prompts auto-generated at contract creation time (Story 3.10), stored in `test/fixtures/judges/`

## Files

- `src/services/semantic-quality-assessor.ts`
- `src/services/assertion-evaluators/` (one file per assertion type)
- `src/services/llm-judge-client.ts`
- `src/services/context-injection-auditor.ts`
- `src/domain/models/assessment-result.ts`
- `test/fixtures/judges/` (directory, .gitkeep)
- `test/unit/services/semantic-quality-assessor.spec.ts`
- `test/unit/services/assertion-evaluators/` (per-type unit tests)

## Dev Notes

FR coverage: FR13, FR14, FR15, FR20, FR22, FR23
LLM judge model: cheapest available (haiku/gpt-4o-mini) — output is pass/fail only, not generative.
`perspective_check` judge prompt must always include: Chris's role (Managing Director, Dorian Engineering Consultants), communication direction (Chris → client, not client → Chris), and tone expectations.
`context_injection_audit` required tokens for email-family LLM nodes: at minimum one of `["Chris", "Dorian", "consultant", "engineer", "MD"]` in system prompt.

## Change Log

- 2026-03-21: Story authored — Ralph Loop epic.
