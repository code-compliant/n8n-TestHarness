import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FixtureSet } from '../domain/models/validation';

export class MissingFixtureError extends Error {
  constructor(public readonly candidateId: string, public readonly fixturePath: string) {
    super(`Missing fixtures for candidate ${candidateId} at ${fixturePath}`);
  }
}

export interface FixtureLoaderOptions {
  fixturesPath?: string;
}

function resolveFixturesPath(basePath: string | undefined, candidateId: string): string {
  const root = basePath ?? join(process.cwd(), 'data', 'fixtures', 'validation');
  return join(root, `${candidateId}.json`);
}

export function loadFixtures(candidateId: string, options: FixtureLoaderOptions = {}): FixtureSet {
  const fixturePath = resolveFixturesPath(options.fixturesPath, candidateId);
  try {
    const raw = readFileSync(fixturePath, 'utf-8');
    const parsed = JSON.parse(raw) as FixtureSet;
    if (!parsed || parsed.candidateId !== candidateId || !Array.isArray(parsed.fixtures)) {
      throw new Error('Invalid fixture payload');
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MissingFixtureError(candidateId, fixturePath);
    }
    throw error;
  }
}
