import type Database from 'better-sqlite3';
import type { RalphLoopRecord, RalphLoopSignal, RalphLoopStatus } from '../domain/models/ralph-loop';
import type { QualityContract } from '../domain/models/quality-contract';
import type { WorkflowDefinition } from './n8n-api-client';
import type { AssessmentResult } from '../domain/models/assessment-result';
import type { RuntimeResult } from '../domain/models/runtime-result';

import { InactivityTimer } from './inactivity-timer';
import { FixDeltaBuilder } from './fix-delta-builder';
import { GeneratorAdapter } from './generator-adapter';
import { SemanticQualityAssessor } from './semantic-quality-assessor';
import { N8nApiClient } from './n8n-api-client';
import { RuntimeLogCapture } from './runtime-log-capture';

export interface LoopInitializationOptions {
  workflowSlug: string;
  contract: QualityContract;
  initialWorkflow: WorkflowDefinition;
  maxIterations?: number;
  timeoutHours?: number;
}

export interface LoopIterationResult {
  iterationNumber: number;
  status: 'PASS' | 'FAIL' | 'TIMEOUT';
  assessmentResult?: AssessmentResult;
  runtimeResult?: RuntimeResult;
  error?: string;
}

export class RalphLoopOrchestrator {
  private readonly db: Database.Database;
  private readonly inactivityTimer: InactivityTimer;
  private readonly fixDeltaBuilder: FixDeltaBuilder;
  private readonly generatorAdapter: GeneratorAdapter;
  private readonly qualityAssessor: SemanticQualityAssessor;
  private readonly n8nClient: N8nApiClient;
  private readonly logCapture: RuntimeLogCapture;

  private currentLoop?: RalphLoopRecord;

  constructor(db: Database.Database) {
    this.db = db;
    this.inactivityTimer = new InactivityTimer();
    this.fixDeltaBuilder = new FixDeltaBuilder();
    this.generatorAdapter = new GeneratorAdapter();
    this.qualityAssessor = new SemanticQualityAssessor();
    this.n8nClient = new N8nApiClient();
    this.logCapture = new RuntimeLogCapture();
  }

  async startLoop(options: LoopInitializationOptions): Promise<string> {
    const loopId = this.generateLoopId();
    const maxIterations = options.maxIterations || 5;
    const timeoutHours = options.timeoutHours || 3;

    // Create loop record
    const loopRecord: RalphLoopRecord = {
      loopId,
      workflowSlug: options.workflowSlug,
      status: 'INITIALISING',
      currentIteration: 0,
      maxIterations,
      startedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString(),
      dashboardToken: this.generateDashboardToken()
    };

    this.insertLoopRecord(loopRecord);
    this.currentLoop = loopRecord;

    // Start inactivity timer
    this.inactivityTimer.start(loopId, (loopId) => this.handleTimeout(loopId));

    console.log(`Started Ralph Loop ${loopId} for workflow ${options.workflowSlug}`);

    try {
      // Run the loop
      const result = await this.runLoopIterations(options.contract, options.initialWorkflow);
      await this.completeLoop(result.status);
      return loopId;
    } catch (error) {
      await this.completeLoop('EXHAUSTED');
      throw error;
    }
  }

  async abortLoop(loopId: string, triggeredBy: string): Promise<void> {
    if (!this.currentLoop || this.currentLoop.loopId !== loopId) {
      throw new Error(`Loop ${loopId} is not currently running`);
    }

    console.log(`Aborting Ralph Loop ${loopId} by ${triggeredBy}`);

    // Record the abort signal
    const signal: RalphLoopSignal = {
      signalId: this.generateSignalId(),
      loopId,
      signalType: 'abort',
      triggeredBy,
      triggeredAt: new Date().toISOString()
    };

    this.insertSignal(signal);
    await this.completeLoop('ABORTED');
  }

