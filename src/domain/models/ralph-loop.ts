export type RalphLoopStatus = 'IDLE' | 'INITIALISING' | 'ITERATING' | 'PASS' | 'EXHAUSTED' | 'ABORTED' | 'TIMEOUT';

export interface RalphLoopRecord {
  loopId: string;
  workflowSlug: string;
  status: RalphLoopStatus;
  currentIteration: number;
  maxIterations: number;
  startedAt: string;
  lastActionAt: string;
  completedAt?: string;
  dashboardToken?: string;
}

export interface RalphLoopSignal {
  signalId: string;
  loopId: string;
  signalType: 'abort' | 'pause' | 'resume';
  triggeredBy: string;
  triggeredAt: string;
}