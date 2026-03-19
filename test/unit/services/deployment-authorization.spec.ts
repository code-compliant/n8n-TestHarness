import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteCandidateRepository } from '../../../src/infra/persistence/sqlite/repositories/candidate-repository';
import { SQLiteDeploymentRepository } from '../../../src/infra/persistence/sqlite/repositories/deployment-repository';
import { AuthorizationService } from '../../../src/services/authorization-service';
import { CandidateLifecycleService } from '../../../src/services/candidate-lifecycle-service';
import { ArtifactService } from '../../../src/services/artifact-service';

describe('Deployment authorization controls', () => {
  it('denies unauthorized roles and logs attempts', () => {
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
    });

    const result = lifecycle.recordDeploymentAttempt({
      candidateId: candidate.candidate_id,
      action: 'rollback',
      actor: 'ops-1',
      actorRole: 'operator',
      reason: 'attempting rollback without approval',
    });

    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('not permitted'));

    const attempts = deploymentRepository.listAttempts(candidate.candidate_id);
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].allowed, false);
    assert.equal(attempts[0].action, 'rollback');

    db.close();
  });
});
