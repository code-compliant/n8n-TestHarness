import type { AssessmentResult } from '../domain/models/assessment-result';
import type { RuntimeResult } from '../domain/models/runtime-result';
import type { FixDelta } from '../domain/models/fix-delta';

export class FixDeltaBuilder {
  buildFixDelta(
    iterationNumber: number,
    assessmentResult: AssessmentResult,
    runtimeResult?: RuntimeResult
  ): FixDelta {
    const failedAssertions = assessmentResult.assertions
      .filter(result => result.status === 'FAIL')
      .map(result => ({
        assertionType: result.assertion.type,
        target: result.assertion.target,
        expected: result.expected,
        actual: result.actual,
        suggestedFix: this.generateSuggestedFix(result.assertion.type, result.message, result.actual, result.expected)
      }));

    const runtimeErrors = runtimeResult?.errors || [];

    const generatorPrompt = this.buildGeneratorPrompt(
      iterationNumber,
      failedAssertions,
      runtimeErrors
    );

    return {
      iterationNumber,
      failedAssertions,
      runtimeErrors,
      generatorPrompt
    };
  }

  private generateSuggestedFix(
    assertionType: string,
    message: string,
    actual: unknown,
    expected: unknown
  ): string {
    switch (assertionType) {
      case 'classification_check':
        return `Update the classification logic to return one of: ${JSON.stringify(expected)}. Currently returning: ${JSON.stringify(actual)}`;

      case 'perspective_check':
        return 'Ensure the system prompt includes Chris\'s role context and the output is written from the consultant\'s perspective, not the client\'s.';

      case 'context_injection_audit':
        return 'Add required role context tokens (Chris, Dorian, consultant, engineer, MD) to the LLM node\'s system prompt.';

      case 'schema_match':
        return `Ensure the output includes all required fields: ${JSON.stringify(expected)}. Missing or incorrect fields detected.`;

      case 'error_handler_check':
        return 'Wire the error handler workflow (RumKLiLA2onXkppj) to handle failures in this workflow.';

      case 'side_effect_check':
        return 'Ensure the target node executes successfully and produces the expected output.';

      case 'not_contains':
        return `Remove forbidden patterns from the output: ${JSON.stringify(expected)}`;

      case 'llm_judge':
        return 'Review the LLM output quality. The judge found issues with semantic correctness or formatting.';

      default:
        return `Fix the ${assertionType} assertion: ${message}`;
    }
  }

  private buildGeneratorPrompt(
    iterationNumber: number,
    failedAssertions: any[],
    runtimeErrors: any[]
  ): string {
    let prompt = `🔄 ITERATION ${iterationNumber} - FIX REQUIRED\n\n`;

    prompt += `The previous workflow candidate failed validation. Please fix the following issues:\n\n`;

    // Add assertion failures
    if (failedAssertions.length > 0) {
      prompt += `## ASSERTION FAILURES (${failedAssertions.length})\n\n`;

      failedAssertions.forEach((failure, index) => {
        prompt += `${index + 1}. **${failure.assertionType}** on "${failure.target}"\n`;
        prompt += `   Expected: ${JSON.stringify(failure.expected)}\n`;
        prompt += `   Actual: ${JSON.stringify(failure.actual)}\n`;
        prompt += `   Fix: ${failure.suggestedFix}\n\n`;
      });
    }

    // Add runtime errors
    if (runtimeErrors.length > 0) {
      prompt += `## RUNTIME ERRORS (${runtimeErrors.length})\n\n`;

      runtimeErrors.forEach((error, index) => {
        prompt += `${index + 1}. **${error.errorType}** in "${error.nodeName}"\n`;
        prompt += `   Error: ${error.errorMessage}\n`;
        prompt += `   Fix: Debug and resolve the runtime error in this node\n\n`;
      });
    }

    prompt += `## INSTRUCTIONS\n\n`;
    prompt += `Please generate an updated workflow that addresses ALL the issues listed above.\n`;
    prompt += `Focus on the specific failures - don't regenerate the entire workflow from scratch.\n`;
    prompt += `Keep all working parts unchanged and only fix the problematic areas.\n\n`;

    prompt += `Return the corrected workflow JSON that will pass all quality assertions.`;

    return prompt;
  }
}