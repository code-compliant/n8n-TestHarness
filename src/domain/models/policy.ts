export type RiskBand = 'low' | 'medium' | 'high';

export interface RiskRationale {
  factors: string[];
  failureSummary?: {
    total: number;
    critical: number;
    major: number;
    minor: number;
  };
  credentialStatus?: string;
}

export interface RiskClassification {
  id: string;
  candidateId: string;
  decisionPeriodId: string;
  riskBand: RiskBand;
  rationale: RiskRationale;
  createdAt: string;
}

export type PolicyDecisionType = 'auto_approved' | 'operator_review' | 'blocked';

export interface PolicyDecision {
  id: string;
  candidateId: string;
  riskBand: RiskBand;
  decision: PolicyDecisionType;
  policyVersion: string;
  rationale: RiskRationale;
  createdAt: string;
}
