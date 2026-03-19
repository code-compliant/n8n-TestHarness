import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ensureValidationSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteFailureRepository } from '../../../src/infra/persistence/sqlite/repositories/failure-repository';
import { ValidationService } from '../../../src/services/validation-service';
import { CandidateDefinition } from '../../../src/domain/models/validation';

describe('Story 3.4 failure taxonomy persistence', () => {
  it('persists deterministic failure classification for promotion decisions', () => {
    const db = new Database(':memory:');
    ensureValidationSchema(db);
    const repository = new SQLiteFailureRepository(db);
    const service = new ValidationService(repository);

    const candidate: CandidateDefinition = {
      candidateId: 'candidate-failure',
      workflow: { nodes: [{ id: 'node-1' }] },
      triggerType: 'manual',
    };

    const fixturesPath = mkdtempSync(join(tmpdir(), 'fixtures-'));
    const fixtureFile = join(fixturesPath, `${candidate.candidateId}.json`);
    writeFileSync(
      fixtureFile,
      JSON.stringify({
        candidateId: candidate.candidateId,
        fixtures: [
          {
            fixtureId: 'fixture-bad',
            input: { payload: { value: 99 } },
            expectedOutputHash: 'mismatch-hash',
          },
        ],
      }),
    );

    const result = service.run(candidate, { fixturesPath });

    assert.equal(result.status, 'fail');
    const stored = repository.listByRunId(result.runId);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].failureClass, 'fixture_mismatch');
    assert.equal(stored[0].reproducibility, 'deterministic');
    assert.equal(stored[0].retryability, 'manual_review');
    db.close();
  });
});
