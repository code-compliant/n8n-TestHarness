import Database from 'better-sqlite3';
import type { RiskClassification } from '../../../domain/models/policy';

export class SQLiteRiskRepository {
  private readonly insert: Database.Statement;
  private readonly select: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insert = db.prepare(`
      INSERT INTO risk_classifications (
        id,
        candidate_id,
        decision_period_id,
        risk_band,
        rationale_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.select = db.prepare(`
      SELECT id, candidate_id, decision_period_id, risk_band, rationale_json, created_at
      FROM risk_classifications
      WHERE candidate_id = ? AND decision_period_id = ?
    `);
  }

  getClassification(candidateId: string, decisionPeriodId: string): RiskClassification | undefined {
    const row = this.select.get(candidateId, decisionPeriodId) as
      | {
          id: string;
          candidate_id: string;
          decision_period_id: string;
          risk_band: string;
          rationale_json: string;
          created_at: string;
        }
      | undefined;

    if (!row) return undefined;
    return {
      id: row.id,
      candidateId: row.candidate_id,
      decisionPeriodId: row.decision_period_id,
      riskBand: row.risk_band as RiskClassification['riskBand'],
      rationale: JSON.parse(row.rationale_json) as RiskClassification['rationale'],
      createdAt: row.created_at,
    };
  }

  saveClassification(classification: RiskClassification): RiskClassification {
    this.insert.run(
      classification.id,
      classification.candidateId,
      classification.decisionPeriodId,
      classification.riskBand,
      JSON.stringify(classification.rationale),
      classification.createdAt,
    );
    return classification;
  }
}
