import type { RalphLoopStatus } from './ralph-loop';
import type { AssertionResult } from './assessment-result';

export interface RalphReport {
  workflowSlug: string;
  status: RalphLoopStatus;
  iterationsRun: number;
  maxIterations: number;
  generatedAt: string;
  requirementsCoverage: RequirementCoverageEntry[];
  iterationLog: IterationLogEntry[];
  suggestedNextSteps: string[];
}

export interface RequirementCoverageEntry {
  functionalRequirement: string;
  assertion: string;
  status: 'PASS' | 'FAIL' | 'WARN';
}

export interface IterationLogEntry {
  iterationNumber: number;
  status: 'PASS' | 'FAIL';
  runtimeErrors: string[];
  failedAssertions: string[];
  fixApplied?: string;
}