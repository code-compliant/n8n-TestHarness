import Database from 'better-sqlite3';

import { IntakeRecord, NormalizedIntake, JourneyType } from '../../../domain/models/intake';

export interface PersistInput {
  requestId: string;
  intake: NormalizedIntake;
  journey: JourneyType;
  confidence: number;
  reason: string;
  status: 'received' | 'blocked' | 'ready';
  summary: string;
  createdAt: string;
}

export class SQLiteIntakeRepository {
  private readonly insertRequest: Database.Statement;
  private readonly readByRequestId: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertRequest = this.db.prepare(`
      INSERT INTO intake_requests (
        request_id,
        source,
        actor,
        journey_type,
        confidence,
        reason,
        status,
        raw_payload,
        summary,
        workflow_identifier,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.readByRequestId = this.db.prepare(`
      SELECT
        request_id,
        source,
        actor,
        journey_type,
        confidence,
        reason,
        status,
        summary,
        raw_payload,
        workflow_identifier,
        created_at
      FROM intake_requests
      WHERE request_id = ?
    `);
  }

  saveRequest(input: PersistInput): IntakeRecord {
    const existing = this.readByRequestId.get(input.requestId) as
      | {
          request_id: string;
          source: string;
          actor: string;
          journey_type: string;
          confidence: number;
          reason: string;
          status: 'received' | 'blocked' | 'ready';
          summary: string;
          raw_payload: string;
          workflow_identifier: string | null;
          created_at: string;
        }
      | undefined;

    if (existing) {
      return {
        request_id: existing.request_id,
        source: existing.source as IntakeRecord['source'],
        actor: existing.actor,
        journey: existing.journey_type as IntakeRecord['journey'],
        confidence: existing.confidence,
        reason: existing.reason,
        status: existing.status,
        summary: existing.summary,
        rawPayload: existing.raw_payload,
        workflowIdentifier: existing.workflow_identifier,
        createdAt: existing.created_at,
      };
    }

    const now = input.createdAt;
    this.insertRequest.run(
      input.requestId,
      input.intake.source,
      input.intake.actor,
      input.journey,
      input.confidence,
      input.reason,
      input.status,
      input.intake.rawPayload,
      input.summary,
      input.intake.workflowIdentifier ?? null,
      now,
      now,
    );

    return {
      request_id: input.requestId,
      source: input.intake.source,
      actor: input.intake.actor,
      journey: input.journey,
      confidence: input.confidence,
      reason: input.reason,
      status: input.status,
      summary: input.summary,
      rawPayload: input.intake.rawPayload,
      workflowIdentifier: input.intake.workflowIdentifier,
      createdAt: now,
    };
  }
}
