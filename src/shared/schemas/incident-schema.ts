import { createHash } from 'node:crypto';

import { IncidentInput, NormalizedIncident } from '../../domain/models/incident';

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

function normalizeWorkflowId(payload: Record<string, unknown>): string {
  const workflowId =
    payload.workflowId ??
    payload.workflow_id ??
    payload.workflowIdentifier ??
    payload.workflow_identifier ??
    payload.workflow ??
    '';

  if (!workflowId) {
    throw new Error('Incident payload missing workflow id');
  }

  return String(workflowId);
}

function normalizeSource(payload: Record<string, unknown>): string {
  return String(payload.source ?? 'runtime');
}

function normalizeActor(payload: Record<string, unknown>): string {
  return String(payload.actor ?? payload.operator ?? payload.user ?? 'system');
}

export function normalizeIncidentPayload(raw: IncidentInput | Record<string, unknown>): NormalizedIncident {
  const payload = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const workflowId = normalizeWorkflowId(payload);
  const errorContext = payload.errorContext ?? payload.error_context ?? payload.error ?? null;
  const eventPayload = payload.payload ?? payload.eventPayload ?? payload.event_payload ?? null;
  const runSnapshot = payload.runSnapshot ?? payload.run_snapshot ?? payload.snapshot ?? null;
  const occurredAt = String(payload.occurredAt ?? payload.occurred_at ?? new Date().toISOString());

  return {
    workflowId,
    errorContext,
    payload: eventPayload,
    runSnapshot,
    source: normalizeSource(payload),
    actor: normalizeActor(payload),
    occurredAt,
    rawPayload: stableStringify(redactSensitiveValues(payload)),
  };
}

export function createDeterministicIncidentId(incident: NormalizedIncident): string {
  const seed = stableStringify({
    workflowId: incident.workflowId,
    errorContext: incident.errorContext,
    payload: incident.payload,
    runSnapshot: incident.runSnapshot,
  });
  const digest = createHash('sha256').update(seed).digest('hex');
  return `inc_${digest.slice(0, 16)}`;
}

export function createDeterministicRepairRequestId(incidentId: string): string {
  const digest = createHash('sha256').update(incidentId).digest('hex');
  return `repair_req_${digest.slice(0, 16)}`;
}

export function createDeterministicCandidateId(incidentId: string): string {
  const digest = createHash('sha256').update(`candidate:${incidentId}`).digest('hex');
  return `candidate_${digest.slice(0, 16)}`;
}

export function createDeterministicEvidenceId(candidateId: string, incidentId: string): string {
  const digest = createHash('sha256').update(`${candidateId}:${incidentId}`).digest('hex');
  return `evidence_${digest.slice(0, 16)}`;
}

export function createDeterministicOutcomeId(incidentId: string, recoveryType: string): string {
  const digest = createHash('sha256').update(`${incidentId}:${recoveryType}`).digest('hex');
  return `outcome_${digest.slice(0, 16)}`;
}
