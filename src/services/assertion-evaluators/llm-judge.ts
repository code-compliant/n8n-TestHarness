import type { SpecAssertion } from '../../domain/models/requirement-spec';
import type { AssertionResult } from '../../domain/models/assessment-result';
import type { RuntimeResult } from '../../domain/models/runtime-result';
import { LLMJudgeClient } from '../llm-judge-client';

export async function evaluateLLMJudge(
  assertion: SpecAssertion,
  runtimeResult: RuntimeResult
): Promise<AssertionResult> {
  const spec = assertion.spec as any;
  const judgePromptPath = spec?.judgePromptPath;

  if (!judgePromptPath) {
    return {
      assertion,
      status: 'FAIL',
      message: 'No judge prompt path specified in assertion',
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
      expected: 'Output to evaluate',
      message: `Node "${assertion.target}" produced no output to evaluate`,
      evaluatedAt: new Date().toISOString()
    };
  }

  try {
    const judgeClient = new LLMJudgeClient();
    const judgeResult = await judgeClient.evaluateOutput(judgePromptPath, targetNodeResult.output);

    switch (judgeResult.result) {
      case 'CORRECT':
        return {
          assertion,
          status: 'PASS',
          actual: 'CORRECT',
          expected: 'CORRECT',
          message: `LLM judge: ${judgeResult.reason}`,
          evaluatedAt: new Date().toISOString()
        };

      case 'WRONG':
        return {
          assertion,
          status: 'FAIL',
          actual: 'WRONG',
          expected: 'CORRECT',
          message: `LLM judge: ${judgeResult.reason}`,
          evaluatedAt: new Date().toISOString()
        };

      case 'UNCLEAR':
        return {
          assertion,
          status: 'WARN',
          actual: 'UNCLEAR',
          expected: 'CORRECT',
          message: `LLM judge: ${judgeResult.reason}`,
          evaluatedAt: new Date().toISOString()
        };

      default:
        return {
          assertion,
          status: 'FAIL',
          actual: judgeResult.result,
          expected: 'CORRECT',
          message: `Unexpected judge result: ${judgeResult.result}`,
          evaluatedAt: new Date().toISOString()
        };
    }
  } catch (error) {
    return {
      assertion,
      status: 'FAIL',
      actual: 'Judge evaluation error',
      expected: 'Successful evaluation',
      message: `LLM judge evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      evaluatedAt: new Date().toISOString()
    };
  }
}