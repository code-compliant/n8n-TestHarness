import { hashContent } from '../shared/util/hash';
import {
  FailureClass,
  FailureRecord,
  FailureReproducibility,
  FailureRetryability,
} from '../domain/models/validation';

export interface FailureContext {
  runId: string;
  candidateId: string;
  summary: string;
  details: string;
  failureClass: FailureClass;
  reproducibility?: FailureReproducibility;
  retryability?: FailureRetryability;
  createdAt: string;
}

const DEFAULT_REPRODUCIBILITY: Record<FailureClass, FailureReproducibility> = {
  fixture_missing: 'deterministic',
  fixture_mismatch: 'deterministic',
  execution_error: 'unknown',
  substitution_error: 'deterministic',
};

const DEFAULT_RETRYABILITY: Record<FailureClass, FailureRetryability> = {
  fixture_missing: 'non_retryable',
  fixture_mismatch: 'manual_review',
  execution_error: 'retryable',
  substitution_error: 'manual_review',
};

export function classifyFailure(context: FailureContext): FailureRecord {
  const reproducibility = context.reproducibility ?? DEFAULT_REPRODUCIBILITY[context.failureClass];
  const retryability = context.retryability ?? DEFAULT_RETRYABILITY[context.failureClass];
  const failureId = `failure_${hashContent({
    runId: context.runId,
    candidateId: context.candidateId,
    summary: context.summary,
    details: context.details,
    failureClass: context.failureClass,
    reproducibility,
    retryability,
  })}`;

  return {
    failureId,
    runId: context.runId,
    candidateId: context.candidateId,
    failureClass: context.failureClass,
    reproducibility,
    retryability,
    summary: context.summary,
    details: context.details,
    createdAt: context.createdAt,
  };
}
