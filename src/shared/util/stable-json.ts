export function stableStringify(value: unknown): string {
  const seen = new WeakSet();

  const normalize = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      return input;
    }
    if (seen.has(input as object)) {
      throw new Error('Cannot stable stringify circular structure');
    }
    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item) => normalize(item));
    }

    const record = input as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      normalized[key] = normalize(record[key]);
    }
    return normalized;
  };

  return JSON.stringify(normalize(value));
}
