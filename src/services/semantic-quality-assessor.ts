import type { RequirementSpec, SpecAssertion } from '../domain/models/requirement-spec';
import type { AssessmentResult, AssertionResult } from '../domain/models/assessment-result';
import type { RuntimeResult } from '../domain/models/runtime-result';
import type { WorkflowDefinition } from './n8n-api-client';

import { evaluateErrorHandlerCheck } from './assertion-evaluators/error-handler-check';
import { evaluateContextInjectionAudit } from './assertion-evaluators/context-injection-audit';
import { evaluateSchemaMatch } from './assertion-evaluators/schema-match';
import { evaluateClassificationCheck } from './assertion-evaluators/classification-check';
import { evaluateSideEffectCheck } from './assertion-evaluators/side-effect-check';
import { evaluateNotContains } from './assertion-evaluators/not-contains';
import { evaluateLLMJudge } from './assertion-evaluators/llm-judge';

export interface AssessmentInput {
  contract: RequirementSpec;
  workflowDefinition: WorkflowDefinition;
  runtimeResult?: RuntimeResult;
}

export class SemanticQualityAssessor {
  async assess(input: AssessmentInput): Promise<AssessmentResult> {
    const results: AssertionResult[] = [];

    // Sort assertions by evaluation order (cheapest first)
    const sortedAssertions = this.sortAssertionsByPriority(input.contract.assertions);

    for (const assertion of sortedAssertions) {
      const result = await this.evaluateAssertion(assertion, input);
      results.push(result);

      // Short-circuit on static failures before expensive LLM calls
      if (result.status === 'FAIL' && this.isStaticAssertion(assertion.type)) {
        console.log(`Short-circuiting on static failure: ${assertion.type}`);
      }
    }

    return this.compileAssessmentResult(results);
  }

  private async evaluateAssertion(
    assertion: SpecAssertion,
    input: AssessmentInput
  ): Promise<AssertionResult> {
    try {
      switch (assertion.type) {
        case 'error_handler_check':
          return evaluateErrorHandlerCheck(assertion, input.workflowDefinition);

        case 'context_injection_audit':
          return evaluateContextInjectionAudit(assertion, input.workflowDefinition);

        case 'schema_match':
          if (!input.runtimeResult) {
            return this.createMissingRuntimeResult(assertion);
          }
          return evaluateSchemaMatch(assertion, input.runtimeResult);

        case 'classification_check':
          if (!input.runtimeResult) {
            return this.createMissingRuntimeResult(assertion);
          }
          return evaluateClassificationCheck(assertion, input.runtimeResult);

        case 'side_effect_check':
          if (!input.runtimeResult) {
            return this.createMissingRuntimeResult(assertion);
          }
          return evaluateSideEffectCheck(assertion, input.runtimeResult);

        case 'not_contains':
          if (!input.runtimeResult) {
            return this.createMissingRuntimeResult(assertion);
          }
          return evaluateNotContains(assertion, input.runtimeResult);

        case 'llm_judge':
        case 'perspective_check':
          if (!input.runtimeResult) {
            return this.createMissingRuntimeResult(assertion);
          }
          return await evaluateLLMJudge(assertion, input.runtimeResult);

        case 'enum_match':
          // TODO: Implement enum_match evaluator
          return this.createNotImplementedResult(assertion);

        case 'contains_topic':
          // TODO: Implement contains_topic evaluator
          return this.createNotImplementedResult(assertion);

        case 'threshold_numeric':
          // TODO: Implement threshold_numeric evaluator
          return this.createNotImplementedResult(assertion);

        default:
          return {
            assertion,
            status: 'FAIL',
            message: `Unknown assertion type: ${assertion.type}`,
            evaluatedAt: new Date().toISOString()
          };
      }
    } catch (error) {
      return {
        assertion,
        status: 'FAIL',
        message: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        evaluatedAt: new Date().toISOString()
      };
    }
  }

  private sortAssertionsByPriority(assertions: SpecAssertion[]): SpecAssertion[] {
    const priorityOrder = [
      'error_handler_check',
      'context_injection_audit',
      'schema_match',
      'enum_match',
      'classification_check',
      'threshold_numeric',
      'not_contains',
      'contains_topic',
      'side_effect_check',
      'llm_judge',
      'perspective_check'
    ];

    return assertions.slice().sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);

      // Unknown types go last
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;

      return aPriority - bPriority;
    });
  }

  private isStaticAssertion(assertionType: string): boolean {
    return [
      'error_handler_check',
      'context_injection_audit',
      'schema_match',
      'enum_match',
      'classification_check',
      'threshold_numeric'
    ].includes(assertionType);
  }

  private createMissingRuntimeResult(assertion: SpecAssertion): AssertionResult {
    return {
      assertion,
      status: 'FAIL',
      message: 'Runtime result required for this assertion type but not provided',
      evaluatedAt: new Date().toISOString()
    };
  }

  private createNotImplementedResult(assertion: SpecAssertion): AssertionResult {
    return {
      assertion,
      status: 'WARN',
      message: `Assertion type "${assertion.type}" not yet implemented`,
      evaluatedAt: new Date().toISOString()
    };
  }

  private compileAssessmentResult(results: AssertionResult[]): AssessmentResult {
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARN').length;

    let overallStatus: 'PASS' | 'FAIL' | 'WARN';
    if (failCount > 0) {
      overallStatus = 'FAIL';
    } else if (warnCount > 0) {
      overallStatus = 'WARN';
    } else {
      overallStatus = 'PASS';
    }

    return {
      passCount,
      failCount,
      warnCount,
      assertions: results,
      overallStatus,
      evaluatedAt: new Date().toISOString()
    };
  }
}