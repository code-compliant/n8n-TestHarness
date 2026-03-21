export type RequirementSpecSource = 'auto-derived' | 'authored';

export interface RequirementSpec {
  version: string;
  workflowSlug: string;
  features: string[];
  assertions: SpecAssertion[];
  createdAt: string;
  source: RequirementSpecSource;
}

export interface SpecAssertion {
  id: string;
  feature: string;
  type: AssertionType;
  target: string;
  spec: unknown;
}

export type AssertionType =
  | 'error_handler_check'
  | 'context_injection_audit'
  | 'schema_match'
  | 'enum_match'
  | 'classification_check'
  | 'not_contains'
  | 'contains_topic'
  | 'threshold_numeric'
  | 'side_effect_check'
  | 'llm_judge'
  | 'perspective_check';