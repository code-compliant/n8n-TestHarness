import assert from 'node:assert';
import { describe, it } from 'node:test';

import { handleGenerateCandidate } from '../../../src/commands/candidate/generate';

describe('candidate:generate command', () => {
  it('generates candidate artifacts from request context', () => {
    const result = handleGenerateCandidate(
      {
        request_id: 'req_cmd',
        actor: 'operator-4',
        journey: 'new',
        workflow_identifier: 'wf-4',
        base_workflow: { nodes: [] },
        proposed_workflow: { nodes: [{ id: 'node-1', name: 'Start' }] },
      },
      { dbPath: ':memory:' },
    );

    assert.equal(result.status, 'pass');
    assert.equal(result.request_id, 'req_cmd');
    assert.ok(result.candidate_id.startsWith('candidate_'));
    assert.ok(result.diff.changes.length > 0);
  });
});
