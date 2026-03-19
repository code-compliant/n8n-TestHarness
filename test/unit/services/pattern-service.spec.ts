import assert from 'node:assert';
import { describe, it } from 'node:test';
import { mkdtempSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLitePatternRepository } from '../../../src/infra/persistence/sqlite/repositories/pattern-repository';
import { SQLiteKnowledgeRepository } from '../../../src/infra/persistence/sqlite/repositories/knowledge-repository';
import { PatternService } from '../../../src/services/pattern-service';

describe('PatternService', () => {
  it('persists reusable patterns and supports searchable integration context', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'pattern-store-'));
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const patternRepo = new SQLitePatternRepository(db, baseDir);
    const knowledgeRepo = new SQLiteKnowledgeRepository(db, baseDir);
    const service = new PatternService(patternRepo, knowledgeRepo);

    const pattern = service.recordSuccessfulCandidate({
      requestId: 'req-1',
      name: 'Stripe invoice sync',
      description: 'Sync Stripe invoices into CRM',
      integration: 'stripe',
      tags: ['stripe', 'invoice', 'sync'],
      workflowIdentifiers: ['wf-99'],
    });

    const patternPath = join(baseDir, 'data', 'patterns', `${pattern.pattern_id}.json`);
    assert.equal(existsSync(patternPath), true);

    const suggestions = service.suggestPatterns({
      text: 'Need Stripe invoice sync for CRM',
      integration: 'stripe',
      workflowIdentifier: 'wf-99',
    });

    assert.ok(suggestions.length > 0);
    assert.equal(suggestions[0].pattern_id, pattern.pattern_id);
    db.close();
  });
});
