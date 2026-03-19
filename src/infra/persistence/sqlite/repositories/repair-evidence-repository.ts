import Database from 'better-sqlite3';

import { RepairEvidenceRecord } from '../../../domain/models/incident';

export interface PersistRepairEvidenceInput {
  evidenceId: string;
  incidentId: string;
  candidateId: string;
  evidencePayload: string;
  createdAt: string;
}

export class SQLiteRepairEvidenceRepository {
  private readonly insertEvidence: Database.Statement;
  private readonly readEvidenceById: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertEvidence = this.db.prepare(`
      INSERT INTO repair_evidence (
        evidence_id,
        incident_id,
        candidate_id,
        evidence_payload,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.readEvidenceById = this.db.prepare(`
      SELECT evidence_id, incident_id, candidate_id, evidence_payload, created_at
      FROM repair_evidence
      WHERE evidence_id = ?
    `);
  }

  saveEvidence(input: PersistRepairEvidenceInput): RepairEvidenceRecord {
    const existing = this.readEvidenceById.get(input.evidenceId) as
      | {
          evidence_id: string;
          incident_id: string;
          candidate_id: string;
          evidence_payload: string;
          created_at: string;
        }
      | undefined;

    if (existing) {
      return {
        evidence_id: existing.evidence_id,
        incident_id: existing.incident_id,
        candidate_id: existing.candidate_id,
        evidence_payload: existing.evidence_payload,
        created_at: existing.created_at,
      };
    }

    this.insertEvidence.run(
      input.evidenceId,
      input.incidentId,
      input.candidateId,
      input.evidencePayload,
      input.createdAt,
      input.createdAt,
    );

    return {
      evidence_id: input.evidenceId,
      incident_id: input.incidentId,
      candidate_id: input.candidateId,
      evidence_payload: input.evidencePayload,
      created_at: input.createdAt,
    };
  }
}
