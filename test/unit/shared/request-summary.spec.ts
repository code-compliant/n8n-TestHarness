import assert from 'node:assert';
import { describe, it } from 'node:test';

import { buildRequestSummary } from '../../../src/shared/telemetry/request-summary';
import { createDeterministicRequestId, normalizeIntakePayload } from '../../../src/shared/schemas/intake-schema';

describe('Request summary contract', () => {
  it('builds a concise pre-execution summary before downstream actions', () => {
    const normalized = normalizeIntakePayload({
      source: 'telegram',
      actor: 'operator',
      text: 'Can you test the upgrade for workflow wf-9?',
      workflow_identifier: 'wf-9',
    });
    const requestId = createDeterministicRequestId(normalized);
    const classified = {
      journey: 'test' as const,
      confidence: 0.7,
      reason: 'matched test',
      matchedSignals: ['test'],
    };
    const summary = buildRequestSummary(requestId, normalized, classified);

    assert.equal(summary.request_id, requestId);
    assert.equal(summary.journey, 'test');
    assert.equal(summary.targets.includes('workflow:wf-9'), true);
    assert.equal(summary.blocked, false);
  });
});
