import { hashContent } from '../shared/util/hash';
import { applyTestSafeSubstitutions } from '../shared/util/test-substitutions';
import { CandidateDefinition, FixtureDefinition, TestExecutionResult } from '../domain/models/validation';

const SYNTHETIC_TIME = '1970-01-01T00:00:00.000Z';

export interface TestExecutionOptions {
  simulationMode?: boolean;
}

function requiresSyntheticTrigger(triggerType: string): boolean {
  return ['webhook', 'schedule', 'cron'].includes(triggerType.toLowerCase());
}

function buildSyntheticEvent(candidate: CandidateDefinition, fixture: FixtureDefinition): Record<string, unknown> {
  const eventId = `synthetic_${hashContent({ candidateId: candidate.candidateId, fixtureId: fixture.fixtureId })}`;
  return {
    event_id: eventId,
    source: 'synthetic',
    triggered_at: SYNTHETIC_TIME,
    payload: {
      candidate_id: candidate.candidateId,
      fixture_id: fixture.fixtureId,
    },
  };
}

export function executeDeterministicTest(
  candidate: CandidateDefinition,
  fixture: FixtureDefinition,
  options: TestExecutionOptions = {},
): TestExecutionResult {
  const substitution = applyTestSafeSubstitutions(fixture.input);
  const syntheticEvent = options.simulationMode || requiresSyntheticTrigger(candidate.triggerType)
    ? buildSyntheticEvent(candidate, fixture)
    : null;

  const outputHash = hashContent({
    candidate: candidate.workflow,
    input: substitution.substituted,
    syntheticEvent,
  });

  const status = fixture.expectedOutputHash && fixture.expectedOutputHash !== outputHash ? 'fail' : 'pass';

  return {
    fixtureId: fixture.fixtureId,
    status,
    outputHash,
    syntheticEvent,
    substitutions: substitution.substitutions,
    substitutedInput: substitution.substituted,
    inputDiff: substitution.diff,
    expectedOutputHash: fixture.expectedOutputHash,
  };
}
