import { JourneyClassification, JourneyType, NormalizedIntake } from '../../domain/models/intake';

export interface RequestSummaryContract {
  request_id: string;
  intent: string;
  targets: string[];
  risk_hints: string[];
  next_action: string;
  journey: JourneyType;
  confidence: number;
  blocked: boolean;
  pattern_suggestions?: Array<{
    pattern_id: string;
    name: string;
    score: number;
    reason: string;
  }>;
  pattern_applied?: {
    pattern_id: string;
    source: 'intake' | 'generation';
  } | null;
}

const RISK_HINTS: Record<JourneyType, string[]> = {
  new: [
    'No existing workflow id; a fresh candidate will be created.',
    'Review generated diff before any environment change.',
  ],
  modify: [
    'Workflow identifier is required for precise targeting.',
    'Only allowed fields should be changed for safety.',
  ],
  repair: [
    'Failure context should be present for deterministic repair scope.',
    'Apply scoped fixes only to failure-causing section.',
  ],
  upgrade: [
    'Preserve placeholder values in upgrade candidate.',
    'Expect downstream policy evaluation before deployment.',
  ],
  test: [
    'Simulated payload is required for deterministic replay.',
    'Do not promote until validation artifacts pass.',
  ],
  rollback: [
    'Rollback changes must reference a known-good baseline.',
    'Coordinate with approver for production state transition.',
  ],
};

const NEXT_ACTION_BY_JOURNEY: Record<JourneyType, string> = {
  new: 'generate_candidate',
  modify: 'load_target_and_apply_delta',
  repair: 'run_repair_flow_after_summary',
  upgrade: 'build_upgrade_candidate',
  test: 'run_fixture_validation',
  rollback: 'prepare_controlled_rollback',
};

function normalizeTargets(intake: NormalizedIntake): string[] {
  const targets: string[] = [];
  if (intake.workflowIdentifier) {
    targets.push(`workflow:${intake.workflowIdentifier}`);
  }
  if (intake.failurePayload) {
    targets.push('incident:evidence');
  }
  return targets.length > 0 ? targets : ['global'];
}

export function buildRequestSummary(
  requestId: string,
  intake: NormalizedIntake,
  classification: JourneyClassification,
  options?: {
    patternSuggestions?: RequestSummaryContract['pattern_suggestions'];
    patternApplied?: RequestSummaryContract['pattern_applied'];
  },
): RequestSummaryContract {
  const blocked = classification.confidence < 0.6;
  const journey = classification.journey;

  return {
    request_id: requestId,
    journey,
    confidence: classification.confidence,
    intent: intake.text || '(empty intent)',
    targets: normalizeTargets(intake),
    risk_hints: RISK_HINTS[journey],
    next_action: blocked
      ? 'request_clarification_before_execution'
      : NEXT_ACTION_BY_JOURNEY[journey],
    blocked,
    pattern_suggestions: options?.patternSuggestions,
    pattern_applied: options?.patternApplied ?? null,
  };
}
