import { EventEmitter } from 'events';

export type LoopEventType =
  | 'loop_started'
  | 'iteration_started'
  | 'assertion_result'
  | 'iteration_complete'
  | 'loop_complete'
  | 'loop_aborted'
  | 'loop_timeout';

export interface LoopEvent {
  type: LoopEventType;
  timestamp: string;
  data: unknown;
}

export interface LoopStartedEvent {
  loopId: string;
  workflowSlug: string;
  maxIterations: number;
  timeoutHours: number;
}

export interface IterationStartedEvent {
  loopId: string;
  iterationNumber: number;
  maxIterations: number;
}

export interface AssertionResultEvent {
  loopId: string;
  iterationNumber: number;
  assertionId: string;
  assertionType: string;
  target: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

export interface IterationCompleteEvent {
  loopId: string;
  iterationNumber: number;
  status: 'PASS' | 'FAIL';
  passCount: number;
  failCount: number;
  warnCount: number;
}

export interface LoopCompleteEvent {
  loopId: string;
  status: 'PASS' | 'EXHAUSTED' | 'ABORTED' | 'TIMEOUT';
  iterationsCompleted: number;
  reportPath?: string;
}

export class LoopEventBus extends EventEmitter {
  private static instance: LoopEventBus | null = null;

  static getInstance(): LoopEventBus {
    if (!LoopEventBus.instance) {
      LoopEventBus.instance = new LoopEventBus();
    }
    return LoopEventBus.instance;
  }

  emitLoopStarted(data: LoopStartedEvent): void {
    this.emitEvent('loop_started', data);
  }

  emitIterationStarted(data: IterationStartedEvent): void {
    this.emitEvent('iteration_started', data);
  }

  emitAssertionResult(data: AssertionResultEvent): void {
    this.emitEvent('assertion_result', data);
  }

  emitIterationComplete(data: IterationCompleteEvent): void {
    this.emitEvent('iteration_complete', data);
  }

  emitLoopComplete(data: LoopCompleteEvent): void {
    this.emitEvent('loop_complete', data);
  }

  emitLoopAborted(data: { loopId: string; triggeredBy: string }): void {
    this.emitEvent('loop_aborted', data);
  }

  emitLoopTimeout(data: { loopId: string }): void {
    this.emitEvent('loop_timeout', data);
  }

  private emitEvent(type: LoopEventType, data: unknown): void {
    const event: LoopEvent = {
      type,
      timestamp: new Date().toISOString(),
      data
    };

    console.log(`LoopEventBus: ${type}`, event.data);
    this.emit('loop_event', event);
    this.emit(type, event);
  }

  subscribeToEvents(callback: (event: LoopEvent) => void): void {
    this.on('loop_event', callback);
  }

  unsubscribeFromEvents(callback: (event: LoopEvent) => void): void {
    this.off('loop_event', callback);
  }

  // Helper method to get recent events for new dashboard connections
  getRecentEvents(loopId: string): LoopEvent[] {
    // In a real implementation, this would maintain a buffer of recent events
    // For now, return empty array as events are streamed live
    return [];
  }
}