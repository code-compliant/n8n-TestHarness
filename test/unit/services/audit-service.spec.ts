import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureAuditSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteAuditRepository } from '../../../src/infra/persistence/sqlite/repositories/audit-repository';
import { AuditService } from '../../../src/services/audit-service';
import type { AuditEvent } from '../../../src/domain/models/audit';

describe('AuditService', () => {
  it('appends immutable audit events with traceability links', () => {
    const db = new Database(':memory:');
    ensureAuditSchema(db);
    const repository = new SQLiteAuditRepository(db);
    const service = new AuditService(repository);

    const first: AuditEvent = {
      id: 'event-1',
      eventType: 'candidate.state_changed',
      actor: 'operator-1',
      occurredAt: '2026-03-20T00:00:00Z',
      policyId: 'policy-1',
      candidateId: 'candidate-1',
      requestId: 'request-1',
      approverActionId: 'approval-1',
      inputArtifacts: ['artifact-1'],
      metadata: { from: 'testing', to: 'approved' },
    };

    const second: AuditEvent = {
      id: 'event-2',
      eventType: 'candidate.promoted',
      actor: 'operator-2',
      occurredAt: '2026-03-20T00:10:00Z',
      policyId: 'policy-2',
      candidateId: 'candidate-1',
      requestId: 'request-1',
      approverActionId: 'approval-2',
      inputArtifacts: ['artifact-2'],
      metadata: { promotion: 'test->prod' },
    };

    service.record(first);
    service.record(second);

    const events = service.listCandidateEvents('candidate-1');
    assert.equal(events.length, 2);
    assert.equal(events[0].id, 'event-1');
    assert.equal(events[1].id, 'event-2');
    assert.equal(events[0].approverActionId, 'approval-1');
    assert.equal(events[1].policyId, 'policy-2');
    db.close();
  });
});
