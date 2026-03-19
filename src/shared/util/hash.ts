import { createHash } from 'node:crypto';

import { stableStringify } from './stable-json';

export function hashContent(value: unknown): string {
  const hash = createHash('sha256');
  hash.update(stableStringify(value));
  return hash.digest('hex');
}
