import Database from 'better-sqlite3';

import { RecoveryOutcomeRecord } from '../../../domain/models/incident';

export interface PersistRecoveryOutcomeInput {
  outcomeId: string;
  incidentId: string;
  candidateId: string | null;
  recoveryType: RecoveryOutcomeRecord['recovery_type'];
  summary: string;
  fixtureSnapshot: string;
  createdAt: string;
}

export class SQLiteRecoveryOutcomeRepository {
  private readonly insertOutcome: Database.Statement;
  private readonly readOutcomeById: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertOutcome = this.db.prepare(`
      INSERT INTO recovery_outcomes (
        outcome_id,
        incident_id,
        candidate_id,
        recovery_type,
        summary,
        fixture_snapshot,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.readOutcomeById = this.db.prepare(`
      SELECT outcome_id, incident_id, candidate_id, recovery_type, summary, fixture_snapshot, created_at
      FROM recovery_outcomes
      WHERE outcome_id = ?
    `);
  }

  saveOutcome(input: PersistRecoveryOutcomeInput): RecoveryOutcomeRecord {
    const existing = this.readOutcomeById.get(input.outcomeId) as
      | {
          outcome_id: string;
          incident_id: string;
          candidate_id: string | null;
          recovery_type: RecoveryOutcomeRecord['recovery_type'];
          summary: string;
          fixture_snapshot: string;
          created_at: string;
        }
      | undefined;

    if (existing) {
      return {
        outcome_id: existing.outcome_id,
        incident_id: existing.incident_id,
        candidate_id: existing.candidate_id,
        recovery_type: existing.recovery_type,
        summary: existing.summary,
        fixture_snapshot: existing.fixture_snapshot,
        created_at: existing.created_at,
      };
    }

    this.insertOutcome.run(
      input.outcomeId,
      input.incidentId,
      input.candidateId,
      input.recoveryType,
      input.summary,
      input.fixtureSnapshot,
      input.createdAt,
      input.createdAt,
    );

    return {
      outcome_id: input.outcomeId,
      incident_id: input.incidentId,
      candidate_id: input.candidateId,
      recovery_type: input.recoveryType,
      summary: input.summary,
      fixture_snapshot: input.fixtureSnapshot,
      created_at: input.createdAt,
    };
  }
}
