import type { SpecAssertion } from '../../domain/models/requirement-spec';

export const emailWorkflowTemplate: SpecAssertion[] = [
  {
    id: 'error-handler-check',
    feature: 'core',
    type: 'error_handler_check',
    target: 'error_handler',
    spec: { workflowId: 'RumKLiLA2onXkppj' }
  },
  {
    id: 'classification-check',
    feature: 'classify',
    type: 'classification_check',
    target: 'email_classifier',
    spec: { allowedValues: ['urgent', 'routine', 'delegate', 'ignore'] }
  },
  {
    id: 'perspective-check',
    feature: 'reply',
    type: 'perspective_check',
    target: 'email_composer',
    spec: { judgePromptPath: 'test/fixtures/judges/email-perspective.md' }
  },
  {
    id: 'context-injection-audit',
    feature: 'reply',
    type: 'context_injection_audit',
    target: 'email_composer',
    spec: { requiredTokens: ['Chris', 'Dorian', 'consultant', 'engineer', 'MD'] }
  }
];