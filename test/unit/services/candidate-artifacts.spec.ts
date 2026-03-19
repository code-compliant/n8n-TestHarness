import assert from 'node:assert';
import { describe, it } from 'node:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteCandidateRepository } from '../../../src/infra/persistence/sqlite/repositories/candidate-repository';
import { SQLiteDeploymentRepository } from '../../../src/infra/persistence/sqlite/repositories/deployment-repository';
import { ArtifactService } from '../../../src/services/artifact-service';
import { AuthorizationService } from '../../../src/services/authorization-service';
import { CandidateLifecycleService } from '../../../src/services/candidate-lifecycle-service';

describe('Candidate lifecycle artifacts', () => {
  it('publishes timeline and evidence refs to repository artifacts', () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const candidateRepository = new SQLiteCandidateRepository(db);
    const deploymentRepository = new SQLiteDeploymentRepository(db);
    const artifactBase = mkdtempSync(join(tmpdir(), 'artifacts-'));
    const artifactService = new ArtifactService({ basePath: artifactBase });
    const authorizationService = new AuthorizationService(deploymentRepository);
    const service = new CandidateLifecycleService(candidateRepository, artifactService, authorizationService);

    const candidate = service.createCandidate({
      actor: 'lead-operator',
      initialRevision: 'rev-1',
      reason: 'initial candidate',
    });

    service.transitionCandidate({
      candidateId: candidate.candidate_id,
      nextState: 'testing',
      actor: 'runner-1',
      reason: 'execute deterministic tests',
      evidenceRefs: ['evidence:test-run-1'],
    });

    const artifactPath = artifactService.resolveArtifactPath(candidate.candidate_id);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as {
      current_state: string;
      timeline: Array<{ evidence_refs: string[] }>;
      evidence_refs: string[];
    };

    assert.equal(artifact.current_state, 'testing');
    assert.equal(artifact.timeline.length, 2);
    assert.ok(artifact.evidence_refs.includes('evidence:test-run-1'));

    db.close();
  });
});
