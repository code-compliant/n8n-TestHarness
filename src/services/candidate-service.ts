import { createHash } from 'node:crypto';

import { CandidateDiffPackage, CandidateJourney, CandidateRecord, CandidateWorkflow, PlaceholderOccurrence } from '../domain/models/candidate';
import { stableStringify } from '../shared/util/stable-stringify';
import { SQLiteCandidateRepository } from '../infra/persistence/sqlite/repositories/candidate-repository';

const PLACEHOLDER_PATTERN = /\{\{[^}]+\}\}/;
const PLACEHOLDER_GLOBAL = /\{\{[^}]+\}\}/g;

export interface GenerateCandidateInput {
  request_id: string;
  actor: string;
  journey: CandidateJourney;
  workflow_identifier?: string | null;
  base_workflow?: CandidateWorkflow | null;
  proposed_workflow?: CandidateWorkflow | null;
  intent_summary?: string;
}

export interface GenerateCandidateOutput {
  candidate_id: string;
  diff: CandidateDiffPackage;
  placeholders: PlaceholderOccurrence[];
  persistedRecord: CandidateRecord;
}

function hashObject(value: unknown): string {
  const digest = createHash('sha256').update(stableStringify(value)).digest('hex');
  return digest.slice(0, 16);
}

function buildDeterministicCandidateId(input: GenerateCandidateInput, candidate: CandidateWorkflow): string {
  const seed = {
    request_id: input.request_id,
    journey: input.journey,
    workflow_identifier: input.workflow_identifier ?? null,
    base_hash: hashObject(input.base_workflow ?? {}),
    candidate_hash: hashObject(candidate),
  };

  const digest = createHash('sha256').update(stableStringify(seed)).digest('hex');
  return `candidate_${digest.slice(0, 16)}`;
}

function defaultCandidateWorkflow(input: GenerateCandidateInput): CandidateWorkflow {
  return {
    id: input.workflow_identifier ?? undefined,
    name: input.intent_summary ?? 'generated workflow candidate',
    nodes: [],
    connections: {},
    metadata: {
      intent: input.intent_summary ?? null,
      request_id: input.request_id,
      generated_at: new Date().toISOString(),
    },
  };
}

