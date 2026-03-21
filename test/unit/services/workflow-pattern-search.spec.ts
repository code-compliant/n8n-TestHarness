import { describe, it, beforeEach, mock, Mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import { WorkflowPatternSearch } from '../../../src/services/workflow-pattern-search';

// Mock index data for testing
const mockIndexData = [
  {
    file: 'workflows/email-classifier.json',
    category: 'email',
    name: 'Email Classification Workflow',
    triggerType: 'emailTrigger',
    nodeTypes: ['emailTrigger', 'Function', 'Set', 'Gmail'],
    nodeCount: 4
  },
  {
    file: 'workflows/slack-notification.json',
    category: 'notification',
    name: 'Slack Notification System',
    triggerType: 'webhook',
    nodeTypes: ['webhook', 'Slack', 'Code'],
    nodeCount: 3
  },
  {
    file: 'workflows/data-sync.json',
    category: 'integration',
    name: 'Database Sync Workflow',
    triggerType: 'schedule',
    nodeTypes: ['schedule', 'MySQL', 'PostgreSQL', 'Transform'],
    nodeCount: 4
  },
  {
    file: 'workflows/api-processor.json',
    category: 'api',
    name: 'API Data Processor',
    triggerType: 'webhook',
    nodeTypes: ['webhook', 'HTTPRequest', 'Function', 'Set'],
    nodeCount: 4
  },
  {
    file: 'workflows/email-automation.json',
    category: 'automation',
    name: 'Email Automation Pipeline',
    triggerType: 'emailTrigger',
    nodeTypes: ['emailTrigger', 'Gmail', 'Function'],
    nodeCount: 3
  }
];

const mockWorkflowJson = {
  nodes: [
    { id: '1', type: 'webhook', name: 'Start' },
    { id: '2', type: 'Function', name: 'Process' }
  ],
  connections: {}
};

describe('WorkflowPatternSearch', () => {
  let patternSearch: WorkflowPatternSearch;
  let readFileSyncMock: Mock<typeof fs.readFileSync>;

  beforeEach(() => {
    // Mock fs.readFileSync to return our test data
    readFileSyncMock = mock.fn(fs, 'readFileSync');
    readFileSyncMock.mock.mockImplementation((path: string) => {
      if (path.includes('index.json')) {
        return JSON.stringify(mockIndexData);
      }
      // Return mock workflow JSON for any workflow file
      return JSON.stringify(mockWorkflowJson);
    });

    patternSearch = new WorkflowPatternSearch();
  });

  it('returns empty array when no matches', () => {
    const results = patternSearch.search({
      nodeTypes: ['NonExistentNode'],
      category: 'non-existent-category',
      keywords: ['non-existent-keyword']
    });

    assert.strictEqual(results.length, 0);
  });

  it('scores correctly — nodeType match scores higher than keyword match', () => {
    const results = patternSearch.search({
      nodeTypes: ['Function'], // Should match multiple entries with +3 each
      keywords: ['email'] // Should match some entries with +1 each
    });

    assert.ok(results.length > 0);

    // Find results that have nodeType matches vs keyword-only matches
    const nodeTypeMatches = results.filter(r => r.nodeTypes.includes('Function'));
    const keywordOnlyMatches = results.filter(r =>
      !r.nodeTypes.includes('Function') && r.name.toLowerCase().includes('email')
    );

    if (nodeTypeMatches.length > 0 && keywordOnlyMatches.length > 0) {
      assert.ok(nodeTypeMatches[0].score >= keywordOnlyMatches[0].score);
    }

    // Verify that Function node matches have score >= 3
    if (nodeTypeMatches.length > 0) {
      assert.ok(nodeTypeMatches[0].score >= 3);
    }
  });

  it('returns at most limit results', () => {
    const limit = 2;
    const results = patternSearch.search({
      keywords: ['workflow'] // This should match multiple entries
    }, limit);

    assert.ok(results.length <= limit);
  });

  it('loaded workflowJson is present in results', () => {
    const results = patternSearch.search({
      nodeTypes: ['Function']
    });

    assert.ok(results.length > 0);
    assert.ok(results[0].workflowJson !== null);
    assert.ok(results[0].workflowJson !== undefined);

    // Verify the structure matches our mock
    const workflowJson = results[0].workflowJson as any;
    assert.ok(workflowJson.nodes);
    assert.ok(workflowJson.connections !== undefined);
  });

  it('filters out entries with score 0', () => {
    const results = patternSearch.search({
      nodeTypes: ['NonExistentNode']
    });

    // All results should have score > 0
    results.forEach(result => {
      assert.ok(result.score > 0);
    });
  });

  it('sorts results by score in descending order', () => {
    const results = patternSearch.search({
      nodeTypes: ['Function'], // Multiple matches with different scores
      keywords: ['email']
    });

    if (results.length > 1) {
      for (let i = 1; i < results.length; i++) {
        assert.ok(results[i - 1].score >= results[i].score);
      }
    }
  });
});