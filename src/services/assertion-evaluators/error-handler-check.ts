import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { WorkflowDefinition } from '../n8n-api-client';

export function evaluateErrorHandlerCheck(
  assertion: SpecAssertion,
  workflowDefinition: WorkflowDefinition
): AssertionResult {
  const expectedWorkflowId = (assertion.spec as any)?.workflowId;

  if (!expectedWorkflowId) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No expected workflow ID specified in assertion',
      evaluatedAt: new Date().toISOString()
    };
  }

  // Look for error handler configuration in workflow
  const errorHandlerFound = findErrorHandler(workflowDefinition, expectedWorkflowId);

  if (errorHandlerFound) {
    return {
      assertion,
      status: 'PASS',
      actual: expectedWorkflowId,
      expected: expectedWorkflowId,
      message: `Error handler workflow ${expectedWorkflowId} is properly configured`,
      evaluatedAt: new Date().toISOString()
    };
  } else {
    return {
      assertion,
      status: 'FAIL',
      actual: 'Not found',
      expected: expectedWorkflowId,
      message: `Error handler workflow ${expectedWorkflowId} not found or not configured`,
      evaluatedAt: new Date().toISOString()
    };
  }
}

function findErrorHandler(workflow: WorkflowDefinition, expectedWorkflowId: string): boolean {
  // Check if workflow has error handling configuration
  // This would depend on n8n's specific error handling setup

  // Check global workflow settings
  if ((workflow as any).settings?.errorWorkflow === expectedWorkflowId) {
    return true;
  }

  // Check individual nodes for error handler references
  if (workflow.nodes) {
    for (const node of workflow.nodes) {
      if (node.onError === expectedWorkflowId ||
          (node as any).errorWorkflow === expectedWorkflowId ||
          (node as any).continueOnFail === true) {
        return true;
      }
    }
  }

  return false;
}