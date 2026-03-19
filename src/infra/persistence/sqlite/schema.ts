import type Database from 'better-sqlite3';

export const INTENT_TABLE = 'intake_requests';

export function ensureIntakeSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${INTENT_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      actor TEXT NOT NULL,
      journey_type TEXT NOT NULL CHECK (journey_type IN ('new','modify','repair','upgrade','test','rollback')),
      confidence REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('received','blocked','ready')),
      raw_payload TEXT NOT NULL,
      summary TEXT NOT NULL,
      workflow_identifier TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intake_requests_status ON ${INTENT_TABLE} (status);
    CREATE INDEX IF NOT EXISTS idx_intake_requests_journey ON ${INTENT_TABLE} (journey_type);
    CREATE INDEX IF NOT EXISTS idx_intake_requests_request_id ON ${INTENT_TABLE} (request_id);
  `;

  db.exec(migration);
}

