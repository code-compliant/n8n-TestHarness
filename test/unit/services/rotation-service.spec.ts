import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SQLiteCredentialRepository } from '../../../src/infra/persistence/sqlite/repositories/credential-repository';
import { SQLiteRotationRepository } from '../../../src/infra/persistence/sqlite/repositories/rotation-repository';
import { RotationService } from '../../../src/services/rotation-service';
import { createTestDatabase } from '../../support/sqlite-test-helper';

describe('RotationService (Story 6.5)', () => {
  it('swaps references safely and preserves rollback reference', () => {
    const db = createTestDatabase();
    const credentialRepo = new SQLiteCredentialRepository(db);
    const rotationRepo = new SQLiteRotationRepository(db);
    const rotationService = new RotationService(credentialRepo, rotationRepo);

    const now = new Date().toISOString();
    credentialRepo.upsertBinding({
      environment: 'test',
      credentialKey: 'api_key',
      reference: 'env:N8N_TEST_API_REF',
      rollbackReference: null,
      createdAt: now,
      updatedAt: now,
    });
    credentialRepo.upsertBinding({
      environment: 'production',
      credentialKey: 'api_key',
      reference: 'env:N8N_PROD_API_REF',
      rollbackReference: null,
      createdAt: now,
      updatedAt: now,
    });

    const outcome = rotationService.rotateReference({
      candidateId: 'candidate_rot',
      actor: 'operator',
      fromEnvironment: 'test',
      toEnvironment: 'production',
      credentialKey: 'api_key',
    });

    assert.equal(outcome.newReference, 'env:N8N_TEST_API_REF');
    assert.equal(outcome.rollbackReference, 'env:N8N_PROD_API_REF');

    const updated = credentialRepo.findBinding('production', 'api_key');
    assert.equal(updated?.reference, 'env:N8N_TEST_API_REF');
    assert.equal(updated?.rollbackReference, 'env:N8N_PROD_API_REF');
  });

  it('rejects rotation when references are invalid', () => {
    const db = createTestDatabase();
    const credentialRepo = new SQLiteCredentialRepository(db);
    const rotationRepo = new SQLiteRotationRepository(db);
    const rotationService = new RotationService(credentialRepo, rotationRepo);

    const now = new Date().toISOString();
    credentialRepo.upsertBinding({
      environment: 'test',
      credentialKey: 'api_key',
      reference: 'not-a-reference',
      rollbackReference: null,
      createdAt: now,
      updatedAt: now,
    });
    credentialRepo.upsertBinding({
      environment: 'production',
      credentialKey: 'api_key',
      reference: 'env:N8N_PROD_API_REF',
      rollbackReference: null,
      createdAt: now,
      updatedAt: now,
    });

    assert.throws(() =>
      rotationService.rotateReference({
        candidateId: 'candidate_rot',
        actor: 'operator',
        fromEnvironment: 'test',
        toEnvironment: 'production',
        credentialKey: 'api_key',
      }),
    );
  });
});
