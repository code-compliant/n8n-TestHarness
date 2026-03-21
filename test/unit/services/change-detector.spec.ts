import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ChangeDetector } from '../../../src/services/change-detector';
import type { WorkflowDefinition } from '../../../src/services/n8n-api-client';

describe('ChangeDetector', () => {
  const detector = new ChangeDetector();

  it('detects no changes when workflows are identical', () => {
    const workflow: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Start', type: 'Trigger' }
      ],
      connections: {}
    };

    const result = detector.detectChanges(workflow, workflow);

    assert.equal(result.hasChanges, false);
    assert.equal(result.nodeChanges.length, 0);
    assert.equal(result.summary, 'No changes detected');
  });

  it('detects added nodes', () => {
    const previous: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Start', type: 'Trigger' }
      ],
      connections: {}
    };

    const current: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Start', type: 'Trigger' },
        { id: 'node2', name: 'Process', type: 'Function' }
      ],
      connections: {}
    };

    const result = detector.detectChanges(previous, current);

    assert.equal(result.hasChanges, true);
    assert.equal(result.nodeChanges.length, 1);
    assert.equal(result.nodeChanges[0].changeType, 'add');
    assert.equal(result.nodeChanges[0].nodeName, 'Process');
  });

  it('detects removed nodes', () => {
    const previous: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Start', type: 'Trigger' },
        { id: 'node2', name: 'Process', type: 'Function' }
      ],
      connections: {}
    };

    const current: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Start', type: 'Trigger' }
      ],
      connections: {}
    };

    const result = detector.detectChanges(previous, current);

    assert.equal(result.hasChanges, true);
    assert.equal(result.nodeChanges.length, 1);
    assert.equal(result.nodeChanges[0].changeType, 'remove');
    assert.equal(result.nodeChanges[0].nodeName, 'Process');
  });

  it('detects modified node parameters', () => {
    const previous: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'LLM',
          type: 'OpenAI',
          parameters: {
            prompt: 'Old prompt',
            model: 'gpt-4'
          }
        }
      ],
      connections: {}
    };

    const current: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          name: 'LLM',
          type: 'OpenAI',
          parameters: {
            prompt: 'New prompt',
            model: 'gpt-4'
          }
        }
      ],
      connections: {}
    };

    const result = detector.detectChanges(previous, current);

    assert.equal(result.hasChanges, true);
    assert.equal(result.nodeChanges.length, 1);
    assert.equal(result.nodeChanges[0].changeType, 'modify');
    assert.equal(result.nodeChanges[0].changes!.length, 1);
    assert.equal(result.nodeChanges[0].changes![0].path, 'parameters.prompt');
  });

  it('infers affected features from node names', () => {
    const previous: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [],
      connections: {}
    };

    const current: WorkflowDefinition = {
      name: 'Test Workflow',
      nodes: [
        { id: 'node1', name: 'Email Classifier', type: 'Function' },
        { id: 'node2', name: 'Calendar Event', type: 'GoogleCalendar' }
      ],
      connections: {}
    };

    const result = detector.detectChanges(previous, current);

    assert.ok(result.affectedFeatures.includes('email'));
    assert.ok(result.affectedFeatures.includes('calendar'));
  });
});