import { IntentService } from '../../services/intent-service';
import { SQLiteIntakeRepository } from '../../infra/persistence/sqlite/repositories/intake-repository';
import { openDatabaseConnection } from '../../infra/persistence/sqlite/connection';

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
    const service = new IntentService(repository);
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

