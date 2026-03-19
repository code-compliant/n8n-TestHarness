import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { SQLiteAuditRepository } from '../../../src/infra/persistence/sqlite/repositories/audit-repository';
import { SQLiteCredentialRepository } from '../../../src/infra/persistence/sqlite/repositories/credential-repository';
import { SQLiteSetupRepository } from '../../../src/infra/persistence/sqlite/repositories/setup-repository';
import { AuditService } from '../../../src/services/audit-service';
import { SetupService } from '../../../src/services/setup-service';
import { createTestDatabase } from '../../support/sqlite-test-helper';

describe('SetupService (Story 6.2/6.3/6.4)', () => {
  const envKey = 'N8N_TEST_API_REF';
  const envValue = 'env:N8N_TEST_API_REF';

  beforeEach(() => {
    process.env[envKey] = envValue;
  });

  afterEach(() => {
    delete process.env[envKey];
  });

  it('triggers setup skill and records audit outcome', async () => {
    const db = createTestDatabase();
    const credentialRepo = new SQLiteCredentialRepository(db);
    const setupRepo = new SQLiteSetupRepository(db);
    const auditRepo = new SQLiteAuditRepository(db);
    const auditService = new AuditService(auditRepo);

    const setupService = new SetupService(
      credentialRepo,
      setupRepo,
      auditService,
      {
        seedFixtures: async () => ({ status: 'success' }),
      },
      {
        createCredential: async () => ({ status: 'success' }),
      },
      {
        run: async () => ({ status: 'success' }),
      },
      {
        stepsFor: () => ['Open n8n and create credential entry.'],
      },
    );

    const outcome = await setupService.runSetup({
      candidateId: 'candidate_123',
      environment: 'test',
      actor: 'operator',
      required: [{ credentialKey: 'api_key', referenceEnvVar: envKey }],
    });

    assert.equal(outcome.status, 'success');
    assert.ok(outcome.actionSequence.find((step) => step.action === 'seed_fixtures'));

    const binding = credentialRepo.findBinding('test', 'api_key');
    assert.ok(binding);
    assert.equal(binding?.reference, envValue);

    const audits = auditRepo.listForCandidate('candidate_123');
    assert.equal(audits.length, 1);
    assert.equal(audits[0]?.environment, 'test');
    assert.equal(audits[0]?.status, 'success');
  });

  it('falls back to manual guidance when setup and playwright fail', async () => {
    const db = createTestDatabase();
    const credentialRepo = new SQLiteCredentialRepository(db);
    const setupRepo = new SQLiteSetupRepository(db);
    const auditRepo = new SQLiteAuditRepository(db);
    const auditService = new AuditService(auditRepo);

    const setupService = new SetupService(
      credentialRepo,
      setupRepo,
      auditService,
      {
        seedFixtures: async () => ({ status: 'success' }),
      },
      {
        createCredential: async () => ({ status: 'failed' }),
      },
      {
        run: async () => ({ status: 'failed' }),
      },
      {
        stepsFor: () => ['Manual step A', 'Manual step B'],
      },
    );

    const outcome = await setupService.runSetup({
      candidateId: 'candidate_456',
      environment: 'test',
      actor: 'operator',
      required: [{ credentialKey: 'api_key', referenceEnvVar: envKey }],
    });

    assert.equal(outcome.status, 'manual_required');
    assert.deepEqual(outcome.manualGuidance, ['Manual step A', 'Manual step B']);
  });
});
