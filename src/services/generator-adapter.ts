import { execSync } from 'child_process';
import type { WorkflowDefinition } from './n8n-api-client';
import { WorkflowPatternSearch } from './workflow-pattern-search';

export interface GeneratorResponse {
  success: boolean;
  workflow?: WorkflowDefinition;
  error?: string;
}

/**
 * Queries the n8n-docs MCP server via mcporter for documentation context
 * relevant to a fix delta before re-prompting the generator.
 * Returns relevant doc chunks, or empty string on failure.
 */
function queryN8nDocsForFix(query: string): string {
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
    return '';
  }
}

export class GeneratorAdapter {
  private patternSearch = new WorkflowPatternSearch();

  async generateWorkflow(prompt: string): Promise<GeneratorResponse> {
    try {
      // Enrich the fix prompt with n8n-docs context before sending to the generator.
      // Extract the first failing node name from the prompt for a targeted query.
      const nodeMatch = prompt.match(/node[:\s]+["']?([A-Za-z0-9 _-]+)["']?/i);
      const nodeQuery = nodeMatch
        ? `How to correctly configure the n8n ${nodeMatch[1]} node, its parameters and output fields`
        : 'n8n workflow node configuration best practices and common errors';

      const docsContext = queryN8nDocsForFix(nodeQuery);

      // Search for relevant workflow patterns based on failing node types and workflow family keywords
      const failingNodeTypes = nodeMatch ? [nodeMatch[1]] : [];
      const workflowKeywords = this.extractWorkflowKeywords(prompt);
      const patternMatches = this.patternSearch.search({
        nodeTypes: failingNodeTypes,
        keywords: workflowKeywords
      }, 3);

      // If top match has score >= 4, inject the matched workflow nodes array as reference scaffold
      let scaffoldContext = '';
      if (patternMatches.length > 0 && patternMatches[0].score >= 4) {
        const topMatch = patternMatches[0];
        scaffoldContext = `\n\n--- Reference workflow scaffold ---\n${topMatch.name} nodes: [${topMatch.nodeTypes.join(', ')}]\n`;
      }

      const enrichedPrompt = docsContext || scaffoldContext
        ? `${prompt}\n\n--- Relevant n8n Documentation ---\n${docsContext}${scaffoldContext}`
        : prompt;

      const mockWorkflow = await this.mockGeneratorCall(enrichedPrompt);

      return {
        success: true,
        workflow: mockWorkflow
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown generator error'
      };
    }
  }

  private extractWorkflowKeywords(prompt: string): string[] {
    const keywords: string[] = [];
    const lowercasePrompt = prompt.toLowerCase();

    // Extract workflow family keywords from the prompt
    const workflowFamilyTerms = [
      'email', 'slack', 'webhook', 'api', 'database', 'schedule', 'trigger',
      'automation', 'notification', 'processing', 'integration', 'sync',
      'classification', 'analysis', 'monitoring', 'reporting', 'backup'
    ];

    workflowFamilyTerms.forEach(term => {
      if (lowercasePrompt.includes(term)) {
        keywords.push(term);
      }
    });

    return keywords;
  }

  private async mockGeneratorCall(prompt: string): Promise<WorkflowDefinition> {
    console.log('Generator prompt length:', prompt.length);

    // Mock workflow generation based on prompt content
    const workflow: WorkflowDefinition = {
      name: 'Generated Workflow',
      nodes: [
        {
          id: 'start',
          name: 'Webhook',
          type: 'Webhook',
          parameters: {
            httpMethod: 'POST',
            path: 'webhook'
          }
        }
      ],
      connections: {},
      active: false
    };

    // Add nodes based on prompt content
    if (prompt.toLowerCase().includes('classification')) {
      workflow.nodes.push({
        id: 'classifier',
        name: 'Email Classifier',
        type: 'Function',
        parameters: {
          functionCode: `
            const classification = items[0].json.content.includes('urgent') ? 'urgent' : 'routine';
            return [{ json: { classification } }];
          `
        }
      });
    }

    if (prompt.toLowerCase().includes('llm') || prompt.toLowerCase().includes('perspective')) {
      workflow.nodes.push({
        id: 'llm',
        name: 'Email Composer',
        type: 'OpenAI',
        parameters: {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are Chris, Managing Director of Dorian Engineering Consultants. Respond professionally to client emails.'
            },
            {
              role: 'user',
              content: '{{ $json.content }}'
            }
          ]
        }
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return workflow;
  }
}