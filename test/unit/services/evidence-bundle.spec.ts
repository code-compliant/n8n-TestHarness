import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ensureValidationSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteFailureRepository } from '../../../src/infra/persistence/sqlite/repositories/failure-repository';
import { ValidationService } from '../../../src/services/validation-service';
import { executeDeterministicTest } from '../../../src/services/test-execution-service';
import { CandidateDefinition, FixtureDefinition } from '../../../src/domain/models/validation';

describe('Story 3.3 evidence bundle', () => {
  it('emits reproducible evidence and rerun artifacts', () => {
    const db = new Database(':memory:');
    ensureValidationSchema(db);
    const repository = new SQLiteFailureRepository(db);
    const service = new ValidationService(repository);

    const candidate: CandidateDefinition = {
      candidateId: 'candidate-evidence',
      workflow: { nodes: [{ id: 'node-1' }] },
      triggerType: 'manual',
    };

    const fixture: FixtureDefinition = {
      fixtureId: 'fixture-evidence',
      input: { payload: { value: 10 } },
    };

    const expected = executeDeterministicTest(candidate, fixture, { simulationMode: false });
    const fixturesPath = mkdtempSync(join(tmpdir(), 'fixtures-'));
    const fixtureFile = join(fixturesPath, `${candidate.candidateId}.json`);
    writeFileSync(
      fixtureFile,
      JSON.stringify({
        candidateId: candidate.candidateId,
        fixtures: [
          {
            ...fixture,
            expectedOutputHash: expected.outputHash,
          },
        ],
      }),
    );

    const first = service.run(candidate, { fixturesPath });
    const second = service.run(candidate, { fixturesPath });

    assert.equal(first.status, 'pass');
    assert.equal(first.evidence.runId, second.evidence.runId);
    assert.ok(first.evidence.rerun.script.includes(candidate.candidateId));
    assert.ok(first.evidence.inputDiffMap[fixture.fixtureId]);
    assert.equal(first.evidence.rerun.checksum, second.evidence.rerun.checksum);
    db.close();
  });
});
