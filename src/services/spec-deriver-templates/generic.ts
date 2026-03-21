import type { SpecAssertion } from '../../domain/models/requirement-spec';

export const genericWorkflowTemplate: SpecAssertion[] = [
  {
    id: 'error-handler-check',
    feature: 'core',
    type: 'error_handler_check',
    target: 'error_handler',
    spec: { workflowId: 'RumKLiLA2onXkppj' }
  },
  {
    id: 'schema-match',
    feature: 'output',
    type: 'schema_match',
    target: 'main_output',
    spec: { requiredFields: ['status'] }
  }
];