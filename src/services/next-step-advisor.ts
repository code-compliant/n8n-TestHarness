import type { FixDelta } from '../domain/models/fix-delta';

export class NextStepAdvisor {
  async generateNextSteps(finalFailureDelta: FixDelta): Promise<string[]> {
    try {
      // TODO: Replace with actual LLM client when available
      const mockResponse = await this.mockLLMCall(finalFailureDelta);
      return this.parseNextStepsResponse(mockResponse);
    } catch (error) {
      console.error('Next steps generation failed:', error);
      return this.generateFallbackNextSteps(finalFailureDelta);
    }
  }

  private async mockLLMCall(delta: FixDelta): Promise<string> {
    // Mock implementation - in real scenario this would call an LLM service
    console.log('Generating next steps for final failure delta...');

    const prompt = this.buildNextStepsPrompt(delta);

    // Simple mock logic based on failure types
    const suggestions: string[] = [];

    if (delta.runtimeErrors.length > 0) {
      suggestions.push('Review and fix runtime errors in the failing nodes');
      suggestions.push('Check credential configuration and API connectivity');
    }

    if (delta.failedAssertions.some(a => a.assertionType === 'llm_judge')) {
      suggestions.push('Review LLM prompt engineering and output quality expectations');
    }

    if (delta.failedAssertions.some(a => a.assertionType === 'classification_check')) {
      suggestions.push('Refine classification logic or expand allowed value sets');
    }

    if (delta.failedAssertions.some(a => a.assertionType === 'context_injection_audit')) {
      suggestions.push('Update system prompts to include required role context');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review workflow logic and quality contract requirements');
      suggestions.push('Consider manual debugging of the workflow in n8n interface');
    }

    suggestions.push('Update quality contract if requirements have changed');

    return suggestions.join('\n');
  }

  private buildNextStepsPrompt(delta: FixDelta): string {
    let prompt = 'Based on the following workflow failures after 5 iterations, suggest concrete next steps:\n\n';

    if (delta.failedAssertions.length > 0) {
      prompt += 'Failed Assertions:\n';
      delta.failedAssertions.forEach(assertion => {
        prompt += `- ${assertion.assertionType}: ${assertion.suggestedFix}\n`;
      });
      prompt += '\n';
    }

    if (delta.runtimeErrors.length > 0) {
      prompt += 'Runtime Errors:\n';
      delta.runtimeErrors.forEach(error => {
        prompt += `- ${error.errorType} in ${error.nodeName}: ${error.errorMessage}\n`;
      });
      prompt += '\n';
    }

    prompt += 'Provide 3-5 actionable next steps for the developer to resolve these issues.';

    return prompt;
  }

  private parseNextStepsResponse(response: string): string[] {
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return lines.slice(0, 5); // Limit to 5 suggestions
  }

  private generateFallbackNextSteps(delta: FixDelta): string[] {
    const steps: string[] = [];

    // Add steps based on failure types
    if (delta.runtimeErrors.length > 0) {
      steps.push('Debug runtime errors in the n8n workflow interface');
      steps.push('Verify all credentials and external service connections');
    }

    if (delta.failedAssertions.length > 0) {
      const assertionTypes = new Set(delta.failedAssertions.map(a => a.assertionType));

      if (assertionTypes.has('llm_judge') || assertionTypes.has('perspective_check')) {
        steps.push('Review and improve LLM prompts for better output quality');
      }

      if (assertionTypes.has('classification_check')) {
        steps.push('Update classification logic or allowed value sets');
      }

      if (assertionTypes.has('context_injection_audit')) {
        steps.push('Add required role context to LLM system prompts');
      }

      if (assertionTypes.has('schema_match')) {
        steps.push('Ensure workflow outputs include all required fields');
      }

      if (assertionTypes.has('error_handler_check')) {
        steps.push('Configure error handling workflow (RumKLiLA2onXkppj)');
      }
    }

    // Add generic fallback steps
    if (steps.length === 0) {
      steps.push('Review workflow logic against quality contract requirements');
      steps.push('Test workflow manually in n8n interface');
    }

    steps.push('Consider updating quality contract if requirements have changed');

    return steps.slice(0, 5);
  }
}