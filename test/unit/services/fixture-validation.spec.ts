import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ensureValidationSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteFailureRepository } from '../../../src/infra/persistence/sqlite/repositories/failure-repository';
import { ValidationService } from '../../../src/services/validation-service';
import { CandidateDefinition } from '../../../src/domain/models/validation';

describe('Story 3.1 fixture validation', () => {
  it('hard-fails when fixtures are missing', () => {
    const db = new Database(':memory:');
    ensureValidationSchema(db);
    const repository = new SQLiteFailureRepository(db);
    const service = new ValidationService(repository);

    const candidate: CandidateDefinition = {
      candidateId: 'candidate-missing',
      workflow: { nodes: [] },
      triggerType: 'webhook',
    };

    const fixturesPath = mkdtempSync(join(tmpdir(), 'fixtures-'));
    const result = service.run(candidate, { fixturesPath });

    assert.equal(result.status, 'fail');
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].failureClass, 'fixture_missing');
    db.close();
  });
});
