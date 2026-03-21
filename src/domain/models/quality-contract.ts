export type QualityContractSource = 'authored' | 'auto-derived';

export interface QualityContract {
  version: string;
  workflowSlug: string;
  source: QualityContractSource;
  features: string[];
  assertions: Assertion[];
  createdAt: string;
  updatedAt: string;
}

export interface Assertion {
  id: string;
  feature: string;
  type: string;
  target: string;
  spec: unknown;
}

export interface ContractDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface ContractMigrationPlan {
  contractPath: string;
  currentVersion: string;
  targetVersion: string;
  changes: ContractChange[];
  requiresApproval: boolean;
}

export interface ContractChange {
  type: 'add_assertion' | 'remove_assertion' | 'update_assertion' | 'mark_stale';
  assertionId?: string;
  feature: string;
  reason: string;
  suggestedAction?: string;
}