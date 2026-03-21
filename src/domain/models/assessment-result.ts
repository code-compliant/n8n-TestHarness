import type { SpecAssertion } from './requirement-spec';

export type AssertionStatus = 'PASS' | 'FAIL' | 'WARN';

export interface AssertionResult {
  assertion: SpecAssertion;
  status: AssertionStatus;
  actual?: unknown;
  expected?: unknown;
  message: string;
  evaluatedAt: string;
}

export interface AssessmentResult {
  passCount: number;
  failCount: number;
  warnCount: number;
  assertions: AssertionResult[];
  overallStatus: 'PASS' | 'FAIL' | 'WARN';
  evaluatedAt: string;
}