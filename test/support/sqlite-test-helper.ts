import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../src/infra/persistence/sqlite/schema';

export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  ensureCoreSchema(db);
  return db;
}
