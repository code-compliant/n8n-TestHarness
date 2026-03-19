import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteCandidateRepository } from '../../../src/infra/persistence/sqlite/repositories/candidate-repository';
import { SQLiteDeploymentRepository } from '../../../src/infra/persistence/sqlite/repositories/deployment-repository';
import { ArtifactService } from '../../../src/services/artifact-service';
import { AuthorizationService } from '../../../src/services/authorization-service';
import { CandidateLifecycleService } from '../../../src/services/candidate-lifecycle-service';

describe('Controlled rollback to known-good revision', () => {
  it('restores designated revision and records immutable transition', () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const candidateRepository = new SQLiteCandidateRepository(db);
    const deploymentRepository = new SQLiteDeploymentRepository(db);
    const artifactService = new ArtifactService({ basePath: '/tmp' });
    const authorizationService = new AuthorizationService(deploymentRepository);
    const lifecycle = new CandidateLifecycleService(candidateRepository, artifactService, authorizationService);

    const candidate = lifecycle.createCandidate({
      actor: 'lead',
      initialRevision: 'rev-1',
      knownGoodRevision: 'rev-1',
    });

    lifecycle.transitionCandidate({
      candidateId: candidate.candidate_id,
      nextState: 'deployed',
      actor: 'approver-1',
      reason: 'promoted after approval',
      currentRevision: 'rev-2',
      evidenceRefs: ['evidence:deploy'],
    });

    const rollback = lifecycle.rollbackToKnownGood({
      candidateId: candidate.candidate_id,
      actor: 'approver-1',
      actorRole: 'approver',
      targetRevision: 'rev-1',
      reason: 'rollback after incident',
    });

    assert.equal(rollback.allowed, true);
    assert.equal(rollback.candidate.current_revision, 'rev-1');
    assert.equal(rollback.candidate.current_state, 'rolled_back');
    assert.ok(rollback.transition);

    const transitions = candidateRepository.listTransitions(candidate.candidate_id);
    assert.equal(transitions[transitions.length - 1].to_state, 'rolled_back');

    db.close();
  });
});
