import assert from 'node:assert';
import { describe, it } from 'node:test';
import { mkdtempSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';

import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { SQLiteKnowledgeRepository } from '../../../src/infra/persistence/sqlite/repositories/knowledge-repository';
import { SQLitePatternRepository } from '../../../src/infra/persistence/sqlite/repositories/pattern-repository';
import { KnowledgeGrowthService } from '../../../src/services/knowledge-growth-service';
import { PatternService } from '../../../src/services/pattern-service';

describe('KnowledgeGrowthService', () => {
  it('updates fixture sets and quality hints to influence future scoring', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'knowledge-growth-'));
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const knowledgeRepo = new SQLiteKnowledgeRepository(db, baseDir);
    const patternRepo = new SQLitePatternRepository(db, baseDir);
    const growthService = new KnowledgeGrowthService(knowledgeRepo);
    const patternService = new PatternService(patternRepo, knowledgeRepo);

    const pattern = patternService.recordSuccessfulCandidate({
      requestId: 'req-growth',
      name: 'GitHub issue triage',
      description: 'Route GitHub issues to triage workflow',
      integration: 'github',
      tags: ['github', 'triage'],
      workflowIdentifiers: ['wf-gh'],
    });

    const beforeScore = patternService.suggestPatterns({
      text: 'github issue triage',
      integration: 'github',
    })[0].score;

    const growth = growthService.applyReviewNotes({
      review_id: 'review-1',
      submitted_by: 'operator-5',
      notes: 'Add fixtures for missing label routing. Increase confidence for GitHub patterns.',
      fixtures: [
        {
          title: 'Label routing fixture',
          description: 'Ensures labels route to correct team',
          inputs: { label: 'bug' },
          expected: { team: 'oncall' },
        },
      ],
      quality_hints: [
        {
          scope: 'integration',
          target: 'github',
          score_delta: 2,
          rationale: 'Strong incident review signal for GitHub triage',
        },
      ],
    });

    const fixturePath = join(baseDir, 'data', 'knowledge', 'fixtures', `${growth.fixtures[0].fixture_id}.json`);
    assert.equal(existsSync(fixturePath), true);

    const afterScore = patternService.suggestPatterns({
      text: 'github issue triage',
      integration: 'github',
    })[0].score;

    assert.ok(afterScore >= beforeScore + 2);
    assert.equal(pattern.pattern_id.startsWith('pattern_'), true);
    db.close();
  });
});
