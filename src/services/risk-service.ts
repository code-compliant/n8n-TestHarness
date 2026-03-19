import type { ValidationEvidence } from '../domain/models/validation';
import type { CredentialBindingState } from '../domain/models/credentials';
import type { RiskBand, RiskClassification, RiskRationale } from '../domain/models/policy';
import { deterministicId } from '../shared/util/ids';

export interface RiskRepository {
  getClassification(candidateId: string, decisionPeriodId: string): RiskClassification | undefined;
  saveClassification(classification: RiskClassification): RiskClassification;
}

export interface RiskAssessmentInput {
  candidateId: string;
  decisionPeriodId?: string;
  evidence: ValidationEvidence;
  credentialState: CredentialBindingState;
  evaluatedAt: string;
}

export class RiskService {
  constructor(private readonly repository: RiskRepository) {}

  classify(input: RiskAssessmentInput): RiskClassification {
    const decisionPeriodId = input.decisionPeriodId ?? deterministicId('decision', {
      candidateId: input.candidateId,
      evidenceId: input.evidence.id,
    });

    const existing = this.repository.getClassification(input.candidateId, decisionPeriodId);
    if (existing) {
      return existing;
    }

    const { riskBand, rationale } = this.scoreRisk(input.evidence, input.credentialState);
    const classification: RiskClassification = {
      id: deterministicId('risk', {
        candidateId: input.candidateId,
        decisionPeriodId,
        riskBand,
      }),
      candidateId: input.candidateId,
      decisionPeriodId,
      riskBand,
      rationale,
      createdAt: input.evaluatedAt,
    };

    return this.repository.saveClassification(classification);
  }

  private scoreRisk(evidence: ValidationEvidence, credentialState: CredentialBindingState): {
    riskBand: RiskBand;
    rationale: RiskRationale;
  } {
    const failureSummary = {
      total: evidence.failures.length,
      critical: evidence.failures.filter((failure) => failure.class === 'critical').length,
      major: evidence.failures.filter((failure) => failure.class === 'major').length,
      minor: evidence.failures.filter((failure) => failure.class === 'minor').length,
    };

    const factors: string[] = [];
    let riskBand: RiskBand = 'low';

    if (credentialState.status !== 'safe') {
      riskBand = 'high';
      factors.push(`credential_state:${credentialState.status}`);
    }

    if (failureSummary.total > 0) {
      if (failureSummary.critical > 0) {
        riskBand = 'high';
        factors.push('critical_validation_failures');
      } else if (failureSummary.major > 0) {
        if (riskBand !== 'high') {
          riskBand = 'medium';
        }
        factors.push('major_validation_failures');
      } else if (failureSummary.minor > 0 && riskBand === 'low') {
        riskBand = 'medium';
        factors.push('minor_validation_failures');
      }

      const nonRetryable = evidence.failures.some((failure) => failure.retryability === 'non_retryable');
      if (nonRetryable) {
        riskBand = 'high';
        factors.push('non_retryable_failures');
      }
    }

    if (factors.length === 0) {
      factors.push('validation_passed');
    }

    return {
      riskBand,
      rationale: {
        factors,
        failureSummary,
        credentialStatus: credentialState.status,
      },
    };
  }
}
