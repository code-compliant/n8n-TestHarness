import type { SpecAssertion } from '../../domain/models/requirement-spec';

export const quoteWorkflowTemplate: SpecAssertion[] = [
  {
    id: 'error-handler-check',
    feature: 'core',
    type: 'error_handler_check',
    target: 'error_handler',
    spec: { workflowId: 'RumKLiLA2onXkppj' }
  },
  {
    id: 'threshold-numeric',
    feature: 'calculate',
    type: 'threshold_numeric',
    target: 'quote_calculator',
    spec: { min: 0, max: 1000000 }
  },
  {
    id: 'not-contains',
    feature: 'format',
    type: 'not_contains',
    target: 'quote_formatter',
    spec: { forbiddenPatterns: ['placeholder', 'TODO', 'TBD'] }
  },
  {
    id: 'side-effect-check',
    feature: 'deliver',
    type: 'side_effect_check',
    target: 'quote_delivery',
    spec: { requiredOutput: true }
  }
];