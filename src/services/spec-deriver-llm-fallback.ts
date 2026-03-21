import type { SpecAssertion } from '../domain/models/requirement-spec';

interface LLMInferenceResult {
  assertions: Array<{
    feature: string;
    type: string;
    target: string;
    spec: unknown;
  }>;
}

export class SpecDeriverLLMFallback {
  async inferAssertions(workflowDefinition: unknown, functionalRequirements: string[]): Promise<SpecAssertion[]> {
    const prompt = this.buildInferencePrompt(workflowDefinition, functionalRequirements);

    try {
      // TODO: Integrate with actual LLM client when available
      // For now, return basic structural assertions based on workflow analysis
      const mockResponse = await this.mockLLMCall(prompt);
      return this.parseInferenceResponse(mockResponse);
    } catch (error) {
      console.error('LLM inference failed:', error);
      throw new Error(`Failed to infer assertions via LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildInferencePrompt(workflowDefinition: unknown, functionalRequirements: string[]): string {
    const workflowStr = JSON.stringify(workflowDefinition, null, 2);

    return `
You are analyzing an n8n workflow definition to infer quality assertions.

Functional Requirements:
${functionalRequirements.map(fr => `- ${fr}`).join('\n')}

Workflow Definition:
${workflowStr}

Based on the node names, types, and functional requirements, generate assertions to verify the workflow behaves correctly.

Return a JSON object with this structure:
{
  "assertions": [
    {
      "feature": "classify|reply|calculate|etc",
      "type": "schema_match|classification_check|side_effect_check|etc",
      "target": "node_name",
      "spec": { /* type-specific assertion parameters */ }
    }
  ]
}

Focus on structural and error-handler assertions. Do not include the global error handler check as it's added automatically.
`;
  }

  private async mockLLMCall(prompt: string): Promise<LLMInferenceResult> {
    // Mock implementation - in real scenario this would call an LLM service
    console.log('LLM inference prompt length:', prompt.length);

    return {
      assertions: [
        {
          feature: 'output',
          type: 'schema_match',
          target: 'main_output',
          spec: { requiredFields: ['status'] }
        },
        {
          feature: 'process',
          type: 'side_effect_check',
          target: 'main_process',
          spec: { requiredOutput: true }
        }
      ]
    };
  }

  private parseInferenceResponse(response: LLMInferenceResult): SpecAssertion[] {
    return response.assertions.map((assertion, index) => ({
      id: `llm-inferred-${index + 1}`,
      feature: assertion.feature,
      type: assertion.type as any,
      target: assertion.target,
      spec: assertion.spec
    }));
  }
}