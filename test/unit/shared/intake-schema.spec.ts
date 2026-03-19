import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  classifyJourney,
  createDeterministicRequestId,
  normalizeIntakePayload,
} from '../../../src/shared/schemas/intake-schema';

describe('Intake schema', () => {
  it('classifies journey deterministically and strips secrets from raw payload', () => {
    const normalized = normalizeIntakePayload({
      source: 'telegram',
      actor: 'operator-a',
      text: 'repair workflow alpha after incident',
      token: 'super-secret',
      failure_payload: { error: 'timeout' },
    });

    const classification = classifyJourney(normalized);
    const requestId = createDeterministicRequestId(normalized);

    assert.equal(classification.journey, 'repair');
    assert.equal(requestId.startsWith('req_'), true);
    assert.equal(normalized.rawPayload.includes('super-secret'), false);
    assert.equal(normalized.rawPayload.includes('[redacted]'), true);
  });
});
