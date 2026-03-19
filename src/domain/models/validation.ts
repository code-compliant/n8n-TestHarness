import { DiffEntry } from '../../shared/util/deep-diff';
import { SubstitutionRecord } from '../../shared/util/test-substitutions';

export interface CandidateDefinition {
  candidateId: string;
  workflow: Record<string, unknown>;
  triggerType: string;
}

export interface FixtureDefinition {
  fixtureId: string;
  input: Record<string, unknown>;
  expectedOutputHash?: string;
}

export interface FixtureSet {
  candidateId: string;
  fixtures: FixtureDefinition[];
}

export type ValidationStatus = 'pass' | 'fail';

export interface TestExecutionResult {
  fixtureId: string;
  status: ValidationStatus;
  outputHash: string;
  syntheticEvent?: Record<string, unknown> | null;
  substitutions: SubstitutionRecord[];
  substitutedInput: Record<string, unknown>;
  inputDiff: DiffEntry[];
  expectedOutputHash?: string;
}

export interface EvidenceFixtureResult {
  fixtureId: string;
  status: ValidationStatus;
  inputHash: string;
  outputHash: string;
  syntheticEvent?: Record<string, unknown> | null;
  substitutions: SubstitutionRecord[];
  inputDiff: DiffEntry[];
}

export interface EvidenceBundle {
  runId: string;
  candidateId: string;
  status: ValidationStatus;
  fixtures: EvidenceFixtureResult[];
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  inputDiffMap: Record<string, DiffEntry[]>;
  rerun: {
    script: string;
    fixturePath: string;
    checksum: string;
  };
}

export type FailureClass =
  | 'critical'
  | 'major'
  | 'minor'
  | 'fixture_missing'
  | 'fixture_mismatch'
  | 'execution_error'
  | 'substitution_error';
export type FailureReproducibility = 'deterministic' | 'nondeterministic' | 'unknown';
export type FailureRetryability = 'retryable' | 'non_retryable' | 'manual_review';

export interface FailureRecord {
  failureId: string;
  runId: string;
  candidateId: string;
  failureClass: FailureClass;
  reproducibility: FailureReproducibility;
  retryability: FailureRetryability;
  summary: string;
  details: string;
  createdAt: string;
}

export interface ValidationOutcome {
  runId: string;
  candidateId: string;
  status: ValidationStatus;
  fixtureResults: TestExecutionResult[];
  evidence: EvidenceBundle;
  failures: FailureRecord[];
}

export type ReproducibilityClass = 'always' | 'intermittent' | 'unknown';
export type RetryabilityClass = 'retryable' | 'non_retryable' | 'unknown';

export interface ValidationFailure {
  id: string;
  message: string;
  class: FailureClass;
  reproducibility: ReproducibilityClass;
  retryability: RetryabilityClass;
}

export interface ValidationEvidence {
  id: string;
  candidateId: string;
  status: 'pass' | 'fail';
  failures: ValidationFailure[];
}
