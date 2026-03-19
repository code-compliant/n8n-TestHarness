import { createHash } from 'node:crypto';

import { stableStringify, type JsonValue } from './stable-json';

export function deterministicId(prefix: string, payload: JsonValue): string {
  const serialized = stableStringify(payload);
  const hash = createHash('sha256').update(`${prefix}:${serialized}`).digest('hex');
  return `${prefix}_${hash}`;
}

export function buildId(prefix: string, ...components: Array<string | number | null | undefined>): string {
  const normalized = components
    .filter((component) => component !== null && component !== undefined)
    .map((component) => String(component));

  if (normalized.length === 0) {
    throw new Error(`Deterministic id for ${prefix} requires input components.`);
  }

  const hash = createHash('sha256')
    .update([prefix, ...normalized].join('|'))
    .digest('hex')
    .slice(0, 32);

  return `${prefix}_${hash}`;
}
