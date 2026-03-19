export type JourneyType = 'new' | 'modify' | 'repair' | 'upgrade' | 'test' | 'rollback';

export interface IntakePayload {
  source: 'telegram' | 'api' | 'unknown';
  actor: string;
  raw: unknown;
  text?: string;
  workflowIdentifier?: string | null;
  failurePayload?: unknown;
  policy?: Record<string, unknown> | string[];
  contextFlags?: Record<string, unknown>;
  patternChoice?: string | null;
  receivedAt?: string;
  traceId?: string;
}

export interface NormalizedIntake {
  source: 'telegram' | 'api' | 'unknown';
  actor: string;
  text: string;
  workflowIdentifier?: string | null;
  failurePayload?: unknown;
  policyHints?: Record<string, unknown> | string[] | null;
  contextFlags?: Record<string, unknown>;
  patternChoice?: string | null;
  receivedAt: string;
  traceId?: string;
  rawPayload: string;
}

export interface JourneyClassification {
  journey: JourneyType;
  confidence: number;
  reason: string;
  matchedSignals: string[];
}

export interface IntakeSummaryArtifact {
  request_id: string;
  journey: JourneyType;
  actor: string;
  source: 'telegram' | 'api' | 'unknown';
  confidence: number;
  intent: string;
  targets: string[];
  risk_hints: string[];
  next_action: string;
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

export interface IntakeRecord {
  request_id: string;
  source: 'telegram' | 'api' | 'unknown';
  actor: string;
  journey: JourneyType;
  confidence: number;
  reason: string;
  status: 'received' | 'blocked' | 'ready';
  summary: string;
  rawPayload: string;
  workflowIdentifier?: string | null;
  createdAt: string;
}
