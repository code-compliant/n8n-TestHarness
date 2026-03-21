import type { RequirementSpec, SpecAssertion } from '../domain/models/requirement-spec';
import { emailWorkflowTemplate } from './spec-deriver-templates/email';
import { calendarWorkflowTemplate } from './spec-deriver-templates/calendar';
import { quoteWorkflowTemplate } from './spec-deriver-templates/quote';
import { genericWorkflowTemplate } from './spec-deriver-templates/generic';
import { SpecDeriverLLMFallback } from './spec-deriver-llm-fallback';

export interface SpecDeriverInput {
  workflowSlug: string;
  workflowFamily?: string;
  functionalRequirements: string[];
  workflowDefinition?: unknown;
}

export class SpecDeriver {
  private readonly llmFallback: SpecDeriverLLMFallback;

  constructor() {
    this.llmFallback = new SpecDeriverLLMFallback();
  }

  async deriveSpec(input: SpecDeriverInput): Promise<RequirementSpec> {
    const baseAssertions = this.getBaseAssertions(input.workflowFamily || 'generic');

    // Add global error handler rule regardless of family
    const globalErrorHandlerAssertion: SpecAssertion = {
      id: 'global-error-handler-check',
      feature: 'core',
      type: 'error_handler_check',
      target: 'error_handler',
      spec: { workflowId: 'RumKLiLA2onXkppj' }
    };

    let assertions = [...baseAssertions];

    // Ensure global error handler is always present
    const hasErrorHandler = assertions.some(a => a.type === 'error_handler_check');
    if (!hasErrorHandler) {
      assertions.unshift(globalErrorHandlerAssertion);
    }

    // If no family template exists or workflowDefinition provided, use LLM fallback
    if ((input.workflowFamily === 'generic' || !input.workflowFamily) && input.workflowDefinition) {
      try {
        const llmAssertions = await this.llmFallback.inferAssertions(
          input.workflowDefinition,
          input.functionalRequirements
        );
        assertions = [globalErrorHandlerAssertion, ...llmAssertions];
      } catch (error) {
        console.warn('LLM fallback failed, using generic template:', error);
      }
    }

    return {
      version: '1.0.0',
      workflowSlug: input.workflowSlug,
      features: this.extractFeatures(assertions),
      assertions,
      createdAt: new Date().toISOString(),
      source: 'auto-derived'
    };
  }

  private getBaseAssertions(workflowFamily: string): SpecAssertion[] {
    switch (workflowFamily.toLowerCase()) {
      case 'email':
        return [...emailWorkflowTemplate];
      case 'calendar':
        return [...calendarWorkflowTemplate];
      case 'quote':
        return [...quoteWorkflowTemplate];
      default:
        return [...genericWorkflowTemplate];
    }
  }

  private extractFeatures(assertions: SpecAssertion[]): string[] {
    const features = new Set<string>();
    assertions.forEach(assertion => {
      features.add(assertion.feature);
    });
    return Array.from(features).sort();
  }
}