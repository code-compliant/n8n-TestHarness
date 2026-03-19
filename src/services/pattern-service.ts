import { createHash } from 'node:crypto';

import {
  IntegrationContext,
  PatternApplicationRecord,
  PatternMatchInput,
  PatternMetadata,
  PatternRecordInput,
  PatternSuggestion,
} from '../domain/models/patterns';
import { SQLitePatternRepository } from '../infra/persistence/sqlite/repositories/pattern-repository';
import { SQLiteKnowledgeRepository } from '../infra/persistence/sqlite/repositories/knowledge-repository';

const DEFAULT_CONTEXT: IntegrationContext = { integrations: [], operations: [], keywords: [] };

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function createPatternId(input: PatternRecordInput): string {
  const seed = JSON.stringify({
    name: input.name,
    integration: input.integration,
    tags: (input.tags ?? []).slice().sort(),
    workflowIdentifiers: (input.workflowIdentifiers ?? []).slice().sort(),
  });
  return `pattern_${createHash('sha256').update(seed).digest('hex').slice(0, 12)}`;
}

function deriveIntegrationContext(input: PatternRecordInput): IntegrationContext {
  const keywords = tokenize([input.name, input.description].join(' '));
  const integrations = [input.integration, ...keywords.filter((token) => token.includes('api'))];
  const operations = keywords.filter((token) => token.includes('sync') || token.includes('fetch'));
  return {
    integrations: Array.from(new Set(integrations.filter(Boolean))),
    operations: Array.from(new Set(operations)),
    keywords: Array.from(new Set(keywords)),
  };
}

export class PatternService {
  constructor(
    private readonly repository: SQLitePatternRepository,
    private readonly knowledgeRepository?: SQLiteKnowledgeRepository,
  ) {}

  recordSuccessfulCandidate(input: PatternRecordInput): PatternMetadata {
    const now = new Date().toISOString();
    const patternId = createPatternId(input);
    const context = input.context ?? deriveIntegrationContext(input);
    const tags = input.tags ?? [];
    const workflowIdentifiers = input.workflowIdentifiers ?? [];

    const metadata: PatternMetadata = {
      pattern_id: patternId,
      name: input.name,
      description: input.description,
      integration: input.integration,
      tags,
      workflow_identifiers: workflowIdentifiers,
      context,
      success_count: 1,
      last_success_at: now,
      quality_score: input.qualityScore ?? 0,
      created_at: now,
      updated_at: now,
      source_request_id: input.requestId,
    };

    return this.repository.savePattern(metadata);
  }

  recordPatternApplication(record: Omit<PatternApplicationRecord, 'applied_at'>): PatternApplicationRecord {
    const applied: PatternApplicationRecord = {
      ...record,
      applied_at: new Date().toISOString(),
    };
    this.repository.recordPatternApplication(applied);
    return applied;
  }

  suggestPatterns(input: PatternMatchInput, limit = 3): PatternSuggestion[] {
    const tokens = tokenize(input.text ?? '');
    const patterns = this.repository.searchByContext({
      integration: input.integration ?? null,
      tokens,
    });
    const hints = this.knowledgeRepository?.getQualityHints() ?? [];

    const scored = patterns.map((pattern) => {
      let score = pattern.quality_score;
      const reasons: string[] = [];

      if (input.integration && pattern.integration === input.integration) {
        score += 1.5;
        reasons.push('integration match');
      }

      if (input.workflowIdentifier && pattern.workflow_identifiers.includes(input.workflowIdentifier)) {
        score += 1;
        reasons.push('workflow match');
      }

      const tagMatches = pattern.tags.filter((tag) => tokens.includes(tag.toLowerCase()));
      if (tagMatches.length > 0) {
        score += tagMatches.length * 0.4;
        reasons.push(`tag match: ${tagMatches.join(', ')}`);
      }

      const keywordMatches = pattern.context.keywords.filter((keyword) => tokens.includes(keyword));
      if (keywordMatches.length > 0) {
        score += Math.min(1, keywordMatches.length * 0.15);
        reasons.push('keyword match');
      }

      const hintDelta = hints
        .filter((hint) =>
          (hint.scope === 'integration' && hint.target === pattern.integration) ||
          (hint.scope === 'pattern' && hint.target === pattern.pattern_id),
        )
        .reduce((total, hint) => total + hint.score_delta, 0);

      if (hintDelta !== 0) {
        score += hintDelta;
        reasons.push('quality hint adjustment');
      }

      return {
        pattern_id: pattern.pattern_id,
        name: pattern.name,
        integration: pattern.integration,
        score: Number(score.toFixed(2)),
        reason: reasons.join('; ') || 'context match',
      } satisfies PatternSuggestion;
    });

    return scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
