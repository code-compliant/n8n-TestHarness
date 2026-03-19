import type { AuditEvent } from '../domain/models/audit';
import type { Environment, SetupActionStep } from '../domain/models/credentials';
import { buildId } from '../shared/util/ids';
import type { SQLiteAuditRepository } from '../infra/persistence/sqlite/repositories/audit-repository';

export interface AuditRepository {
  append(event: AuditEvent): AuditEvent;
  listByCandidate(candidateId: string): AuditEvent[];
  record?(event: {
    id: string;
    candidateId: string;
    actor: string;
    environment: Environment;
    status: string;
    actionSequence: SetupActionStep[];
    createdAt: string;
  }): void;
}

export class AuditService {
  constructor(private readonly repository: SQLiteAuditRepository) {}

  record(event: AuditEvent): AuditEvent {
    return this.repository.append(event);
  }

  listCandidateEvents(candidateId: string): AuditEvent[] {
    return this.repository.listByCandidate(candidateId);
  }

  recordSetupAudit(params: {
    candidateId: string;
    actor: string;
    environment: Environment;
    status: string;
    actionSequence: SetupActionStep[];
  }): string {
    const auditId = buildId(
      'audit',
      params.candidateId,
      params.actor,
      params.environment,
      params.status,
      JSON.stringify(params.actionSequence),
    );
    this.repository.record?.({
      id: auditId,
      candidateId: params.candidateId,
      actor: params.actor,
      environment: params.environment,
      status: params.status,
      actionSequence: params.actionSequence,
      createdAt: new Date().toISOString(),
    });
    return auditId;
  }
}
