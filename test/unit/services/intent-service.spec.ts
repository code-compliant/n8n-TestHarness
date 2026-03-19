import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteIntakeRepository } from '../../../src/infra/persistence/sqlite/repositories/intake-repository';
import { IntentService } from '../../../src/services/intent-service';

describe('IntentService', () => {
  const createService = () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);
    const repository = new SQLiteIntakeRepository(db);
    return { db, service: new IntentService(repository) };
  };

  it('normalizes telegram payload and classifies new journey', () => {
    const { db, service } = createService();
    const output = service.capture({
      source: 'telegram',
      actor: 'operator-1',
      message: 'Please create a new workflow for invoicing',
      workflow_id: null,
    });

    assert.equal(output.journey, 'new');
    assert.equal(output.blocked, false);
    assert.equal(output.persistedRecord.actor, 'operator-1');
    assert.equal(output.persistedRecord.source, 'telegram');
    assert.equal(output.route, 'new');
    assert.ok(output.summary);
    db.close();
  });

  it('blocks low-confidence intake and emits clarification route', () => {
    const { db, service } = createService();
    const output = service.capture({
      source: 'api',
      actor: 'operator-2',
      message: '??',
    });

    assert.equal(output.blocked, true);
    assert.equal(output.route, 'clarification');
    db.close();
  });

  it('produces deterministic request id for identical normalized input', () => {
    const { db, service } = createService();
    const first = service.capture({
      source: 'telegram',
      actor: 'operator-3',
      text: 'repair workflow 123 after failure',
      workflow_identifier: 'wf-123',
    });
    const second = service.capture({
      source: 'telegram',
      actor: 'operator-3',
      text: 'repair workflow 123 after failure',
      workflow_identifier: 'wf-123',
    });

    assert.equal(first.request_id, second.request_id);
    assert.equal(first.journey, 'repair');
    db.close();
  });
});
