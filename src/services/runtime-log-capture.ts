import { RuntimeResult, NodeResult, RuntimeFailure } from '../domain/models/runtime-result';

export class RuntimeLogCapture {
  parseExecutionLog(logData: unknown): RuntimeResult {
    if (!logData || typeof logData !== 'object') {
      throw new Error('Invalid execution log data');
    }

    const data = logData as any;
    const executionId = data.id || data.executionId || 'unknown';

    const nodeResults: NodeResult[] = [];
    const errors: RuntimeFailure[] = [];

    // Parse n8n execution data structure
    if (data.data && data.data.resultData && data.data.resultData.runData) {
      for (const [nodeId, nodeData] of Object.entries(data.data.resultData.runData)) {
        this.parseNodeData(nodeId, nodeData as any, executionId, nodeResults, errors);
      }
    }

    // Check for execution-level errors
    if (data.data && data.data.resultData && data.data.resultData.error) {
      errors.push({
        nodeId: 'execution',
        nodeName: 'Execution Error',
        errorMessage: data.data.resultData.error.message || 'Unknown execution error',
        errorType: data.data.resultData.error.name || 'ExecutionError',
        executionId
      });
    }

    const status = errors.length > 0 ? 'failed' : 'success';

    return {
      executionId,
      status,
      nodeResults,
      errors,
      startedAt: data.startedAt || new Date().toISOString(),
      completedAt: data.stoppedAt || new Date().toISOString()
    };
  }

  private parseNodeData(
    nodeId: string,
    nodeData: any,
    executionId: string,
    nodeResults: NodeResult[],
    errors: RuntimeFailure[]
  ): void {
    const runs = Array.isArray(nodeData) ? nodeData : [nodeData];

    for (const run of runs) {
      if (run.error) {
        errors.push({
          nodeId,
          nodeName: run.nodeName || nodeId,
          errorMessage: run.error.message || 'Node execution failed',
          errorType: run.error.name || 'NodeError',
          executionId
        });
      } else if (run.data) {
        nodeResults.push({
          nodeId,
          nodeName: run.nodeName || nodeId,
          output: run.data.main || run.data,
          executionTime: run.executionTime
        });
      }
    }
  }

  extractErrorSummary(result: RuntimeResult): string {
    if (result.errors.length === 0) {
      return 'No errors';
    }

    const errorSummaries = result.errors.map(error =>
      `${error.nodeName}: ${error.errorMessage}`
    );

    return errorSummaries.join('; ');
  }

  extractSuccessfulNodes(result: RuntimeResult): string[] {
    return result.nodeResults.map(node => node.nodeName);
  }
}