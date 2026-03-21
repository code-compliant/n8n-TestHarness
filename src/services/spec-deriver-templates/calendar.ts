import type { SpecAssertion } from '../../domain/models/requirement-spec';

export const calendarWorkflowTemplate: SpecAssertion[] = [
  {
    id: 'error-handler-check',
    feature: 'core',
    type: 'error_handler_check',
    target: 'error_handler',
    spec: { workflowId: 'RumKLiLA2onXkppj' }
  },
  {
    id: 'side-effect-check',
    feature: 'schedule',
    type: 'side_effect_check',
    target: 'calendar_create',
    spec: { requiredOutput: true }
  },
  {
    id: 'schema-match',
    feature: 'schedule',
    type: 'schema_match',
    target: 'calendar_create',
    spec: {
      requiredFields: ['summary', 'start', 'end'],
      dateFields: ['start', 'end']
    }
  }
];