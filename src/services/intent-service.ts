import { createDeterministicRequestId, classifyJourney, isLowConfidence, normalizeIntakePayload } from '../shared/schemas/intake-schema';
import { buildRequestSummary } from '../shared/telemetry/request-summary';
import { SQLiteIntakeRepository } from '../infra/persistence/sqlite/repositories/intake-repository';
import { IntakeRecord, IntakeSummaryArtifact } from '../domain/models/intake';
import { PatternService } from './pattern-service';

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export interface CaptureInput {
  source?: 'telegram' | 'api' | 'unknown' | string;
  actor?: string;
  [key: string]: unknown;
}

export interface CaptureOutput {
  request_id: string;
  route: string;
  blocked: boolean;
  next_action: string;
  summary: IntakeSummaryArtifact;
  persistedRecord: IntakeRecord;
  confidence: number;
  journey: 'new' | 'modify' | 'repair' | 'upgrade' | 'test' | 'rollback';
}

export class IntentService {
  constructor(
    private readonly repository: SQLiteIntakeRepository,
    private readonly patternService?: PatternService,
  ) {}

  capture(input: CaptureInput): CaptureOutput {
    const normalized = normalizeIntakePayload(input as unknown);
    const classification = classifyJourney(normalized);
    const requestId = createDeterministicRequestId(normalized);
    const blocked = isLowConfidence(classification.confidence) || classification.confidence < LOW_CONFIDENCE_THRESHOLD;
    const integrationHint =
      normalized.contextFlags && typeof normalized.contextFlags.integration === 'string'
        ? normalized.contextFlags.integration
        : null;

    const rawSuggestions = this.patternService
      ? this.patternService.suggestPatterns({
          text: normalized.text,
          workflowIdentifier: normalized.workflowIdentifier,
          integration: integrationHint,
        })
      : undefined;

    const patternSuggestions = rawSuggestions?.map((suggestion) => ({
      pattern_id: suggestion.pattern_id,
      name: suggestion.name,
      score: suggestion.score,
      reason: suggestion.reason,
    }));

    const patternApplied =
      normalized.patternChoice && this.patternService
        ? this.patternService.recordPatternApplication({
            request_id: requestId,
            pattern_id: normalized.patternChoice,
            applied_by: normalized.actor,
            source: 'intake',
          })
        : null;

    const summary = buildRequestSummary(
      requestId,
      normalized,
      {
        ...classification,
        journey: classification.journey,
      },
      {
        patternSuggestions,
        patternApplied: patternApplied
          ? { pattern_id: patternApplied.pattern_id, source: patternApplied.source }
          : null,
      },
    );
    const now = new Date().toISOString();

    const persistedRecord = this.repository.saveRequest({
      requestId,
      intake: normalized,
      journey: classification.journey,
      confidence: classification.confidence,
      reason: classification.reason,
      status: blocked ? 'blocked' : 'ready',
      summary: JSON.stringify(summary),
      createdAt: now,
    });

    return {
      request_id: requestId,
      route: blocked ? 'clarification' : classification.journey,
      blocked,
      next_action: summary.next_action,
      summary,
      persistedRecord,
      confidence: classification.confidence,
      journey: classification.journey,
    };
  }
}
