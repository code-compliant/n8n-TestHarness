import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SQLiteCredentialRepository } from '../../../src/infra/persistence/sqlite/repositories/credential-repository';
import { CredentialService } from '../../../src/services/credential-service';
import { createTestDatabase } from '../../support/sqlite-test-helper';

describe('CredentialService (Story 6.1)', () => {
  it('blocks execution when bindings are missing or invalid', () => {
    const db = createTestDatabase();
    const repository = new SQLiteCredentialRepository(db);
    const service = new CredentialService(repository);

    const now = new Date().toISOString();
    repository.upsertBinding({
      environment: 'test',
      credentialKey: 'api_key',
      reference: 'bad-reference',
      rollbackReference: null,
      createdAt: now,
      updatedAt: now,
    });

    const result = service.validateBindings('test', [
      { credentialKey: 'api_key', referenceEnvVar: 'N8N_TEST_API_REF' },
      { credentialKey: 'slack_token', referenceEnvVar: 'N8N_TEST_SLACK_REF' },
    ]);

    assert.equal(result.status, 'blocked');
    assert.deepEqual(result.missing, ['slack_token']);
    assert.deepEqual(result.invalid, ['api_key']);
    assert.match(result.remediation, /missing bindings/i);
  });
});
