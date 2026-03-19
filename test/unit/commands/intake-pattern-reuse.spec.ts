import assert from 'node:assert';
import { describe, it } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLitePatternRepository } from '../../../src/infra/persistence/sqlite/repositories/pattern-repository';
import { SQLiteKnowledgeRepository } from '../../../src/infra/persistence/sqlite/repositories/knowledge-repository';
import { PatternService } from '../../../src/services/pattern-service';
import { handleIntake } from '../../../src/commands/candidate/intake';

describe('Intake reuse suggestions', () => {
  it('surfaces matching patterns and records applied choice in lineage', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'intake-reuse-'));
    const dbPath = join(baseDir, 'test.sqlite');

    const seedDb = new Database(dbPath);
    ensureCoreSchema(seedDb);
    const patternRepo = new SQLitePatternRepository(seedDb, baseDir);
    const knowledgeRepo = new SQLiteKnowledgeRepository(seedDb, baseDir);
    const patternService = new PatternService(patternRepo, knowledgeRepo);

    const pattern = patternService.recordSuccessfulCandidate({
      requestId: 'req-apply',
      name: 'Slack alert routing',
      description: 'Route Slack alerts to incident workflow',
      integration: 'slack',
      tags: ['slack', 'alert'],
      workflowIdentifiers: ['wf-slack'],
    });
    seedDb.close();

    const result = handleIntake(
      {
        source: 'telegram',
        actor: 'operator-9',
        text: 'Need Slack alert routing for on-call',
        workflow_identifier: 'wf-slack',
        pattern_choice: pattern.pattern_id,
        contextFlags: { integration: 'slack' },
      },
      { dbPath },
    );

    const summary = result.summary as { pattern_suggestions?: Array<{ pattern_id: string }>; pattern_applied?: { pattern_id: string } };
    assert.ok(summary.pattern_suggestions && summary.pattern_suggestions.length > 0);
    assert.equal(summary.pattern_applied?.pattern_id, pattern.pattern_id);

    const verifyDb = new Database(dbPath);
    const application = verifyDb
      .prepare('SELECT pattern_id FROM pattern_applications WHERE request_id = ?')
      .get(result.request_id) as { pattern_id: string } | undefined;
    assert.equal(application?.pattern_id, pattern.pattern_id);
    verifyDb.close();
  });
});
