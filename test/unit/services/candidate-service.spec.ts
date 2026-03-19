import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteCandidateRepository } from '../../../src/infra/persistence/sqlite/repositories/candidate-repository';
import { CandidateService } from '../../../src/services/candidate-service';

describe('CandidateService', () => {
  const createService = () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);
    const repository = new SQLiteCandidateRepository(db);
    return { db, service: new CandidateService(repository) };
  };

  it('generates deterministic candidate id for identical inputs', () => {
    const { db, service } = createService();
    const input = {
      request_id: 'req_123',
      actor: 'operator-1',
      journey: 'new' as const,
      workflow_identifier: 'wf-1',
      base_workflow: { nodes: [] },
      proposed_workflow: { nodes: [{ id: 'node-1', name: 'Start' }] },
    };

    const first = service.generateCandidate(input);
    const second = service.generateCandidate(input);

    assert.equal(first.candidate_id, second.candidate_id);
    db.close();
  });

  it('preserves placeholders during upgrade regeneration', () => {
    const { db, service } = createService();
    const base = {
      nodes: [
        {
          id: 'node-1',
          name: 'Webhook',
          parameters: {
            url: '{{WEBHOOK_URL}}',
          },
        },
      ],
    };
    const proposed = {
      nodes: [
        {
          id: 'node-1',
          name: 'Webhook',
          parameters: {
            url: 'https://example.com',
          },
        },
      ],
    };

    const output = service.generateCandidate({
      request_id: 'req_upgrade',
      actor: 'operator-2',
      journey: 'upgrade',
      workflow_identifier: 'wf-2',
      base_workflow: base,
      proposed_workflow: proposed,
    });

    const candidateWorkflow = JSON.parse(output.persistedRecord.candidate_workflow) as Record<string, unknown>;
    const url = (candidateWorkflow.nodes as Array<Record<string, unknown>>)[0].parameters as Record<string, unknown>;

    assert.equal(url.url, '{{WEBHOOK_URL}}');
    assert.ok(output.placeholders.length > 0);
    db.close();
  });

  it('packages diff with section traceability for node changes', () => {
    const { db, service } = createService();
    const base = {
      nodes: [
        {
          id: 'node-1',
          name: 'Processor',
          parameters: { timeout: 10 },
        },
      ],
    };
    const proposed = {
      nodes: [
        {
          id: 'node-1',
          name: 'Processor',
          parameters: { timeout: 20 },
        },
      ],
    };

    const output = service.generateCandidate({
      request_id: 'req_diff',
      actor: 'operator-3',
      journey: 'modify',
      workflow_identifier: 'wf-3',
      base_workflow: base,
      proposed_workflow: proposed,
    });

    assert.ok(output.diff.changes.length > 0);
    assert.equal(output.diff.section_changes.length, 1);
    assert.equal(output.diff.section_changes[0].section_id, 'node-1');
    db.close();
  });
});
