import Database from 'better-sqlite3';
import type { AuditEvent } from '../../../domain/models/audit';
import type { SetupActionStep } from '../../../domain/models/credentials';
import { AUDIT_EVENTS_TABLE } from '../schema';

export interface SetupAuditEventInput {
  id: string;
  candidateId: string;
  actor: string;
  environment: 'test' | 'production';
  status: string;
  actionSequence: SetupActionStep[];
  createdAt: string;
}

export class SQLiteAuditRepository {
  private readonly insertPolicyEvent: Database.Statement;
  private readonly listByCandidateStmt: Database.Statement;
  private readonly insertSetupEvent: Database.Statement;
  private readonly listSetupByCandidateStmt: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertPolicyEvent = db.prepare(`
      INSERT INTO ${AUDIT_EVENTS_TABLE} (
        id,
        event_type,
        actor,
        occurred_at,
        policy_id,
        candidate_id,
        request_id,
        approver_action_id,
        input_artifacts_json,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.listByCandidateStmt = db.prepare(`
      SELECT
        id,
        event_type,
        actor,
        occurred_at,
        policy_id,
        candidate_id,
        request_id,
        approver_action_id,
        input_artifacts_json,
        metadata_json
      FROM ${AUDIT_EVENTS_TABLE}
      WHERE candidate_id = ?
      ORDER BY occurred_at ASC
    `);
    this.insertSetupEvent = db.prepare(`
      INSERT INTO ${AUDIT_EVENTS_TABLE} (
        id,
        candidate_id,
        actor,
        environment,
        status,
        action_sequence,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.listSetupByCandidateStmt = db.prepare(`
      SELECT id, candidate_id, actor, environment, status, action_sequence, created_at
      FROM ${AUDIT_EVENTS_TABLE}
      WHERE candidate_id = ?
    `);
  }

  append(event: AuditEvent): AuditEvent {
    this.insertPolicyEvent.run(
      event.id,
      event.eventType,
      event.actor,
      event.occurredAt,
      event.policyId ?? null,
      event.candidateId ?? null,
      event.requestId ?? null,
      event.approverActionId ?? null,
      JSON.stringify(event.inputArtifacts ?? []),
      JSON.stringify(event.metadata ?? {}),
    );
    return event;
  }

  listByCandidate(candidateId: string): AuditEvent[] {
    const rows = this.listByCandidateStmt.all(candidateId) as Array<{
      id: string;
      event_type: string;
      actor: string;
      occurred_at: string;
      policy_id: string | null;
      candidate_id: string | null;
      request_id: string | null;
      approver_action_id: string | null;
      input_artifacts_json: string;
      metadata_json: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      actor: row.actor,
      occurredAt: row.occurred_at,
      policyId: row.policy_id ?? undefined,
      candidateId: row.candidate_id ?? undefined,
      requestId: row.request_id ?? undefined,
      approverActionId: row.approver_action_id ?? undefined,
      inputArtifacts: JSON.parse(row.input_artifacts_json) as string[],
      metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    }));
  }

  record(event: SetupAuditEventInput): void {
    this.insertSetupEvent.run(
      event.id,
      event.candidateId,
      event.actor,
      event.environment,
      event.status,
      JSON.stringify(event.actionSequence),
      event.createdAt,
    );
  }

  listForCandidate(candidateId: string): SetupAuditEventInput[] {
    const rows = this.listSetupByCandidateStmt.all(candidateId) as Array<{
      id: string;
      candidate_id: string;
      actor: string;
      environment: 'test' | 'production';
      status: string;
      action_sequence: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      candidateId: row.candidate_id,
      actor: row.actor,
      environment: row.environment,
      status: row.status,
      actionSequence: JSON.parse(row.action_sequence) as SetupAuditEventInput['actionSequence'],
      createdAt: row.created_at,
    }));
  }
}
