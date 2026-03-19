import { createHash } from 'node:crypto';

import { FixtureSet, IncidentReviewNote, QualityHint, ReviewGrowthInput } from '../domain/models/knowledge';
import { SQLiteKnowledgeRepository } from '../infra/persistence/sqlite/repositories/knowledge-repository';

function createId(prefix: string, seed: string): string {
  return `${prefix}_${createHash('sha256').update(seed).digest('hex').slice(0, 12)}`;
}

export class KnowledgeGrowthService {
  constructor(private readonly repository: SQLiteKnowledgeRepository) {}

  applyReviewNotes(input: ReviewGrowthInput): {
    review: IncidentReviewNote;
    fixtures: FixtureSet[];
    qualityHints: QualityHint[];
  } {
    const submittedAt = new Date().toISOString();
    const review: IncidentReviewNote = {
      review_id: input.review_id,
      submitted_by: input.submitted_by,
      submitted_at: submittedAt,
      notes: input.notes,
    };

    this.repository.saveReview(review);

    const fixtures: FixtureSet[] = (input.fixtures ?? []).map((fixture) => ({
      fixture_id: fixture.fixture_id ?? createId('fixture', `${input.review_id}-${fixture.title}`),
      review_id: input.review_id,
      title: fixture.title,
      description: fixture.description,
      inputs: fixture.inputs,
      expected: fixture.expected,
      created_at: submittedAt,
    }));

    for (const fixture of fixtures) {
      this.repository.saveFixtureSet(fixture);
    }

    const qualityHints: QualityHint[] = (input.quality_hints ?? []).map((hint) => ({
      hint_id: hint.hint_id ?? createId('hint', `${input.review_id}-${hint.target}`),
      review_id: input.review_id,
      scope: hint.scope,
      target: hint.target,
      score_delta: hint.score_delta,
      rationale: hint.rationale,
      created_at: submittedAt,
    }));

    for (const hint of qualityHints) {
      this.repository.saveQualityHint(hint);
    }

    return { review, fixtures, qualityHints };
  }
}
