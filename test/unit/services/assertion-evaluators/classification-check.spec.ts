import assert from 'node:assert';
import { describe, it } from 'node:test';
import { evaluateClassificationCheck } from '../../../../src/services/assertion-evaluators/classification-check';
import type { SpecAssertion } from '../../../../src/domain/models/requirement-spec';
import type { RuntimeResult } from '../../../../src/domain/models/runtime-result';

describe('Classification Check Evaluator', () => {
  const assertion: SpecAssertion = {
    id: 'test-classification',
    feature: 'classify',
    type: 'classification_check',
    target: 'classifier',
    spec: { allowedValues: ['urgent', 'routine', 'ignore'] }
  };

  it('passes when output value is in allowed set', () => {
    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'classifier',
        nodeName: 'classifier',
        output: 'urgent'
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const result = evaluateClassificationCheck(assertion, runtimeResult);

    assert.equal(result.status, 'PASS');
    assert.equal(result.actual, 'urgent');
  });

  it('fails when output value is not in allowed set', () => {
    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'classifier',
        nodeName: 'classifier',
        output: 'invalid-value'
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const result = evaluateClassificationCheck(assertion, runtimeResult);

    assert.equal(result.status, 'FAIL');
    assert.equal(result.actual, 'invalid-value');
    assert.ok(result.message.includes('not in allowed set'));
  });

  it('extracts classification from object output', () => {
    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'classifier',
        nodeName: 'classifier',
        output: { classification: 'routine', confidence: 0.8 }
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const result = evaluateClassificationCheck(assertion, runtimeResult);

    assert.equal(result.status, 'PASS');
    assert.equal(result.actual, 'routine');
  });

  it('fails when target node not found', () => {
    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'other-node',
        nodeName: 'other-node',
        output: 'urgent'
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const result = evaluateClassificationCheck(assertion, runtimeResult);

    assert.equal(result.status, 'FAIL');
    assert.ok(result.message.includes('not found in runtime results'));
  });
});