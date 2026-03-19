import assert from 'node:assert';
import { describe, it } from 'node:test';

import { executeDeterministicTest } from '../../../src/services/test-execution-service';
import { CandidateDefinition, FixtureDefinition } from '../../../src/domain/models/validation';

describe('Story 3.2 deterministic test execution', () => {
  it('uses synthetic triggers and test-safe substitutions deterministically', () => {
    const candidate: CandidateDefinition = {
      candidateId: 'candidate-synthetic',
      workflow: { nodes: [{ id: 'n1' }] },
      triggerType: 'webhook',
    };

    const fixture: FixtureDefinition = {
      fixtureId: 'fixture-1',
      input: {
        token: 'prod-token',
        environment: 'production',
        payload: { value: 5 },
      },
    };

    const first = executeDeterministicTest(candidate, fixture, { simulationMode: true });
    const second = executeDeterministicTest(candidate, fixture, { simulationMode: true });

    assert.ok(first.syntheticEvent);
    assert.equal(first.substitutedInput.token, 'TEST_REDACTED');
    assert.equal(first.substitutedInput.environment, 'test');
    assert.equal(first.outputHash, second.outputHash);
  });
});
