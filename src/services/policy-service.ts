import type { CredentialBindingState } from '../domain/models/credentials';
import type { RiskClassification, PolicyDecision, PolicyDecisionType } from '../domain/models/policy';
import type { ValidationEvidence } from '../domain/models/validation';
import { deterministicId } from '../shared/util/ids';

export interface PolicyRepository {
  saveDecision(decision: PolicyDecision): PolicyDecision;
}

export interface PolicyEvaluationInput {
  candidateId: string;
  evidence: ValidationEvidence;
  credentialState: CredentialBindingState;
  classification: RiskClassification;
  policyVersion: string;
  evaluatedAt: string;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  nextState: 'approved' | 'operator_review' | 'blocked';
}

export class PolicyService {
  constructor(private readonly repository: PolicyRepository) {}

  evaluate(input: PolicyEvaluationInput): PolicyEvaluationResult {
    const checksPass = input.evidence.status === 'pass' && input.credentialState.status === 'safe';

    let decisionType: PolicyDecisionType = 'operator_review';
    let nextState: PolicyEvaluationResult['nextState'] = 'operator_review';

    if (!checksPass) {
      decisionType = 'blocked';
      nextState = 'blocked';
    } else if (input.classification.riskBand === 'low') {
      decisionType = 'auto_approved';
      nextState = 'approved';
    }

    const decision: PolicyDecision = {
      id: deterministicId('policy', {
        candidateId: input.candidateId,
        policyVersion: input.policyVersion,
        riskBand: input.classification.riskBand,
        decision: decisionType,
      }),
      candidateId: input.candidateId,
      riskBand: input.classification.riskBand,
      decision: decisionType,
      policyVersion: input.policyVersion,
      rationale: input.classification.rationale,
      createdAt: input.evaluatedAt,
    };

    return {
      decision: this.repository.saveDecision(decision),
      nextState,
    };
  }
}
