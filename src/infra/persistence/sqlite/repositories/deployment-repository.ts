import type Database from 'better-sqlite3';

import { DeploymentAttemptRecord, DeploymentAction } from '../../../domain/models/candidate';
import { DEPLOYMENT_ATTEMPT_TABLE } from '../schema';

export interface DeploymentAttemptInput {
  attemptId: string;
  candidateId: string;
  action: DeploymentAction;
  actor: string;
  actorRole: string;
  allowed: boolean;
  reason: string;
  createdAt: string;
}

export class SQLiteDeploymentRepository {
  private readonly insertAttempt: Database.Statement;
  private readonly listAttemptsStmt: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertAttempt = this.db.prepare(`
      INSERT INTO ${DEPLOYMENT_ATTEMPT_TABLE} (
        id,
        candidate_id,
        action,
        actor,
        actor_role,
        allowed,
        reason,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.listAttemptsStmt = this.db.prepare(`
      SELECT
        id,
        candidate_id,
        action,
        actor,
        actor_role,
        allowed,
        reason,
        created_at
      FROM ${DEPLOYMENT_ATTEMPT_TABLE}
      WHERE candidate_id = ?
      ORDER BY created_at ASC
    `);
  }

  recordAttempt(input: DeploymentAttemptInput): DeploymentAttemptRecord {
    this.insertAttempt.run(
      input.attemptId,
      input.candidateId,
      input.action,
      input.actor,
      input.actorRole,
      input.allowed ? 1 : 0,
      input.reason,
      input.createdAt,
    );

    return {
      attempt_id: input.attemptId,
      candidate_id: input.candidateId,
      action: input.action,
      actor: input.actor,
      actor_role: input.actorRole,
      allowed: input.allowed,
      reason: input.reason,
      created_at: input.createdAt,
    };
  }

  listAttempts(candidateId: string): DeploymentAttemptRecord[] {
    const rows = this.listAttemptsStmt.all(candidateId) as Array<{
      id: string;
      candidate_id: string;
      action: DeploymentAction;
      actor: string;
      actor_role: string;
      allowed: number;
      reason: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      attempt_id: row.id,
      candidate_id: row.candidate_id,
      action: row.action,
      actor: row.actor,
      actor_role: row.actor_role,
      allowed: row.allowed === 1,
      reason: row.reason,
      created_at: row.created_at,
    }));
  }
}
