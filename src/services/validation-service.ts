import { resolve } from 'node:path';

import { CandidateDefinition, ValidationOutcome } from '../domain/models/validation';
import { hashContent } from '../shared/util/hash';
import { loadFixtures, MissingFixtureError } from './fixture-loader';
import { executeDeterministicTest } from './test-execution-service';
import { createEvidenceBundle } from './evidence-service';
import { classifyFailure } from './failure-taxonomy-service';
import { SQLiteFailureRepository } from '../infra/persistence/sqlite/repositories/failure-repository';

export interface ValidationOptions {
  fixturesPath?: string;
  simulationMode?: boolean;
  timestamp?: string;
}

function deterministicTimestamp(value?: string): string {
  return value ?? '1970-01-01T00:00:00.000Z';
}

export class ValidationService {
  constructor(private readonly failureRepository: SQLiteFailureRepository) {}

  run(candidate: CandidateDefinition, options: ValidationOptions = {}): ValidationOutcome {
    const startedAt = deterministicTimestamp(options.timestamp);
    const fixturePath = options.fixturesPath
      ? resolve(options.fixturesPath, `${candidate.candidateId}.json`)
      : resolve(process.cwd(), 'data', 'fixtures', 'validation', `${candidate.candidateId}.json`);
    const failures = [] as ValidationOutcome['failures'];
    let fixtureResults: ValidationOutcome['fixtureResults'] = [];
    let status: ValidationOutcome['status'] = 'pass';

    try {
      const fixtureSet = loadFixtures(candidate.candidateId, { fixturesPath: options.fixturesPath });
      const runId = `run_${hashContent({ candidate, fixtures: fixtureSet })}`;
      fixtureResults = fixtureSet.fixtures.map((fixture) =>
        executeDeterministicTest(candidate, fixture, { simulationMode: options.simulationMode }),
      );
      status = fixtureResults.some((result) => result.status === 'fail') ? 'fail' : 'pass';

      if (status === 'fail') {
        for (const result of fixtureResults.filter((entry) => entry.status === 'fail')) {
          const failure = classifyFailure({
            runId,
            candidateId: candidate.candidateId,
            summary: `Fixture ${result.fixtureId} output mismatch`,
            details: JSON.stringify({
              expectedOutputHash: result.expectedOutputHash,
              outputHash: result.outputHash,
            }),
            failureClass: 'fixture_mismatch',
            createdAt: startedAt,
          });
          failures.push(this.failureRepository.insertFailureRecord(failure));
        }
      }

      const evidence = createEvidenceBundle(runId, candidate.candidateId, status, fixtureResults, {
        fixturePath,
        startedAt,
        completedAt: startedAt,
      });

      return {
        runId,
        candidateId: candidate.candidateId,
        status,
        fixtureResults,
        evidence,
        failures,
      };
    } catch (error) {
      if (error instanceof MissingFixtureError) {
        const runId = `run_${hashContent({ candidateId: candidate.candidateId, missing: true })}`;
        const failure = classifyFailure({
          runId,
          candidateId: candidate.candidateId,
          summary: 'Missing fixture input',
          details: error.message,
          failureClass: 'fixture_missing',
          createdAt: startedAt,
        });
        failures.push(this.failureRepository.insertFailureRecord(failure));
        const evidence = createEvidenceBundle(runId, candidate.candidateId, 'fail', [], {
          fixturePath,
          startedAt,
          completedAt: startedAt,
        });
        return {
          runId,
          candidateId: candidate.candidateId,
          status: 'fail',
          fixtureResults: [],
          evidence,
          failures,
        };
      }

      const runId = `run_${hashContent({ candidateId: candidate.candidateId, error: true })}`;
      const failure = classifyFailure({
        runId,
        candidateId: candidate.candidateId,
        summary: 'Execution error',
        details: (error as Error).message ?? 'Unknown error',
        failureClass: 'execution_error',
        createdAt: startedAt,
      });
      failures.push(this.failureRepository.insertFailureRecord(failure));
      const evidence = createEvidenceBundle(runId, candidate.candidateId, 'fail', [], {
        fixturePath,
        startedAt,
        completedAt: startedAt,
      });
      return {
        runId,
        candidateId: candidate.candidateId,
        status: 'fail',
        fixtureResults: [],
        evidence,
        failures,
      };
    }
  }
}
