import { RuntimeResult } from '../domain/models/runtime-result';

export interface DeployWorkflowResponse {
  workflowId: string;
  name: string;
  active: boolean;
}

export interface ExecutionResponse {
  id: string;
  status: 'running' | 'success' | 'failed' | 'timeout';
  data?: unknown;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, unknown>;
  active?: boolean;
  [key: string]: unknown;
}

export class N8nApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_API_BASE_URL || 'https://n8n.5.223.42.54.sslip.io/api/v1';
    this.apiKey = process.env.N8N_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('N8N_API_KEY environment variable is required');
    }
  }

  async deployWorkflow(workflowDefinition: WorkflowDefinition): Promise<DeployWorkflowResponse> {
    const cleanWorkflow = {
      ...workflowDefinition,
      active: false,
      id: undefined // Remove ID for new deployment
    };

    const response = await this.makeRequest('POST', '/workflows', cleanWorkflow);

    return {
      workflowId: response.id,
      name: response.name,
      active: response.active
    };
  }

  async triggerExecution(workflowId: string, inputData?: unknown): Promise<string> {
    const response = await this.makeRequest('POST', `/workflows/${workflowId}/execute`, {
      data: inputData || {}
    });

    return response.data.executionId;
  }

  async pollExecutionStatus(executionId: string): Promise<ExecutionResponse> {
    const response = await this.makeRequest('GET', `/executions/${executionId}`);

    return {
      id: response.id,
      status: response.finished ? (response.data.resultData.error ? 'failed' : 'success') : 'running',
      data: response.data
    };
  }

  async getExecutionLog(executionId: string): Promise<RuntimeResult> {
    const response = await this.makeRequest('GET', `/executions/${executionId}`);

    return this.parseExecutionData(executionId, response.data);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.makeRequest('DELETE', `/workflows/${workflowId}`);
  }

  async waitForExecution(executionId: string, timeoutMs: number = 300000): Promise<RuntimeResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.pollExecutionStatus(executionId);

      if (status.status !== 'running') {
        return await this.getExecutionLog(executionId);
      }

      await this.sleep(pollInterval);
    }

    // Timeout occurred
    return {
      executionId,
      status: 'timeout',
      nodeResults: [],
      errors: [{
        nodeId: 'timeout',
        nodeName: 'Execution Timeout',
        errorMessage: 'Execution timed out after 5 minutes',
        errorType: 'execution_timeout',
        executionId
      }],
      startedAt: new Date().toISOString()
    };
  }

  async makeRequest(method: string, endpoint: string, data?: unknown): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.apiKey
    };

    const config: RequestInit = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N API error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  private parseExecutionData(executionId: string, executionData: any): RuntimeResult {
    const nodeResults = [];
    const errors = [];

    if (executionData.resultData && executionData.resultData.runData) {
      for (const [nodeId, nodeData] of Object.entries(executionData.resultData.runData as Record<string, any>)) {
        const nodeRuns = Array.isArray(nodeData) ? nodeData : [nodeData];

        for (const run of nodeRuns) {
          if (run.error) {
            errors.push({
              nodeId,
              nodeName: nodeId,
              errorMessage: run.error.message || 'Unknown error',
              errorType: run.error.name || 'RuntimeError',
              executionId
            });
          } else {
            nodeResults.push({
              nodeId,
              nodeName: nodeId,
              output: run.data || null,
              executionTime: run.executionTime
            });
          }
        }
      }
    }

    const status = errors.length > 0 ? 'failed' : 'success';

    return {
      executionId,
      status,
      nodeResults,
      errors,
      startedAt: executionData.startedAt || new Date().toISOString(),
      completedAt: executionData.stoppedAt || new Date().toISOString()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}