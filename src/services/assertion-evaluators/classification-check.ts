import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { RuntimeResult } from '../../domain/models/runtime-result';

export function evaluateClassificationCheck(
  assertion: SpecAssertion,
  runtimeResult: RuntimeResult
): AssertionResult {
  const spec = assertion.spec as any;
  const allowedValues = spec?.allowedValues;

  if (!allowedValues || !Array.isArray(allowedValues)) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No allowed values specified in assertion',
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
      status: 'FAIL',
      actual: null,
      expected: allowedValues,
      message: `Node "${assertion.target}" produced no output`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const output = extractOutputValue(targetNodeResult.output);

  if (allowedValues.includes(output)) {
    return {
      assertion,
      status: 'PASS',
      actual: output,
      expected: allowedValues,
      message: `Output value "${output}" is within allowed set`,
      evaluatedAt: new Date().toISOString()
    };
  } else {
    return {
      assertion,
      status: 'FAIL',
      actual: output,
      expected: allowedValues,
      message: `Output value "${output}" is not in allowed set: [${allowedValues.join(', ')}]`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

function extractOutputValue(output: unknown): string {
  if (typeof output === 'string') {
    return output.trim();
  }

  if (Array.isArray(output) && output.length > 0) {
    return extractOutputValue(output[0]);
  }

  if (typeof output === 'object' && output !== null) {
    // Try common field names for classification output
    const commonFields = ['classification', 'category', 'class', 'tag', 'value', 'result'];
    for (const field of commonFields) {
      if (field in output && typeof (output as any)[field] === 'string') {
        return (output as any)[field].trim();
      }
    }

    // If no common field found, stringify the object
    return JSON.stringify(output);
  }

  return String(output);
}