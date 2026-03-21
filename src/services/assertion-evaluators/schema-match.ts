import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { RuntimeResult } from '../../domain/models/runtime-result';

export function evaluateSchemaMatch(
  assertion: SpecAssertion,
  runtimeResult: RuntimeResult
): AssertionResult {
  const spec = assertion.spec as any;
  const requiredFields = spec?.requiredFields;

  if (!requiredFields || !Array.isArray(requiredFields)) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No required fields specified in assertion',
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
      expected: requiredFields,
      message: `Node "${assertion.target}" produced no output`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const output = Array.isArray(targetNodeResult.output) ? targetNodeResult.output[0] : targetNodeResult.output;

  if (typeof output !== 'object' || output === null) {
    return {
      assertion,
      status: 'FAIL',
      actual: typeof output,
      expected: 'object',
      message: `Node output is not an object, got ${typeof output}`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const missingFields = requiredFields.filter(field => !(field in output));
  const presentFields = requiredFields.filter(field => field in output);

  if (missingFields.length === 0) {
    return {
      assertion,
      status: 'PASS',
      actual: presentFields,
      expected: requiredFields,
      message: `All required fields present: ${presentFields.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  } else {
    return {
      assertion,
      status: 'FAIL',
      actual: presentFields,
      expected: requiredFields,
      message: `Missing required fields: ${missingFields.join(', ')}`,
      evaluatedAt: new Date().toISOString()
    };
  }
}