# Story 3.7: Ralph Loop Orchestrator

Status: ready

## Story

As a platform operator,
I want the harness to automatically retry failed workflow candidates using a targeted fix loop,
so that transient generation errors are resolved without manual intervention and I'm only interrupted when the loop exhausts.

## Acceptance Criteria

1. Given a candidate that fails assessment, when the Ralph Loop starts, then it executes up to 5 iterations before halting.
2. Given an iteration fails, when the loop prepares the next iteration, then it builds a `FixDelta` from the assertion failures and runtime errors — not a full regeneration request.
3. Given a `FixDelta`, when the loop re-prompts the generator, then the prompt includes: which assertions failed, what the actual output was, what was expected, and the specific node(s) responsible.
4. Given all assertions pass on any iteration, when the loop evaluates results, then it halts immediately with status `PASS` and does not run further iterations.
5. Given the loop reaches iteration 5 with failures remaining, then it halts with status `EXHAUSTED` and emits a `ralph-report.md`.
6. Given a brownfield workflow repair request, when the loop initialises, then the starting candidate is the cloned live definition (from Story 3.6 `BrownfieldCloner`), not a freshly generated workflow. The workflow registry is checked first; if no contract exists, Story 3.5 spec derivation runs before the loop starts.
7. Given abort is triggered (via Telegram or dashboard), when the loop receives the abort signal, then it halts immediately after the current iteration completes (does not kill mid-execution), emits a partial `ralph-report.md` with status `ABORTED`.
8. Given inactivity (no loop action) for 3 consecutive hours, when the timeout fires, then the loop halts with status `TIMEOUT` and emits a partial `ralph-report.md`.

## Loop State Machine

```
IDLE → INITIALISING → ITERATING → (PASS | EXHAUSTED | ABORTED | TIMEOUT)
```

Each iteration state: `DEPLOYING → EXECUTING → ASSESSING → (FIX_DELTA | PASS)`

## FixDelta Schema

```typescript
interface FixDelta {
  iterationNumber: number;
  failedAssertions: {
    assertionType: string;
    target: string;       // node name or field
    expected: unknown;
    actual: unknown;
    suggestedFix: string; // human-readable hint for generator
  }[];
  runtimeErrors: RuntimeFailure[];
  generatorPrompt: string; // fully assembled re-prompt string
}
```

## Implementation Summary

- `RalphLoopOrchestrator`: main loop controller, manages iteration count, state transitions, inactivity timer, abort signal handling
- `FixDeltaBuilder`: takes `AssessmentResult` + `RuntimeResult` → produces `FixDelta` with assembled generator prompt
- `GeneratorAdapter`: sends `FixDelta.generatorPrompt` to the workflow generator (LLM), receives updated workflow JSON
- `InactivityTimer`: resets on any loop action, fires abort after 3hr idle; persists last-action timestamp to SQLite so restarts don't lose the window
- `RalphLoopRecord` in SQLite: `{ loopId, workflowSlug, status, currentIteration, startedAt, lastActionAt, completedAt }`
- Abort signal: written to SQLite `ralph_loop_signals` table; orchestrator polls between iterations

## Files

- `src/services/ralph-loop-orchestrator.ts`
- `src/services/fix-delta-builder.ts`
- `src/services/generator-adapter.ts`
- `src/services/inactivity-timer.ts`
- `src/domain/models/ralph-loop.ts`
- `src/domain/models/fix-delta.ts`
- `src/infra/persistence/sqlite/schema.ts` (add `ralph_loops`, `ralph_loop_signals` tables)
- `test/unit/services/ralph-loop-orchestrator.spec.ts`
- `test/unit/services/fix-delta-builder.spec.ts`

## Dev Notes

FR coverage: FR13, FR14, FR15, FR16, FR17, FR18, FR36
Max iterations: 5 (configurable via `config/ralph.json`: `{ "maxIterations": 5, "inactivityTimeoutHours": 3 }`)
Inactivity timer resets on: iteration start, deploy start, execution start, assertion start, Telegram prompt sent, dashboard poll received.
Generator adapter must pass the assembled prompt to the same LLM pipeline used in Story 2.1 (generate candidate).

## Change Log

- 2026-03-21: Story authored — Ralph Loop epic.
