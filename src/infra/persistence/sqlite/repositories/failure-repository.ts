import Database from 'better-sqlite3';

import { FailureRecord } from '../../../domain/models/validation';

export class SQLiteFailureRepository {
  private readonly insertFailure: Database.Statement;
  private readonly listByRunIdStmt: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertFailure = this.db.prepare(`
      INSERT INTO validation_failures (
        failure_id,
        run_id,
        candidate_id,
        failure_class,
        reproducibility,
        retryability,
        summary,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.listByRunIdStmt = this.db.prepare(`
      SELECT
        failure_id,
        run_id,
        candidate_id,
        failure_class,
        reproducibility,
        retryability,
        summary,
        details,
        created_at
      FROM validation_failures
      WHERE run_id = ?
    `);
  }

  insertFailureRecord(record: FailureRecord): FailureRecord {
    this.insertFailure.run(
      record.failureId,
      record.runId,
      record.candidateId,
      record.failureClass,
      record.reproducibility,
      record.retryability,
      record.summary,
      record.details,
      record.createdAt,
    );
    return record;
  }

  listByRunId(runId: string): FailureRecord[] {
    const rows = this.listByRunIdStmt.all(runId) as Array<{
      failure_id: string;
      run_id: string;
      candidate_id: string;
      failure_class: FailureRecord['failureClass'];
      reproducibility: FailureRecord['reproducibility'];
      retryability: FailureRecord['retryability'];
      summary: string;
      details: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      failureId: row.failure_id,
      runId: row.run_id,
      candidateId: row.candidate_id,
      failureClass: row.failure_class,
      reproducibility: row.reproducibility,
      retryability: row.retryability,
      summary: row.summary,
      details: row.details,
      createdAt: row.created_at,
    }));
  }
}
