import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SemanticQualityAssessor } from '../../../src/services/semantic-quality-assessor';
import type { RequirementSpec } from '../../../src/domain/models/requirement-spec';
import type { RuntimeResult } from '../../../src/domain/models/runtime-result';

describe('SemanticQualityAssessor', () => {
  const assessor = new SemanticQualityAssessor();

  it('evaluates static assertions without runtime results', async () => {
    const contract: RequirementSpec = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      features: ['core'],
      source: 'authored',
      createdAt: '2026-03-21T10:00:00Z',
      assertions: [{
        id: 'error-handler-check',
        feature: 'core',
        type: 'error_handler_check',
        target: 'error_handler',
        spec: { workflowId: 'RumKLiLA2onXkppj' }
      }]
    };

    const workflowDefinition = {
      name: 'Test Workflow',
      nodes: [],
      connections: {},
      settings: { errorWorkflow: 'RumKLiLA2onXkppj' }
    };

    const result = await assessor.assess({
      contract,
      workflowDefinition
    });

    assert.equal(result.assertions.length, 1);
    assert.equal(result.assertions[0].status, 'PASS');
    assert.equal(result.overallStatus, 'PASS');
  });

  it('evaluates runtime assertions with runtime results', async () => {
    const contract: RequirementSpec = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      features: ['classify'],
      source: 'authored',
      createdAt: '2026-03-21T10:00:00Z',
      assertions: [{
        id: 'classification-check',
        feature: 'classify',
        type: 'classification_check',
        target: 'classifier',
        spec: { allowedValues: ['urgent', 'routine', 'ignore'] }
      }]
    };

    const workflowDefinition = {
      name: 'Test Workflow',
      nodes: [],
      connections: {}
    };

    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'classifier',
        nodeName: 'classifier',
        output: 'urgent'
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z',
      completedAt: '2026-03-21T10:00:05Z'
    };

    const result = await assessor.assess({
      contract,
      workflowDefinition,
      runtimeResult
    });

    assert.equal(result.assertions.length, 1);
    assert.equal(result.assertions[0].status, 'PASS');
    assert.equal(result.overallStatus, 'PASS');
  });

  it('fails assessment when assertions fail', async () => {
    const contract: RequirementSpec = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      features: ['classify'],
      source: 'authored',
      createdAt: '2026-03-21T10:00:00Z',
      assertions: [{
        id: 'classification-check',
        feature: 'classify',
        type: 'classification_check',
        target: 'classifier',
        spec: { allowedValues: ['urgent', 'routine', 'ignore'] }
      }]
    };

    const workflowDefinition = {
      name: 'Test Workflow',
      nodes: [],
      connections: {}
    };

    const runtimeResult: RuntimeResult = {
      executionId: 'exec-123',
      status: 'success',
      nodeResults: [{
        nodeId: 'classifier',
        nodeName: 'classifier',
        output: 'invalid-value' // Not in allowed values
      }],
      errors: [],
      startedAt: '2026-03-21T10:00:00Z',
      completedAt: '2026-03-21T10:00:05Z'
    };

    const result = await assessor.assess({
      contract,
      workflowDefinition,
      runtimeResult
    });

    assert.equal(result.assertions.length, 1);
    assert.equal(result.assertions[0].status, 'FAIL');
    assert.equal(result.overallStatus, 'FAIL');
  });

  it('handles missing runtime results for runtime assertions', async () => {
    const contract: RequirementSpec = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      features: ['classify'],
      source: 'authored',
      createdAt: '2026-03-21T10:00:00Z',
      assertions: [{
        id: 'classification-check',
        feature: 'classify',
        type: 'classification_check',
        target: 'classifier',
        spec: { allowedValues: ['urgent', 'routine', 'ignore'] }
      }]
    };

    const workflowDefinition = {
      name: 'Test Workflow',
      nodes: [],
      connections: {}
    };

    const result = await assessor.assess({
      contract,
      workflowDefinition
      // No runtimeResult provided
    });

    assert.equal(result.assertions.length, 1);
    assert.equal(result.assertions[0].status, 'FAIL');
    assert.ok(result.assertions[0].message.includes('Runtime result required'));
  });
});