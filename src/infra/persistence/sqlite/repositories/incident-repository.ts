import Database from 'better-sqlite3';

import { IncidentRecord, RepairRequestRecord } from '../../../domain/models/incident';

export interface PersistIncidentInput {
  incidentId: string;
  workflowId: string;
  errorContext: string;
  payload: string;
  runSnapshot: string;
  createdAt: string;
}

export interface PersistRepairRequestInput {
  requestId: string;
  incidentId: string;
  summary: string;
  createdAt: string;
}

export class SQLiteIncidentRepository {
  private readonly insertIncident: Database.Statement;
  private readonly readIncidentById: Database.Statement;
  private readonly insertRepairRequest: Database.Statement;
  private readonly readRepairRequestById: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertIncident = this.db.prepare(`
      INSERT INTO incidents (
        incident_id,
        workflow_id,
        error_context,
        payload,
        run_snapshot,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.readIncidentById = this.db.prepare(`
      SELECT incident_id, workflow_id, error_context, payload, run_snapshot, created_at
      FROM incidents
      WHERE incident_id = ?
    `);

    this.insertRepairRequest = this.db.prepare(`
      INSERT INTO repair_requests (
        request_id,
        incident_id,
        summary,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    this.readRepairRequestById = this.db.prepare(`
      SELECT request_id, incident_id, summary, created_at
      FROM repair_requests
      WHERE request_id = ?
    `);
  }

  findIncidentById(incidentId: string): IncidentRecord | null {
    const existing = this.readIncidentById.get(incidentId) as
      | {
          incident_id: string;
          workflow_id: string;
          error_context: string;
          payload: string;
          run_snapshot: string;
          created_at: string;
        }
      | undefined;

    if (!existing) {
      return null;
    }

    return {
      incident_id: existing.incident_id,
      workflow_id: existing.workflow_id,
      error_context: existing.error_context,
      payload: existing.payload,
      run_snapshot: existing.run_snapshot,
      created_at: existing.created_at,
    };
  }

  saveIncident(input: PersistIncidentInput): IncidentRecord {
    const existing = this.findIncidentById(input.incidentId);

    if (existing) {
      return existing;
    }

    this.insertIncident.run(
      input.incidentId,
      input.workflowId,
      input.errorContext,
      input.payload,
      input.runSnapshot,
      input.createdAt,
      input.createdAt,
    );

    return {
      incident_id: input.incidentId,
      workflow_id: input.workflowId,
      error_context: input.errorContext,
      payload: input.payload,
      run_snapshot: input.runSnapshot,
      created_at: input.createdAt,
    };
  }

  saveRepairRequest(input: PersistRepairRequestInput): RepairRequestRecord {
    const existing = this.readRepairRequestById.get(input.requestId) as
      | {
          request_id: string;
          incident_id: string;
          summary: string;
          created_at: string;
        }
      | undefined;

    if (existing) {
      return {
        request_id: existing.request_id,
        incident_id: existing.incident_id,
        summary: existing.summary,
        created_at: existing.created_at,
      };
    }

    this.insertRepairRequest.run(
      input.requestId,
      input.incidentId,
      input.summary,
      input.createdAt,
      input.createdAt,
    );

    return {
      request_id: input.requestId,
      incident_id: input.incidentId,
      summary: input.summary,
      created_at: input.createdAt,
    };
  }
}
