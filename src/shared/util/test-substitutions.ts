import { diffValues, DiffEntry } from './deep-diff';

export interface SubstitutionRecord {
  path: string;
  before: unknown;
  after: unknown;
  reason: string;
}

const REDACTED_VALUE = 'TEST_REDACTED';

function shouldRedactKey(key: string): boolean {
  return /token|secret|password/i.test(key);
}

function normalizeEnvironment(value: unknown): { value: unknown; changed: boolean } {
  if (typeof value === 'string' && value.toLowerCase() === 'production') {
    return { value: 'test', changed: true };
  }
  return { value, changed: false };
}

function substituteValue(key: string, value: unknown): { value: unknown; reason?: string } {
  if (shouldRedactKey(key)) {
    if (typeof value === 'string' && value === REDACTED_VALUE) {
      return { value };
    }
    return { value: REDACTED_VALUE, reason: 'redact-sensitive' };
  }

  if (key.toLowerCase() === 'environment') {
    const normalized = normalizeEnvironment(value);
    if (normalized.changed) {
      return { value: normalized.value, reason: 'test-environment' };
    }
  }

  return { value };
}

export function applyTestSafeSubstitutions<T>(input: T): {
  substituted: T;
  substitutions: SubstitutionRecord[];
  diff: DiffEntry[];
} {
  const substitutions: SubstitutionRecord[] = [];

  const transform = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) {
      return value.map((entry, index) => transform(entry, `${path}[${index}]`));
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(record)) {
        const nextPath = path ? `${path}.${key}` : key;
        const substitution = substituteValue(key, record[key]);
        if (substitution.reason) {
          substitutions.push({
            path: nextPath,
            before: record[key],
            after: substitution.value,
            reason: substitution.reason,
          });
        }
        output[key] = transform(substitution.value, nextPath);
      }
      return output;
    }

    return value;
  };

  const substituted = transform(input, '') as T;
  const diff = diffValues(input, substituted);

  return { substituted, substitutions, diff };
}
