import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';

import { ensurePolicySchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLitePolicyDecisionRepository } from '../../../src/infra/persistence/sqlite/repositories/policy-decision-repository';
import { PolicyService } from '../../../src/services/policy-service';
import type { RiskClassification } from '../../../src/domain/models/policy';
import type { ValidationEvidence } from '../../../src/domain/models/validation';
import type { CredentialBindingState } from '../../../src/domain/models/credentials';

const baseClassification: RiskClassification = {
  id: 'risk-1',
  candidateId: 'candidate-1',
  decisionPeriodId: 'decision-1',
  riskBand: 'low',
  rationale: { factors: ['validation_passed'] },
  createdAt: '2026-03-20T00:00:00Z',
};

const baseEvidence: ValidationEvidence = {
  id: 'evidence-1',
  candidateId: 'candidate-1',
  status: 'pass',
  failures: [],
};

const baseCredential: CredentialBindingState = {
  candidateId: 'candidate-1',
  environment: 'test',
  status: 'safe',
};

describe('PolicyService', () => {
  it('auto-approves low-risk candidates with passing checks', () => {
    const db = new Database(':memory:');
    ensurePolicySchema(db);
    const repository = new SQLitePolicyDecisionRepository(db);
    const service = new PolicyService(repository);

    const result = service.evaluate({
      candidateId: 'candidate-1',
      evidence: baseEvidence,
      credentialState: baseCredential,
      classification: baseClassification,
      policyVersion: 'v1',
      evaluatedAt: '2026-03-20T00:00:00Z',
    });

    assert.equal(result.decision.decision, 'auto_approved');
    assert.equal(result.nextState, 'approved');
    db.close();
  });

  it('routes medium/high risk candidates to operator review', () => {
    const db = new Database(':memory:');
    ensurePolicySchema(db);
    const repository = new SQLitePolicyDecisionRepository(db);
    const service = new PolicyService(repository);

    const result = service.evaluate({
      candidateId: 'candidate-2',
      evidence: { ...baseEvidence, candidateId: 'candidate-2' },
      credentialState: { ...baseCredential, candidateId: 'candidate-2' },
      classification: { ...baseClassification, candidateId: 'candidate-2', riskBand: 'medium' },
      policyVersion: 'v1',
      evaluatedAt: '2026-03-20T00:10:00Z',
    });

    assert.equal(result.decision.decision, 'operator_review');
    assert.equal(result.nextState, 'operator_review');
    db.close();
  });

  it('blocks promotion when checks fail', () => {
    const db = new Database(':memory:');
    ensurePolicySchema(db);
    const repository = new SQLitePolicyDecisionRepository(db);
    const service = new PolicyService(repository);

    const result = service.evaluate({
      candidateId: 'candidate-3',
      evidence: { ...baseEvidence, candidateId: 'candidate-3', status: 'fail' },
      credentialState: { ...baseCredential, candidateId: 'candidate-3', status: 'unsafe' },
      classification: { ...baseClassification, candidateId: 'candidate-3', riskBand: 'high' },
      policyVersion: 'v1',
      evaluatedAt: '2026-03-20T00:20:00Z',
    });

    assert.equal(result.decision.decision, 'blocked');
    assert.equal(result.nextState, 'blocked');
    db.close();
  });
});
