import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteCandidateRepository } from '../../../src/infra/persistence/sqlite/repositories/candidate-repository';
import { SQLiteIncidentRepository } from '../../../src/infra/persistence/sqlite/repositories/incident-repository';
import { SQLiteRecoveryOutcomeRepository } from '../../../src/infra/persistence/sqlite/repositories/recovery-outcome-repository';
import { SQLiteRepairEvidenceRepository } from '../../../src/infra/persistence/sqlite/repositories/repair-evidence-repository';
import { IncidentService } from '../../../src/services/incident-service';

const createService = () => {
  const db = new Database(':memory:');
  ensureCoreSchema(db);
  return {
    db,
    service: new IncidentService(
      new SQLiteIncidentRepository(db),
      new SQLiteCandidateRepository(db),
      new SQLiteRepairEvidenceRepository(db),
      new SQLiteRecoveryOutcomeRepository(db),
    ),
  };
};

describe('IncidentService', () => {
  it('captures incident context and creates repair request artifact', () => {
    const { db, service } = createService();
    const output = service.captureIncident({
      workflowId: 'wf-901',
      errorContext: { message: 'boom' },
      payload: { input: 'payload' },
      runSnapshot: { run: 'snapshot' },
    });

    assert.ok(output.incident.incident_id.startsWith('inc_'));
    assert.equal(output.incident.workflow_id, 'wf-901');
    assert.ok(output.repairRequest.request_id.startsWith('repair_req_'));
    assert.equal(output.repairRequest.incident_id, output.incident.incident_id);
    db.close();
  });

  it('creates repair candidate from incident and links evidence', () => {
    const { db, service } = createService();
    const captured = service.captureIncident({
      workflowId: 'wf-902',
      errorContext: { message: 'fail' },
      payload: { input: 'payload' },
      runSnapshot: { run: 'snapshot' },
    });

    const output = service.initiateRepairFromIncident(captured.incident.incident_id);

    assert.equal(output.candidate.candidate_type, 'repair');
    assert.equal(output.candidate.status, 'pending_validation');
    assert.equal(output.candidate.source_id, captured.incident.incident_id);
    assert.equal(output.evidence.incident_id, captured.incident.incident_id);
    assert.equal(output.evidence.candidate_id, output.candidate.candidate_id);
    db.close();
  });

  it('records recovery outcome with manual vs automated flag', () => {
    const { db, service } = createService();
    const captured = service.captureIncident({
      workflowId: 'wf-903',
      errorContext: { message: 'outage' },
      payload: { input: 'payload' },
      runSnapshot: { run: 'snapshot' },
    });

    const outcome = service.recordRecoveryOutcome({
      incidentId: captured.incident.incident_id,
      recoveryType: 'manual',
      summary: 'Operator patched workflow',
      fixtureSnapshot: { fixture: 'added' },
    });

    assert.equal(outcome.recovery_type, 'manual');
    assert.equal(outcome.incident_id, captured.incident.incident_id);
    assert.ok(outcome.fixture_snapshot.includes('fixture'));
    db.close();
  });
});
