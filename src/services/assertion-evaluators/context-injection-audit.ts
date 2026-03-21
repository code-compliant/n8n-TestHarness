import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { WorkflowDefinition } from '../n8n-api-client';

export function evaluateContextInjectionAudit(
  assertion: SpecAssertion,
  workflowDefinition: WorkflowDefinition
): AssertionResult {
  const requiredTokens = (assertion.spec as any)?.requiredTokens;

  if (!requiredTokens || !Array.isArray(requiredTokens)) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No required tokens specified in assertion',
      evaluatedAt: new Date().toISOString()
    };
  }

  const targetNode = findNodeByName(workflowDefinition, assertion.target);

  if (!targetNode) {
    return {
      assertion,
      status: 'FAIL',
      actual: 'Node not found',
      expected: assertion.target,
      message: `Target node "${assertion.target}" not found in workflow`,
      evaluatedAt: new Date().toISOString()
    };
  }

  // Check if it's an LLM node type
  if (!isLLMNode(targetNode)) {
    return {
      assertion,
      status: 'WARN',
      message: `Node "${assertion.target}" is not an LLM node, context injection audit not applicable`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const systemPrompt = extractSystemPrompt(targetNode);

  if (!systemPrompt) {
    return {
      assertion,
      status: 'FAIL',
      actual: 'No system prompt found',
      expected: 'System prompt with required tokens',
      message: `No system prompt found in LLM node "${assertion.target}"`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const foundTokens = requiredTokens.filter(token =>
    systemPrompt.toLowerCase().includes(token.toLowerCase())
  );

  if (foundTokens.length > 0) {
    return {
      assertion,
      status: 'PASS',
      actual: foundTokens,
      expected: requiredTokens,
      message: `Found required context tokens: ${foundTokens.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  } else {
    return {
      assertion,
      status: 'FAIL',
      actual: 'No required tokens found',
      expected: requiredTokens,
      message: `System prompt missing required context tokens: ${requiredTokens.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

function findNodeByName(workflow: WorkflowDefinition, nodeName: string): any {
  if (!workflow.nodes) return null;

  return workflow.nodes.find(node =>
    node.name === nodeName || (node as any).id === nodeName
  );
}

function isLLMNode(node: any): boolean {
  const llmNodeTypes = [
    'OpenAI',
    'OpenAI Chat Model',
    'Anthropic',
    'ChatGPT',
    'LangChain',
    'Ollama',
    'Cohere',
    'Hugging Face'
  ];

  return llmNodeTypes.includes(node.type) ||
         node.type?.includes('LLM') ||
         node.type?.includes('Chat') ||
         node.type?.includes('AI');
}

function extractSystemPrompt(node: any): string | null {
  // Different LLM nodes might store system prompts in different places
  const possiblePaths = [
    'parameters.systemMessage',
    'parameters.system',
    'parameters.prompt.system',
    'parameters.messages.system',
    'parameters.options.systemMessage'
  ];

  for (const path of possiblePaths) {
    const value = getNestedValue(node, path);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}