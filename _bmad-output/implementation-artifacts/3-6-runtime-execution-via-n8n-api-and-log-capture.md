# Story 3.6: Runtime Execution via n8n API and Log Capture

Status: ready

## Story

As a platform operator,
I want the harness to deploy a candidate to the test environment, trigger execution, and capture the full runtime log,
so that real execution errors are surfaced rather than only structural issues.

## Acceptance Criteria

1. Given a candidate workflow JSON, when the harness runs a test cycle, then it deploys to the test n8n instance via API and retrieves the assigned workflow ID.
2. Given deployment succeeds, when execution is triggered, then the harness polls for completion and captures the full execution log including node outputs and errors.
3. Given execution produces a failed node, when log capture completes, then the failure is parsed into a structured `RuntimeFailure` record: `{ nodeId, nodeName, errorMessage, errorType, executionId }`.
4. Given the test n8n instance uses test credentials (not production), the harness enforces credential substitution before deploy: no production credential IDs may appear in a test-env candidate.
5. Given execution succeeds with no errors, when log capture completes, then node output data is stored per-node for downstream assertion evaluation.
6. Given a brownfield workflow, when the harness pulls the live definition for testing, then it clones the workflow to the test instance (does not mutate the production workflow).

## Implementation Summary

- `N8nApiClient` service (or extend existing): `deployWorkflow`, `triggerExecution`, `pollExecutionStatus`, `getExecutionLog`, `deleteWorkflow`
- `RuntimeLogCapture` service: parses n8n execution log JSON into `RuntimeResult { executionId, status, nodeResults[], errors[] }`
- `CredentialGuard`: pre-deploy check — rejects any candidate containing production credential IDs; maps to test credential equivalents via `config/credential-map.json`
- `BrownfieldCloner`: pulls live workflow definition, strips `id`/`active` fields, sets test credentials, returns clean candidate for test deploy
- Polling strategy: 2s interval, 5-minute max wait, timeout emits `RuntimeFailure` with type `execution_timeout`

## Files

- `src/services/n8n-api-client.ts` (extend or create)
- `src/services/runtime-log-capture.ts`
- `src/services/credential-guard.ts`
- `src/services/brownfield-cloner.ts`
- `src/domain/models/runtime-result.ts`
- `config/credential-map.json`
- `test/unit/services/runtime-log-capture.spec.ts`
- `test/unit/services/credential-guard.spec.ts`

## Dev Notes

FR coverage: FR14, FR15, FR17, FR19
n8n API base: `https://n8n.5.223.42.54.sslip.io/api/v1/`
n8n API key: from `config/.env` — `N8N_API_KEY`
Test credential IDs (from n8n-mcp skill):
- Google test: `ekqEk9tYzLidPR2P`
- Google prod: `AyN7Ua2hilSBg1ac` ← must never appear in test deploy
Telegram test cred: `waOO7VpvhvgL81Ss`
Telegram Jarvis bot (prod): `swBScWJU4giImXvY` ← must never appear in test deploy

After test cycle completes, always DELETE the test-deployed workflow from n8n to keep the instance clean.

## Change Log

- 2026-03-21: Story authored — Ralph Loop epic.
