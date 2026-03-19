import { hashContent } from '../shared/util/hash';
import { EvidenceBundle, TestExecutionResult, ValidationStatus } from '../domain/models/validation';

export interface EvidenceOptions {
  fixturePath: string;
  startedAt: string;
  completedAt: string;
}

function buildRerunScript(candidateId: string, fixturePath: string): string {
  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    '# Deterministic rerun script for validation',
    `node --import tsx ./scripts/rerun-validation.ts --candidate-id "${candidateId}" --fixtures "${fixturePath}"`,
  ].join('\n');
}

export function createEvidenceBundle(
  runId: string,
  candidateId: string,
  status: ValidationStatus,
  fixtureResults: TestExecutionResult[],
  options: EvidenceOptions,
): EvidenceBundle {
  const fixtures = fixtureResults.map((result) => ({
    fixtureId: result.fixtureId,
    status: result.status,
    inputHash: hashContent(result.substitutedInput),
    outputHash: result.outputHash,
    syntheticEvent: result.syntheticEvent ?? null,
    substitutions: result.substitutions,
    inputDiff: result.inputDiff,
  }));

  const inputDiffMap: Record<string, typeof fixtureResults[number]['inputDiff']> = {};
  for (const result of fixtureResults) {
    inputDiffMap[result.fixtureId] = result.inputDiff;
  }

  const durationMs = fixtureResults.length * 10;
  const rerunScript = buildRerunScript(candidateId, options.fixturePath);
  const checksum = hashContent({ runId, candidateId, fixturePath: options.fixturePath });

  return {
    runId,
    candidateId,
    status,
    fixtures,
    timing: {
      startedAt: options.startedAt,
      completedAt: options.completedAt,
      durationMs,
    },
    inputDiffMap,
    rerun: {
      script: rerunScript,
      fixturePath: options.fixturePath,
      checksum,
    },
  };
}