function extractPlaceholderOccurrences(value: unknown, path = ''): PlaceholderOccurrence[] {
  if (typeof value === 'string') {
    const matches = value.match(PLACEHOLDER_GLOBAL) ?? [];
    return matches.map((token) => ({ path, token }));
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => extractPlaceholderOccurrences(entry, `${path}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      extractPlaceholderOccurrences(entry, path ? `${path}.${key}` : key),
    );
  }

  return [];
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) {
    return;
  }
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0);

  let cursor: Record<string, unknown> | Array<unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    const nextKey = segments[index + 1];
    if (Array.isArray(cursor)) {
      const arrayIndex = Number(key);
      if (!cursor[arrayIndex]) {
        cursor[arrayIndex] = Number.isNaN(Number(nextKey)) ? {} : [];
      }
      cursor = cursor[arrayIndex] as Record<string, unknown> | Array<unknown>;
    } else {
      if (!(key in cursor)) {
        cursor[key] = Number.isNaN(Number(nextKey)) ? {} : [];
      }
      cursor = cursor[key] as Record<string, unknown> | Array<unknown>;
    }
  }

  const lastKey = segments[segments.length - 1];
  if (Array.isArray(cursor)) {
    const arrayIndex = Number(lastKey);
    cursor[arrayIndex] = value;
  } else {
    cursor[lastKey] = value as unknown;
  }
}

function getByPath(value: unknown, path: string): unknown {
  if (!path) {
    return value;
  }
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment.length > 0);

  let cursor: unknown = value;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    if (Array.isArray(cursor)) {
      cursor = cursor[Number(segment)];
    } else if (typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return cursor;
}

function preservePlaceholders(base: CandidateWorkflow, regenerated: CandidateWorkflow): { patched: CandidateWorkflow; placeholders: PlaceholderOccurrence[] } {
  const placeholders = extractPlaceholderOccurrences(base);
  if (placeholders.length === 0) {
    return { patched: regenerated, placeholders };
  }

  const patched = JSON.parse(JSON.stringify(regenerated)) as CandidateWorkflow;
  for (const placeholder of placeholders) {
    const currentValue = getByPath(patched, placeholder.path);
    if (typeof currentValue === 'string' && PLACEHOLDER_PATTERN.test(currentValue)) {
      continue;
    }

    if (currentValue !== undefined) {
      setByPath(patched as Record<string, unknown>, placeholder.path, placeholder.token);
    }
  }

  return { patched, placeholders };
}

function diffObjects(base: unknown, candidate: unknown, path = ''): CandidateDiffPackage['changes'] {
  const changes: CandidateDiffPackage['changes'] = [];

  const baseString = stableStringify(base);
  const candidateString = stableStringify(candidate);
  if (baseString === candidateString) {
    return changes;
  }

  if (base === undefined) {
    changes.push({ path, changeType: 'add', after: candidate });
    return changes;
  }

  if (candidate === undefined) {
    changes.push({ path, changeType: 'remove', before: base });
    return changes;
  }

  if (typeof base !== 'object' || base === null || typeof candidate !== 'object' || candidate === null) {
    changes.push({ path, changeType: 'modify', before: base, after: candidate });
    return changes;
  }

  if (Array.isArray(base) || Array.isArray(candidate)) {
    const baseArray = Array.isArray(base) ? base : [];
    const candidateArray = Array.isArray(candidate) ? candidate : [];
    const max = Math.max(baseArray.length, candidateArray.length);
    for (let index = 0; index < max; index += 1) {
      changes.push(...diffObjects(baseArray[index], candidateArray[index], `${path}[${index}]`));
    }
    return changes;
  }

  const baseObj = base as Record<string, unknown>;
  const candidateObj = candidate as Record<string, unknown>;
  const keys = new Set([...Object.keys(baseObj), ...Object.keys(candidateObj)]);
  for (const key of keys) {
    const nextPath = path ? `${path}.${key}` : key;
    changes.push(...diffObjects(baseObj[key], candidateObj[key], nextPath));
  }

  return changes;
}

function mapSectionChanges(
  base: CandidateWorkflow,
  candidate: CandidateWorkflow,
  changes: CandidateDiffPackage['changes'],
): CandidateDiffPackage['section_changes'] {
  const sections: Record<string, CandidateDiffPackage['section_changes'][number]> = {};
  const baseNodes = Array.isArray(base.nodes) ? base.nodes : [];
  const candidateNodes = Array.isArray(candidate.nodes) ? candidate.nodes : [];

  for (const change of changes) {
    const match = change.path.match(/nodes\[(\d+)\]/);
    if (!match) {
      continue;
    }
    const index = Number(match[1]);
    const node = (candidateNodes[index] ?? baseNodes[index]) as Record<string, unknown> | undefined;
    const sectionId = String(node?.id ?? node?.name ?? `node-${index}`);
    const sectionName = typeof node?.name === 'string' ? node.name : undefined;
    if (!sections[sectionId]) {
      sections[sectionId] = {
        section_id: sectionId,
        section_name: sectionName,
        change_count: 0,
        change_paths: [],
      };
    }
    sections[sectionId].change_count += 1;
    sections[sectionId].change_paths.push(change.path);
  }

  return Object.values(sections);
}

function buildDiffPackage(base: CandidateWorkflow, candidate: CandidateWorkflow): CandidateDiffPackage {
  const changes = diffObjects(base, candidate);
  const section_changes = mapSectionChanges(base, candidate, changes);

  return {
    base_hash: hashObject(base),
    candidate_hash: hashObject(candidate),
    changes,
    section_changes,
  };
}

export class CandidateService {
  constructor(private readonly repository: SQLiteCandidateRepository) {}

  generateCandidate(input: GenerateCandidateInput): GenerateCandidateOutput {
    const baseWorkflow = input.base_workflow ?? {};
    const proposedWorkflow = input.proposed_workflow ?? defaultCandidateWorkflow(input);

    const placeholderResult =
      input.journey === 'upgrade'
        ? preservePlaceholders(baseWorkflow, proposedWorkflow)
        : { patched: proposedWorkflow, placeholders: extractPlaceholderOccurrences(proposedWorkflow) };

    const diff = buildDiffPackage(baseWorkflow, placeholderResult.patched);
    const candidateId = buildDeterministicCandidateId(input, placeholderResult.patched);
    const now = new Date().toISOString();

    const persistedRecord = this.repository.saveCandidate({
      candidateId,
      requestId: input.request_id,
      journey: input.journey,
      actor: input.actor,
      workflowIdentifier: input.workflow_identifier ?? null,
      status: 'generated',
      baseWorkflow: JSON.stringify(baseWorkflow),
      candidateWorkflow: JSON.stringify(placeholderResult.patched),
      placeholders: JSON.stringify(placeholderResult.placeholders),
      diff: JSON.stringify(diff),
      sectionTraceability: JSON.stringify(diff.section_changes),
      createdAt: now,
    });

    return {
      candidate_id: candidateId,
      diff,
      placeholders: placeholderResult.placeholders,
      persistedRecord,
    };
  }

  regenerateUpgrade(input: GenerateCandidateInput): GenerateCandidateOutput {
    return this.generateCandidate({
      ...input,
      journey: 'upgrade',
    });
  }
}

export const candidateUtilities = {
  extractPlaceholderOccurrences,
  preservePlaceholders,
  buildDiffPackage,
};