  private async runLoopIterations(
    contract: QualityContract,
    workflow: WorkflowDefinition
  ): Promise<LoopIterationResult> {
    let currentWorkflow = workflow;

    for (let iteration = 1; iteration <= this.currentLoop!.maxIterations; iteration++) {
      // Check for abort signal
      if (this.hasAbortSignal()) {
        return { iterationNumber: iteration, status: 'FAIL' };
      }

      this.updateLoopIteration(iteration);
      this.resetInactivityTimer();

      console.log(`Ralph Loop iteration ${iteration}/${this.currentLoop!.maxIterations}`);

      try {
        const iterationResult = await this.runSingleIteration(contract, currentWorkflow, iteration);

        if (iterationResult.status === 'PASS') {
          console.log(`Ralph Loop passed on iteration ${iteration}`);
          return iterationResult;
        }

        if (iteration === this.currentLoop!.maxIterations) {
          console.log(`Ralph Loop exhausted after ${iteration} iterations`);
          return { iterationNumber: iteration, status: 'FAIL' };
        }

        // Generate fix for next iteration
        if (iterationResult.assessmentResult) {
          const fixDelta = this.fixDeltaBuilder.buildFixDelta(
            iteration,
            iterationResult.assessmentResult,
            iterationResult.runtimeResult
          );

          const generatorResponse = await this.generatorAdapter.generateWorkflow(fixDelta.generatorPrompt);

          if (generatorResponse.success && generatorResponse.workflow) {
            currentWorkflow = generatorResponse.workflow;
            console.log(`Generated fix for iteration ${iteration + 1}`);
          } else {
            console.error(`Generator failed for iteration ${iteration}:`, generatorResponse.error);
            return { iterationNumber: iteration, status: 'FAIL', error: generatorResponse.error };
          }
        }

      } catch (error) {
        console.error(`Iteration ${iteration} failed:`, error);
        return {
          iterationNumber: iteration,
          status: 'FAIL',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return { iterationNumber: this.currentLoop!.maxIterations, status: 'FAIL' };
  }

  private async runSingleIteration(
    contract: QualityContract,
    workflow: WorkflowDefinition,
    iterationNumber: number
  ): Promise<LoopIterationResult> {
    console.log(`Running iteration ${iterationNumber}: deploy → execute → assess`);

    try {
      // Deploy workflow to test environment
      const deployResponse = await this.n8nClient.deployWorkflow(workflow);
      console.log(`Deployed workflow: ${deployResponse.workflowId}`);

      // Execute workflow and capture results
      const executionId = await this.n8nClient.triggerExecution(deployResponse.workflowId);
      const runtimeResult = await this.n8nClient.waitForExecution(executionId);

      // Clean up test workflow
      await this.n8nClient.deleteWorkflow(deployResponse.workflowId);

      // Assess quality
      const assessmentResult = await this.qualityAssessor.assess({
        contract,
        workflowDefinition: workflow,
        runtimeResult
      });

      const status = assessmentResult.overallStatus === 'PASS' ? 'PASS' : 'FAIL';

      return {
        iterationNumber,
        status,
        assessmentResult,
        runtimeResult
      };

    } catch (error) {
      return {
        iterationNumber,
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async handleTimeout(loopId: string): Promise<void> {
    if (this.currentLoop && this.currentLoop.loopId === loopId) {
      console.log(`Ralph Loop ${loopId} timed out due to inactivity`);
      await this.completeLoop('TIMEOUT');
    }
  }

  private async completeLoop(finalStatus: RalphLoopStatus): Promise<void> {
    if (!this.currentLoop) return;

    this.inactivityTimer.clear();

    const stmt = this.db.prepare(`
      UPDATE ralph_loops
      SET status = ?, completedAt = ?
      WHERE loopId = ?
    `);

    stmt.run(finalStatus, new Date().toISOString(), this.currentLoop.loopId);

    console.log(`Ralph Loop ${this.currentLoop.loopId} completed with status: ${finalStatus}`);
    this.currentLoop = undefined;
  }

  private updateLoopIteration(iteration: number): void {
    if (!this.currentLoop) return;

    const stmt = this.db.prepare(`
      UPDATE ralph_loops
      SET currentIteration = ?, lastActionAt = ?, status = ?
      WHERE loopId = ?
    `);

    stmt.run(iteration, new Date().toISOString(), 'ITERATING', this.currentLoop.loopId);
    this.currentLoop.currentIteration = iteration;
    this.currentLoop.status = 'ITERATING';
  }

  private resetInactivityTimer(): void {
    if (this.currentLoop) {
      this.inactivityTimer.reset(this.currentLoop.loopId, (loopId) => this.handleTimeout(loopId));
    }
  }

  private hasAbortSignal(): boolean {
    if (!this.currentLoop) return false;

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ralph_loop_signals
      WHERE loopId = ? AND signalType = 'abort'
    `);

    const result = stmt.get(this.currentLoop.loopId) as { count: number };
    return result.count > 0;
  }

  private generateLoopId(): string {
    return `loop_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateDashboardToken(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private insertLoopRecord(record: RalphLoopRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO ralph_loops (loopId, workflowSlug, status, currentIteration, maxIterations, startedAt, lastActionAt, dashboardToken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.loopId,
      record.workflowSlug,
      record.status,
      record.currentIteration,
      record.maxIterations,
      record.startedAt,
      record.lastActionAt,
      record.dashboardToken
    );
  }

  private insertSignal(signal: RalphLoopSignal): void {
    const stmt = this.db.prepare(`
      INSERT INTO ralph_loop_signals (signalId, loopId, signalType, triggeredBy, triggeredAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      signal.signalId,
      signal.loopId,
      signal.signalType,
      signal.triggeredBy,
      signal.triggeredAt
    );
  }
}