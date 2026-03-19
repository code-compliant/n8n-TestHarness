import { createHash } from 'node:crypto';

export function createId(prefix: string, seed: string | string[]): string {
  const payload = Array.isArray(seed) ? seed.join('|') : seed;
  const hash = createHash('sha256').update(payload).digest('hex');
  return `${prefix}${hash}`;
}
