import { execSync } from 'child_process';
import type { SpecAssertion } from '../domain/models/requirement-spec';

interface LLMInferenceResult {
  assertions: Array<{
    feature: string;
    type: string;
    target: string;
    spec: unknown;
  }>;
}

/**
 * Queries the n8n-docs MCP server via mcporter for documentation context.
 * Returns relevant doc chunks for the given query, or empty string on failure.
 */
function queryN8nDocs(query: string): string {
  try {
    const result = execSync(
      `mcporter call n8n-docs.search_n8n_knowledge_sources --args '${JSON.stringify({ query })}'`,
      { timeout: 15000, encoding: 'utf-8' }
    );
    const parsed = JSON.parse(result);
    const chunks: Array<{ source_url: string; content: string }> =
      parsed?.results ?? parsed?.output?.results ?? [];
    return chunks
      .slice(0, 3)
      .map(c => `[${c.source_url}]\n${c.content}`)
      .join('\n\n');
  } catch {
    // Non-fatal — proceed without docs context
    return '';
  }
}

export class SpecDeriverLLMFallback {
  async inferAssertions(workflowDefinition: unknown, functionalRequirements: string[]): Promise<SpecAssertion[]> {
    // Identify unique node types in the workflow to query relevant docs
    const nodes = (workflowDefinition as any)?.nodes ?? [];
    const nodeTypes: string[] = [...new Set(nodes.map((n: any) => n.type as string))];

    // Query n8n-docs for each unknown node type (cap at 3 queries to stay fast)
    const docsContext = nodeTypes
      .slice(0, 3)
      .map(t => queryN8nDocs(`How does the n8n ${t} node work and what are its output fields?`))
      .filter(Boolean)
      .join('\n\n---\n\n');

    const prompt = this.buildInferencePrompt(workflowDefinition, functionalRequirements, docsContext);

    try {
      const mockResponse = await this.mockLLMCall(prompt);
      return this.parseInferenceResponse(mockResponse);
    } catch (error) {
      console.error('LLM inference failed:', error);
      throw new Error(`Failed to infer assertions via LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildInferencePrompt(workflowDefinition: unknown, functionalRequirements: string[], docsContext: string): string {
    const workflowStr = JSON.stringify(workflowDefinition, null, 2);

    return `
You are analyzing an n8n workflow definition to infer quality assertions.

Functional Requirements:
${functionalRequirements.map(fr => `- ${fr}`).join('\n')}

${docsContext ? `Relevant n8n Documentation:\n${docsContext}\n` : ''}
Workflow Definition:
${workflowStr}

Based on the node names, types, documentation context, and functional requirements, generate assertions to verify the workflow behaves correctly.

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

Focus on structural and error-handler assertions. Do not include the global error handler check as it is added automatically.
`;
  }

  private async mockLLMCall(prompt: string): Promise<LLMInferenceResult> {
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