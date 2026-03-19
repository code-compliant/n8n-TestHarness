export interface IncidentReviewNote {
  review_id: string;
  submitted_by: string;
  submitted_at: string;
  notes: string;
}

export interface FixtureSet {
  fixture_id: string;
  review_id: string;
  title: string;
  description: string;
  inputs: Record<string, unknown>;
  expected: Record<string, unknown>;
  created_at: string;
}

export type QualityHintScope = 'integration' | 'pattern';

export interface QualityHint {
  hint_id: string;
  review_id: string;
  scope: QualityHintScope;
  target: string;
  score_delta: number;
  rationale: string;
  created_at: string;
}

export interface ReviewGrowthInput {
  review_id: string;
  submitted_by: string;
  notes: string;
  fixtures?: Array<Partial<Pick<FixtureSet, 'fixture_id'>> & Omit<FixtureSet, 'review_id' | 'created_at'>>;
  quality_hints?: Array<Partial<Pick<QualityHint, 'hint_id'>> & Omit<QualityHint, 'review_id' | 'created_at'>>;
}
