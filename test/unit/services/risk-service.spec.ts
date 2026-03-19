import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensurePolicySchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteRiskRepository } from '../../../src/infra/persistence/sqlite/repositories/risk-repository';
import { RiskService } from '../../../src/services/risk-service';
import type { ValidationEvidence } from '../../../src/domain/models/validation';
import type { CredentialBindingState } from '../../../src/domain/models/credentials';

const createEvidence = (overrides: Partial<ValidationEvidence> = {}): ValidationEvidence => ({
  id: 'evidence-1',
  candidateId: 'candidate-1',
  status: 'pass',
  failures: [],
  ...overrides,
});

const createCredentialState = (overrides: Partial<CredentialBindingState> = {}): CredentialBindingState => ({
  candidateId: 'candidate-1',
  environment: 'test',
  status: 'safe',
  ...overrides,
});

describe('RiskService', () => {
  it('classifies low-risk candidate and keeps classification immutable per decision period', () => {
    const db = new Database(':memory:');
    ensurePolicySchema(db);
    const repository = new SQLiteRiskRepository(db);
    const service = new RiskService(repository);

    const decisionPeriodId = 'decision-1';
    const first = service.classify({
      candidateId: 'candidate-1',
      decisionPeriodId,
      evidence: createEvidence(),
      credentialState: createCredentialState(),
      evaluatedAt: '2026-03-20T00:00:00Z',
    });

    const second = service.classify({
      candidateId: 'candidate-1',
      decisionPeriodId,
      evidence: createEvidence({
        status: 'fail',
        failures: [
          {
            id: 'f-1',
            message: 'critical failure',
            class: 'critical',
            reproducibility: 'always',
            retryability: 'non_retryable',
          },
        ],
      }),
      credentialState: createCredentialState({ status: 'unsafe' }),
      evaluatedAt: '2026-03-20T00:10:00Z',
    });

    assert.equal(first.riskBand, 'low');
    assert.equal(second.id, first.id);
    assert.equal(second.riskBand, 'low');
    db.close();
  });

  it('classifies high risk when critical or unsafe credential state exists', () => {
    const db = new Database(':memory:');
    ensurePolicySchema(db);
    const repository = new SQLiteRiskRepository(db);
    const service = new RiskService(repository);

    const result = service.classify({
      candidateId: 'candidate-2',
      evidence: createEvidence({
        status: 'fail',
        failures: [
          {
            id: 'f-2',
            message: 'critical',
            class: 'critical',
            reproducibility: 'always',
            retryability: 'non_retryable',
          },
        ],
      }),
      credentialState: createCredentialState({ status: 'unsafe', candidateId: 'candidate-2' }),
      evaluatedAt: '2026-03-20T01:00:00Z',
    });

    assert.equal(result.riskBand, 'high');
    assert.ok(result.rationale.factors.includes('critical_validation_failures'));
    db.close();
  });
});
