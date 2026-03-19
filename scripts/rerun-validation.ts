#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Database from 'better-sqlite3';

import { ensureValidationSchema } from '../src/infra/persistence/sqlite/schema';
import { SQLiteFailureRepository } from '../src/infra/persistence/sqlite/repositories/failure-repository';
import { ValidationService } from '../src/services/validation-service';
import { CandidateDefinition } from '../src/domain/models/validation';

interface CliOptions {
  candidateId: string;
  fixturesPath: string;
  candidateFile?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--candidate-id') {
      options.candidateId = argv[i + 1];
      i += 1;
    } else if (value === '--fixtures') {
      options.fixturesPath = argv[i + 1];
      i += 1;
    } else if (value === '--candidate-file') {
      options.candidateFile = argv[i + 1];
      i += 1;
    }
  }

  if (!options.candidateId || !options.fixturesPath) {
    throw new Error('Usage: rerun-validation --candidate-id <id> --fixtures <path> [--candidate-file <file>]');
  }

  return options as CliOptions;
}

function loadCandidate(options: CliOptions): CandidateDefinition {
  const fallbackPath = resolve(process.cwd(), 'data', 'candidates', `${options.candidateId}.json`);
  const candidatePath = options.candidateFile ? resolve(options.candidateFile) : fallbackPath;
  const raw = readFileSync(candidatePath, 'utf-8');
  const parsed = JSON.parse(raw) as CandidateDefinition;
  if (parsed.candidateId !== options.candidateId) {
    throw new Error(`Candidate file mismatch: expected ${options.candidateId}, got ${parsed.candidateId}`);
  }
  if (!parsed.workflow || !parsed.triggerType) {
    throw new Error('Candidate file missing required workflow or triggerType');
  }
  return parsed;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const candidate = loadCandidate(options);

  const db = new Database(':memory:');
  ensureValidationSchema(db);
  const repository = new SQLiteFailureRepository(db);
  const service = new ValidationService(repository);

  const outcome = service.run(candidate, { fixturesPath: options.fixturesPath });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(outcome, null, 2));
  db.close();

  if (outcome.status !== 'pass') {
    process.exitCode = 1;
  }
}

main();
