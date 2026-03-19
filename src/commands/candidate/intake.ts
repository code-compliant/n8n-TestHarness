import { IntentService } from '../../services/intent-service';
import { SQLiteIntakeRepository } from '../../infra/persistence/sqlite/repositories/intake-repository';
import { openDatabaseConnection } from '../../infra/persistence/sqlite/connection';
import { SQLitePatternRepository } from '../../infra/persistence/sqlite/repositories/pattern-repository';
import { SQLiteKnowledgeRepository } from '../../infra/persistence/sqlite/repositories/knowledge-repository';
import { PatternService } from '../../services/pattern-service';

export interface IntakeCommandInput {
  source?: 'telegram' | 'api' | 'unknown' | string;
  actor?: string;
  [key: string]: unknown;
}

export interface IntakeCommandResult {
  status: 'pass' | 'blocked';
  request_id: string;
  route: string;
  summary: object;
  next_action: string;
}

export function handleIntake(payload: IntakeCommandInput, options?: { dbPath?: string }): IntakeCommandResult {
  const db = openDatabaseConnection({ dbPath: options?.dbPath });
  try {
    const repository = new SQLiteIntakeRepository(db);
    const patternRepository = new SQLitePatternRepository(db);
    const knowledgeRepository = new SQLiteKnowledgeRepository(db);
    const patternService = new PatternService(patternRepository, knowledgeRepository);
    const service = new IntentService(repository, patternService);
    const result = service.capture(payload);
    return {
      status: result.blocked ? 'blocked' : 'pass',
      request_id: result.request_id,
      route: result.route,
      summary: result.summary,
      next_action: result.next_action,
    };
  } finally {
    db.close();
  }
}

export const commandManifest = {
  id: 'candidate:intake',
  description: 'Capture Telegram/API request and classify journey type',
  blockingThreshold: 0.6,
  minimumInputs: ['source', 'actor'],
};
