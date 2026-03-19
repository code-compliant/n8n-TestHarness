export interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  occurredAt: string;
  policyId?: string;
  candidateId?: string;
  requestId?: string;
  approverActionId?: string;
  inputArtifacts: string[];
  metadata: Record<string, unknown>;
}
