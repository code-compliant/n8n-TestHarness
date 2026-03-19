import { createHash } from 'node:crypto';

import {
  IntakePayload,
  JourneyClassification,
  JourneyType,
  NormalizedIntake,
} from '../../domain/models/intake';

export type IntakeSource = 'telegram' | 'api' | 'unknown';

const JOURNEY_KEYWORDS: Record<JourneyType, string[]> = {
  new: ['new', 'create', 'generate', 'build', 'provision', 'add', 'introduce'],
  modify: ['modify', 'change', 'update', 'edit', 'adjust', 'tune'],
  repair: ['repair', 'fix', 'recover', 'restore', 'heal', 'incident'],
  upgrade: ['upgrade', 'upgrade', 'migrate', 'evolve'],
  test: ['test', 'run', 'validate', 'simulate', 'dry-run', 'rehears'],
  rollback: ['rollback', 'revert', 'undo', 'restore'],
};

const LOW_CONFIDENCE_THRESHOLD = 0.6;

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]);
    return Object.fromEntries(entries);
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function normalizeSource(rawSource?: unknown): IntakeSource {
  const source = String(rawSource ?? '').toLowerCase();
  if (source === 'telegram') {
    return 'telegram';
  }

  if (source === 'api') {
    return 'api';
  }

  return 'unknown';
}

function normalizeActor(payload: Record<string, unknown>): string {
  return String(
    payload.actor ??
      payload.operator ??
      payload.user ??
      payload.username ??
      'operator',
  );
}

function normalizeText(payload: Record<string, unknown>): string {
  const rawText =
    payload.text ??
    payload.message ??
    payload.body ??
    payload.intent ??
    payload.content ??
    '';

  return String(rawText).trim();
}

function normalizeWorkflowIdentifier(payload: Record<string, unknown>): string | null {
  return (
    payload.workflowIdentifier ??
    payload.workflowId ??
    payload.workflow_id ??
    payload.workflow_identifier ??
    payload.workflow ??
    null
  ) as string | null;
}

function normalizePolicy(
  payload: Record<string, unknown>,
): Record<string, unknown> | string[] | null {
  return (payload.policy ?? payload.policyHints ?? null) as
    | Record<string, unknown>
    | string[]
    | null;
}

function normalizeFailurePayload(payload: Record<string, unknown>): unknown | null {
  return payload.failurePayload ?? payload.failure_payload ?? null;
}

function normalizeContextFlags(payload: Record<string, unknown>): Record<string, unknown> | null {
  return (payload.contextFlags ?? payload.context_flags ?? null) as Record<string, unknown> | null;
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues);
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('api_key') ||
        lower.includes('apikey') ||
        lower.includes('credential') ||
        lower.includes('authorization') ||
        lower.includes('bearer')
      ) {
        output[key] = '[redacted]';
      } else {
        output[key] = redactSensitiveValues(entry);
      }
    }
    return output;
  }

  return value;
}

function parseIntakePayload(raw: unknown): IntakePayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Intake payload must be an object');
  }

  const payload = raw as Record<string, unknown>;

  return {
    source: normalizeSource(payload.source),
    actor: normalizeActor(payload),
    raw: payload,
    text: normalizeText(payload),
    workflowIdentifier: normalizeWorkflowIdentifier(payload) as string | undefined,
    failurePayload: normalizeFailurePayload(payload),
    policy: normalizePolicy(payload) ?? undefined,
    contextFlags: normalizeContextFlags(payload) ?? undefined,
    receivedAt: payload.receivedAt as string | undefined,
    traceId: payload.trace_id as string | undefined,
  };
}

function scoreJourney(text: string, journeyType: JourneyType): number {
  const normalizedText = text.toLowerCase();
  const keywords = JOURNEY_KEYWORDS[journeyType];
  let score = 0;

  for (const keyword of keywords) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (pattern.test(normalizedText)) {
      score += 1;
    }
  }

  return score;
}

function classifyExplicitJourney(
  text: string,
): JourneyType | null {
  const normalized = text.toLowerCase();
  const explicitMap: Record<string, JourneyType> = {
    new: 'new',
    modify: 'modify',
    repair: 'repair',
    upgrade: 'upgrade',
    test: 'test',
    rollback: 'rollback',
  };

  for (const [token, journey] of Object.entries(explicitMap)) {
    if (normalized.includes(`journey=${token}`) || normalized.includes(`journey ${token}`)) {
      return journey;
    }
  }

  return null;
}

export function classifyJourney(intake: NormalizedIntake | IntakePayload): JourneyClassification {
  const inputText =
    typeof (intake as NormalizedIntake).text === 'string' ? (intake as NormalizedIntake).text : '';
  const explicitJourney = classifyExplicitJourney(inputText);
  if (explicitJourney) {
    return {
      journey: explicitJourney,
      confidence: 0.98,
      reason: 'explicit journey selector found',
      matchedSignals: [`explicit:${explicitJourney}`],
    };
  }

  const scores: Array<{ journey: JourneyType; score: number }> = (
    Object.entries(JOURNEY_KEYWORDS) as Array<[JourneyType, string[]]>
  ).map(([journey]) => ({
    journey,
    score: scoreJourney(inputText, journey),
  }));

  scores.sort((a, b) => b.score - a.score);
  const primary = scores[0];
  const secondary = scores[1];
  const signals: string[] = [];

  for (const keyword of JOURNEY_KEYWORDS[primary.journey]) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(inputText.toLowerCase())) {
      signals.push(keyword);
    }
  }

  let confidence = 0.2;
  if (primary.score > 0) {
    confidence = Math.min(0.95, 0.3 + primary.score * 0.25);
  }

  if (secondary && secondary.score === primary.score && primary.score > 0) {
    confidence -= 0.2;
  }

  if (primary.journey === 'new' && primary.score === 0 && inputText.length < 10) {
    confidence = 0.18;
  }

  const reason =
    confidence >= LOW_CONFIDENCE_THRESHOLD
      ? `matched ${signals.join(', ') || primary.journey}`
      : `low-confidence signal for ${primary.journey}`;

  return {
    journey: primary.journey,
    confidence,
    reason,
    matchedSignals: signals,
  };
}

export function createDeterministicRequestId(intake: NormalizedIntake): string {
  const seed = stableStringify({
    source: intake.source,
    actor: intake.actor,
    text: intake.text,
    workflowIdentifier: intake.workflowIdentifier,
    failurePayload: intake.failurePayload,
    policyHints: intake.policyHints,
    contextFlags: intake.contextFlags,
  });
  const digest = createHash('sha256').update(seed).digest('hex');
  return `req_${digest.slice(0, 16)}`;
}

export function normalizeIntakePayload(raw: unknown): NormalizedIntake {
  const parsed = parseIntakePayload(raw);
  const incoming = parsed.raw as Record<string, unknown>;

  const safeText = parsed.text || '';

  return {
    source: parsed.source,
    actor: parsed.actor,
    text: safeText,
    workflowIdentifier: (parsed.workflowIdentifier as string | null) ?? null,
    failurePayload: parsed.failurePayload,
    policyHints: parsed.policy,
    contextFlags: parsed.contextFlags,
    receivedAt: parsed.receivedAt ?? new Date().toISOString(),
    traceId: parsed.traceId,
    rawPayload: stableStringify(redactSensitiveValues(incoming)),
  };
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}
