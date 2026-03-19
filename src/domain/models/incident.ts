export interface IncidentInput {
  workflowId?: string | null;
  errorContext?: unknown;
  payload?: unknown;
  runSnapshot?: unknown;
  source?: string;
  actor?: string;
  occurredAt?: string;
}

export interface NormalizedIncident {
  workflowId: string;
  errorContext: unknown;
  payload: unknown;
  runSnapshot: unknown;
  source: string;
  actor: string;
  occurredAt: string;
  rawPayload: string;
}

export interface IncidentRecord {
  incident_id: string;
  workflow_id: string;
  error_context: string;
  payload: string;
  run_snapshot: string;
  created_at: string;
}

export interface RepairRequestRecord {
  request_id: string;
  incident_id: string;
  summary: string;
  created_at: string;
}

export interface RepairEvidenceRecord {
  evidence_id: string;
  incident_id: string;
  candidate_id: string;
  evidence_payload: string;
  created_at: string;
}

export type RecoveryType = 'manual' | 'automated';

export interface RecoveryOutcomeRecord {
  outcome_id: string;
  incident_id: string;
  candidate_id: string | null;
  recovery_type: RecoveryType;
  summary: string;
  fixture_snapshot: string;
  created_at: string;
}
