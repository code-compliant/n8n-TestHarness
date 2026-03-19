import Database from 'better-sqlite3';

import type { RotationOutcome } from '../../../domain/models/credentials';
import { ROTATION_EVENTS_TABLE } from '../schema';

export class SQLiteRotationRepository {
  private readonly insertRotation: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertRotation = this.db.prepare(`
      INSERT INTO ${ROTATION_EVENTS_TABLE} (
        id,
        candidate_id,
        actor,
        from_environment,
        to_environment,
        credential_key,
        previous_reference,
        new_reference,
        rollback_reference,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  saveRotation(outcome: RotationOutcome, createdAt: string): void {
    this.insertRotation.run(
      outcome.rotationId,
      outcome.candidateId,
      outcome.actor,
      outcome.fromEnvironment,
      outcome.toEnvironment,
      outcome.credentialKey,
      outcome.previousReference,
      outcome.newReference,
      outcome.rollbackReference,
      createdAt,
    );
  }
}
