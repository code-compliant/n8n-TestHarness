export interface DiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

export function diffValues(before: unknown, after: unknown, basePath = ''): DiffEntry[] {
  if (before === after) {
    return [];
  }

  const beforeIsObject = typeof before === 'object' && before !== null;
  const afterIsObject = typeof after === 'object' && after !== null;

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLength = Math.max(before.length, after.length);
    const entries: DiffEntry[] = [];
    for (let index = 0; index < maxLength; index += 1) {
      const path = `${basePath}[${index}]`;
      entries.push(...diffValues(before[index], after[index], path));
    }
    return entries;
  }

  if (beforeIsObject && afterIsObject && !Array.isArray(before) && !Array.isArray(after)) {
    const beforeRecord = before as Record<string, unknown>;
    const afterRecord = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
    const entries: DiffEntry[] = [];
    for (const key of Array.from(keys).sort()) {
      const path = basePath ? `${basePath}.${key}` : key;
      entries.push(...diffValues(beforeRecord[key], afterRecord[key], path));
    }
    return entries;
  }

  return [
    {
      path: basePath || '$',
      before,
      after,
    },
  ];
}
