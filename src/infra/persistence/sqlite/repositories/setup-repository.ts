import Database from 'better-sqlite3';

import type { SetupOutcome } from '../../../domain/models/credentials';
import { SETUP_RECORDS_TABLE } from '../schema';

export class SQLiteSetupRepository {
  private readonly insertRecord: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertRecord = this.db.prepare(`
      INSERT INTO ${SETUP_RECORDS_TABLE} (
        id,
        candidate_id,
        environment,
        actor,
        status,
        action_sequence,
        fixture_seeded,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  saveSetupOutcome(outcome: SetupOutcome): void {
    this.insertRecord.run(
      outcome.setupId,
      outcome.candidateId,
      outcome.environment,
      outcome.actor,
      outcome.status,
      JSON.stringify(outcome.actionSequence),
      outcome.fixtureSeeded ? 1 : 0,
      new Date().toISOString(),
    );
  }
}
