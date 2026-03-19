import Database from 'better-sqlite3';
import type { PolicyDecision } from '../../../domain/models/policy';

export class SQLitePolicyDecisionRepository {
  private readonly insert: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insert = db.prepare(`
      INSERT INTO policy_decisions (
        id,
        candidate_id,
        risk_band,
        decision,
        policy_version,
        rationale_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  }

  saveDecision(decision: PolicyDecision): PolicyDecision {
    this.insert.run(
      decision.id,
      decision.candidateId,
      decision.riskBand,
      decision.decision,
      decision.policyVersion,
      JSON.stringify(decision.rationale),
      decision.createdAt,
    );
    return decision;
  }
}
