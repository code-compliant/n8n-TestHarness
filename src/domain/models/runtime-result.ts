export interface RuntimeFailure {
  nodeId: string;
  nodeName: string;
  errorMessage: string;
  errorType: string;
  executionId: string;
}

export interface NodeResult {
  nodeId: string;
  nodeName: string;
  output: unknown;
  executionTime?: number;
}

export interface RuntimeResult {
  executionId: string;
  status: 'success' | 'failed' | 'timeout';
  nodeResults: NodeResult[];
  errors: RuntimeFailure[];
  startedAt: string;
  completedAt?: string;
}