import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { FixtureSet, IncidentReviewNote, QualityHint } from '../../../domain/models/knowledge';

export class SQLiteKnowledgeRepository {
  private readonly insertReview: Database.Statement;
  private readonly insertFixture: Database.Statement;
  private readonly insertQualityHint: Database.Statement;
  private readonly listQualityHints: Database.Statement;

  constructor(private readonly db: Database.Database, private readonly baseDir: string = process.cwd()) {
    this.insertReview = this.db.prepare(`
      INSERT OR REPLACE INTO incident_reviews (
        review_id,
        submitted_by,
        submitted_at,
        notes
      ) VALUES (?, ?, ?, ?)
    `);
    this.insertFixture = this.db.prepare(`
      INSERT OR REPLACE INTO fixture_sets (
        fixture_id,
        review_id,
        title,
        description,
        inputs,
        expected,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.insertQualityHint = this.db.prepare(`
      INSERT OR REPLACE INTO quality_hints (
        hint_id,
        review_id,
        scope,
        target,
        score_delta,
        rationale,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.listQualityHints = this.db.prepare(`
      SELECT
        hint_id,
        review_id,
        scope,
        target,
        score_delta,
        rationale,
        created_at
      FROM quality_hints
    `);
  }

  saveReview(review: IncidentReviewNote): void {
    this.insertReview.run(review.review_id, review.submitted_by, review.submitted_at, review.notes);
    this.persistReviewFile(review);
  }

  saveFixtureSet(fixture: FixtureSet): void {
    this.insertFixture.run(
      fixture.fixture_id,
      fixture.review_id,
      fixture.title,
      fixture.description,
      JSON.stringify(fixture.inputs),
      JSON.stringify(fixture.expected),
      fixture.created_at,
    );
    this.persistFixtureFile(fixture);
  }

  saveQualityHint(hint: QualityHint): void {
    this.insertQualityHint.run(
      hint.hint_id,
      hint.review_id,
      hint.scope,
      hint.target,
      hint.score_delta,
      hint.rationale,
      hint.created_at,
    );
  }

  getQualityHints(): QualityHint[] {
    const rows = this.listQualityHints.all() as Array<{
      hint_id: string;
      review_id: string;
      scope: string;
      target: string;
      score_delta: number;
      rationale: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      hint_id: row.hint_id,
      review_id: row.review_id,
      scope: row.scope as QualityHint['scope'],
      target: row.target,
      score_delta: row.score_delta,
      rationale: row.rationale,
      created_at: row.created_at,
    }));
  }

  private persistReviewFile(review: IncidentReviewNote): void {
    const dir = join(this.baseDir, 'data', 'knowledge', 'reviews');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${review.review_id}.json`);
    writeFileSync(path, JSON.stringify(review, null, 2));
  }

  private persistFixtureFile(fixture: FixtureSet): void {
    const dir = join(this.baseDir, 'data', 'knowledge', 'fixtures');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${fixture.fixture_id}.json`);
    writeFileSync(path, JSON.stringify(fixture, null, 2));
  }
}
