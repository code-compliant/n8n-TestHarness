import assert from 'node:assert';
import { describe, it } from 'node:test';
import { FixDeltaBuilder } from '../../../src/services/fix-delta-builder';
import type { AssessmentResult } from '../../../src/domain/models/assessment-result';
import type { RuntimeResult } from '../../../src/domain/models/runtime-result';

describe('FixDeltaBuilder', () => {
  const builder = new FixDeltaBuilder();

  it('builds fix delta from failed assertions', () => {
    const assessmentResult: AssessmentResult = {
      passCount: 1,
      failCount: 2,
      warnCount: 0,
      overallStatus: 'FAIL',
      evaluatedAt: '2026-03-21T10:00:00Z',
      assertions: [
        {
          assertion: {
            id: 'classification-check',
            feature: 'classify',
            type: 'classification_check',
            target: 'classifier',
            spec: { allowedValues: ['urgent', 'routine'] }
          },
          status: 'FAIL',
          actual: 'invalid',
          expected: ['urgent', 'routine'],
          message: 'Output not in allowed set',
          evaluatedAt: '2026-03-21T10:00:00Z'
        },
        {
          assertion: {
            id: 'error-handler-check',
            feature: 'core',
            type: 'error_handler_check',
            target: 'error_handler',
            spec: { workflowId: 'RumKLiLA2onXkppj' }
          },
          status: 'PASS',
          message: 'Error handler configured correctly',
          evaluatedAt: '2026-03-21T10:00:00Z'
        }
      ]
    };

    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'failed',
      nodeResults: [],
      errors: [{
        nodeId: 'node1',
        nodeName: 'Failed Node',
        errorMessage: 'Connection timeout',
        errorType: 'NetworkError',
        executionId: 'exec-123'
      }],
      startedAt: '2026-03-21T10:00:00Z'
    };

    const fixDelta = builder.buildFixDelta(2, assessmentResult, runtimeResult);

    assert.equal(fixDelta.iterationNumber, 2);
    assert.equal(fixDelta.failedAssertions.length, 1);
    assert.equal(fixDelta.runtimeErrors.length, 1);

    // Check failed assertion details
    assert.equal(fixDelta.failedAssertions[0].assertionType, 'classification_check');
    assert.equal(fixDelta.failedAssertions[0].target, 'classifier');
    assert.ok(fixDelta.failedAssertions[0].suggestedFix.includes('classification logic'));

    // Check generator prompt includes both failures
    assert.ok(fixDelta.generatorPrompt.includes('ASSERTION FAILURES'));
    assert.ok(fixDelta.generatorPrompt.includes('RUNTIME ERRORS'));
    assert.ok(fixDelta.generatorPrompt.includes('classification_check'));
    assert.ok(fixDelta.generatorPrompt.includes('NetworkError'));
  });

  it('handles assessment with no runtime result', () => {
    const assessmentResult: AssessmentResult = {
      passCount: 0,
      failCount: 1,
      warnCount: 0,
      overallStatus: 'FAIL',
      evaluatedAt: '2026-03-21T10:00:00Z',
      assertions: [{
        assertion: {
          id: 'error-handler-check',
          feature: 'core',
          type: 'error_handler_check',
          target: 'error_handler',
          spec: { workflowId: 'RumKLiLA2onXkppj' }
        },
        status: 'FAIL',
        message: 'Error handler not configured',
        evaluatedAt: '2026-03-21T10:00:00Z'
      }]
    };

    const fixDelta = builder.buildFixDelta(1, assessmentResult);

    assert.equal(fixDelta.runtimeErrors.length, 0);
    assert.equal(fixDelta.failedAssertions.length, 1);
    assert.ok(fixDelta.generatorPrompt.includes('error handler workflow'));
  });

  it('generates specific fix suggestions for different assertion types', () => {
    const testCases = [
      {
        type: 'classification_check',
        expected: 'classification logic'
      },
      {
        type: 'perspective_check',
        expected: 'consultant\'s perspective'
      },
      {
        type: 'context_injection_audit',
        expected: 'role context tokens'
      },
      {
        type: 'schema_match',
        expected: 'required fields'
      }
    ];

    testCases.forEach(testCase => {
      const assessmentResult: AssessmentResult = {
        passCount: 0,
        failCount: 1,
        warnCount: 0,
        overallStatus: 'FAIL',
        evaluatedAt: '2026-03-21T10:00:00Z',
        assertions: [{
          assertion: {
            id: 'test',
            feature: 'test',
            type: testCase.type as any,
            target: 'test_node',
            spec: {}
          },
          status: 'FAIL',
          message: 'Test failure',
          evaluatedAt: '2026-03-21T10:00:00Z'
        }]
      };

      const fixDelta = builder.buildFixDelta(1, assessmentResult);
      const suggestedFix = fixDelta.failedAssertions[0].suggestedFix.toLowerCase();

      assert.ok(
        suggestedFix.includes(testCase.expected.toLowerCase()),
        `Expected "${testCase.expected}" in fix for ${testCase.type}, got: ${suggestedFix}`
      );
    });
  });
});