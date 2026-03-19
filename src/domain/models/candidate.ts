export type CandidateJourney = 'new' | 'modify' | 'repair' | 'upgrade' | 'test' | 'rollback';

export type CandidateType = CandidateJourney;

export type CandidateStatus = 'generated' | 'review' | 'pending_validation' | 'validated' | 'failed';

export type CandidateSourceType = 'incident' | 'request' | 'manual';

export type CandidateState = 'pending' | 'testing' | 'approved' | 'deployed' | 'rolled_back';

export interface CandidateWorkflow {
  id?: string;
  name?: string;
  nodes?: Array<Record<string, unknown>>;
  connections?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlaceholderOccurrence {
  path: string;
  token: string;
}

export interface CandidateChange {
  path: string;
  changeType: 'add' | 'remove' | 'modify';
  before?: unknown;
  after?: unknown;
}

export interface CandidateSectionChange {
  section_id: string;
  section_name?: string;
  change_count: number;
  change_paths: string[];
}

export interface CandidateDiffPackage {
  base_hash: string;
  candidate_hash: string;
  changes: CandidateChange[];
  section_changes: CandidateSectionChange[];
}

export interface GeneratedCandidateRecord {
  candidate_id: string;
  request_id: string;
  journey: CandidateJourney;
  actor: string;
  workflow_identifier?: string | null;
  status: Extract<CandidateStatus, 'generated' | 'review'>;
  base_workflow: string;
  candidate_workflow: string;
  placeholders: PlaceholderOccurrence[];
  diff: CandidateDiffPackage;
  created_at: string;
}

export interface IncidentCandidateRecord {
  candidate_id: string;
  workflow_id: string;
  candidate_type: CandidateType;
  status: Extract<CandidateStatus, 'pending_validation' | 'validated' | 'failed'>;
  source_type: CandidateSourceType;
  source_id: string;
  created_at: string;
}

export interface CandidateLifecycleRecord {
  candidate_id: string;
  current_state: CandidateState;
  current_revision: string;
  known_good_revision: string | null;
  created_at: string;
  updated_at: string;
}

export type CandidateRecord = GeneratedCandidateRecord | IncidentCandidateRecord | CandidateLifecycleRecord;

export interface CandidateStateTransition {
  transition_id: string;
  candidate_id: string;
  from_state: CandidateState | null;
  to_state: CandidateState;
  actor: string;
  reason: string;
  policy_rule_id: string | null;
  policy_result: 'allow' | 'deny';
  evidence_refs: string[];
  created_at: string;
}

export type DeploymentAction = 'deploy' | 'rollback';

export interface DeploymentAttemptRecord {
  attempt_id: string;
  candidate_id: string;
  action: DeploymentAction;
  actor: string;
  actor_role: string;
  allowed: boolean;
  reason: string;
  created_at: string;
}
