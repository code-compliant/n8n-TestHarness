import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { RuntimeResult } from '../../domain/models/runtime-result';

export function evaluateSideEffectCheck(
  assertion: SpecAssertion,
  runtimeResult: RuntimeResult
): AssertionResult {
  const targetNodeResult = runtimeResult.nodeResults.find(
    node => node.nodeName === assertion.target || node.nodeId === assertion.target
  );

  if (!targetNodeResult) {
    // Check if the node failed with an error
    const nodeError = runtimeResult.errors.find(
      error => error.nodeName === assertion.target || error.nodeId === assertion.target
    );

    if (nodeError) {
      return {
        assertion,
        status: 'FAIL',
        actual: `Error: ${nodeError.errorMessage}`,
        expected: 'Successful execution with output',
        message: `Node "${assertion.target}" failed with error: ${nodeError.errorMessage}`,
        evaluatedAt: new Date().toISOString()
      };
    }

    return {
      assertion,
      status: 'FAIL',
      actual: 'Node not found in execution results',
      expected: assertion.target,
      message: `Target node "${assertion.target}" not found in runtime results`,
      evaluatedAt: new Date().toISOString()
    };
  }

  const spec = assertion.spec as any;
  const requireOutput = spec?.requiredOutput !== false; // Default to true

  if (requireOutput) {
    if (targetNodeResult.output !== undefined && targetNodeResult.output !== null) {
      return {
        assertion,
        status: 'PASS',
        actual: 'Output present',
        expected: 'Output present',
        message: `Node "${assertion.target}" executed successfully and produced output`,
        evaluatedAt: new Date().toISOString()
      };
    } else {
      return {
        assertion,
        status: 'FAIL',
        actual: 'No output',
        expected: 'Output present',
        message: `Node "${assertion.target}" executed but produced no output`,
        evaluatedAt: new Date().toISOString()
      };
    }
  } else {
    // Just check that the node executed without error
    return {
      assertion,
      status: 'PASS',
      actual: 'Executed without error',
      expected: 'Executed without error',
      message: `Node "${assertion.target}" executed successfully`,
      evaluatedAt: new Date().toISOString()
    };
  }
}