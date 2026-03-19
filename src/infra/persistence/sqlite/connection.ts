import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { ensureCoreSchema } from './schema';

export interface SqliteConnectionConfig {
  dbPath?: string;
}

function defaultDatabasePath(): string {
  const fallback = join(process.cwd(), 'data', 'sqlite', 'n8n-testharness.sqlite');
  return process.env.N8N_TESTHARNESS_DB_PATH ?? fallback;
}

export function openDatabaseConnection(config: SqliteConnectionConfig = {}): Database.Database {
  const dbPath = config.dbPath ?? defaultDatabasePath();
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  ensureCoreSchema(db);
  return db;
}
