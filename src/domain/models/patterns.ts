export interface IntegrationContext {
  integrations: string[];
  operations: string[];
  keywords: string[];
}

export interface PatternMetadata {
  pattern_id: string;
  name: string;
  description: string;
  integration: string;
  tags: string[];
  workflow_identifiers: string[];
  context: IntegrationContext;
  success_count: number;
  last_success_at: string;
  quality_score: number;
  created_at: string;
  updated_at: string;
  source_request_id?: string | null;
}

export interface PatternSuggestion {
  pattern_id: string;
  name: string;
  integration: string;
  score: number;
  reason: string;
}

export interface PatternApplicationRecord {
  request_id: string;
  pattern_id: string;
  applied_by: string;
  applied_at: string;
  source: 'intake' | 'generation';
  notes?: string | null;
}

export interface PatternMatchInput {
  text: string;
  workflowIdentifier?: string | null;
  integration?: string | null;
  tags?: string[] | null;
}

export interface PatternRecordInput {
  requestId: string;
  name: string;
  description: string;
  integration: string;
  tags?: string[];
  workflowIdentifiers?: string[];
  context?: IntegrationContext;
  qualityScore?: number;
}
