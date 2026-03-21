import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { RuntimeResult } from '../../domain/models/runtime-result';

export function evaluateNotContains(
  assertion: SpecAssertion,
  runtimeResult: RuntimeResult
): AssertionResult {
  const spec = assertion.spec as any;
  const forbiddenPatterns = spec?.forbiddenPatterns;

  if (!forbiddenPatterns || !Array.isArray(forbiddenPatterns)) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No forbidden patterns specified in assertion',
      evaluatedAt: new Date().toISOString()
    };
  }

  const targetNodeResult = runtimeResult.nodeResults.find(
    node => node.nodeName === assertion.target || node.nodeId === assertion.target
  );

  if (!targetNodeResult) {
    return {
      assertion,
      status: 'FAIL',
      actual: 'Node not found in execution results',
      expected: assertion.target,
      message: `Target node "${assertion.target}" not found in runtime results`,
      evaluatedAt: new Date().toISOString()
    };
  }

  if (!targetNodeResult.output) {
    return {
      assertion,
      status: 'WARN',
      actual: null,
      expected: 'Output to check',
      message: `Node "${assertion.target}" produced no output to check`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const outputText = extractTextFromOutput(targetNodeResult.output);
  const foundPatterns = [];

  for (const pattern of forbiddenPatterns) {
    if (typeof pattern === 'string') {
      if (outputText.toLowerCase().includes(pattern.toLowerCase())) {
        foundPatterns.push(pattern);
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(outputText)) {
        foundPatterns.push(pattern.toString());
      }
    }
  }

  if (foundPatterns.length === 0) {
    return {
      assertion,
      status: 'PASS',
      actual: 'No forbidden patterns found',
      expected: 'No forbidden patterns',
      message: `Output does not contain forbidden patterns: ${forbiddenPatterns.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  } else {
    return {
      assertion,
      status: 'FAIL',
      actual: foundPatterns,
      expected: 'No forbidden patterns',
      message: `Output contains forbidden patterns: ${foundPatterns.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

function extractTextFromOutput(output: unknown): string {
  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output)) {
    return output.map(extractTextFromOutput).join(' ');
  }

  if (typeof output === 'object' && output !== null) {
    // Extract text from common text fields
    const textFields = ['text', 'content', 'message', 'body', 'description', 'value'];
    for (const field of textFields) {
      if (field in output && typeof (output as any)[field] === 'string') {
        return (output as any)[field];
      }
    }

    // If no text field found, stringify the object
    return JSON.stringify(output);
  }

  return String(output);
}