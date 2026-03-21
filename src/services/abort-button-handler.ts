import type Database from 'better-sqlite3';
import type { RalphLoopSignal } from '../domain/models/ralph-loop';

export interface AbortButtonCallback {
  loopId: string;
  triggeredBy: string;
  messageId: number;
}

export class AbortButtonHandler {
  private readonly db: Database.Database;
  private readonly callbacks: Map<string, (loopId: string) => void> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
  }

  registerAbortCallback(loopId: string, callback: (loopId: string) => void): void {
    this.callbacks.set(loopId, callback);
    console.log(`Registered abort callback for loop ${loopId}`);
  }

  unregisterAbortCallback(loopId: string): void {
    this.callbacks.delete(loopId);
    console.log(`Unregistered abort callback for loop ${loopId}`);
  }

  async handleAbortButtonPress(callbackData: AbortButtonCallback): Promise<void> {
    const { loopId, triggeredBy, messageId } = callbackData;

    console.log(`Abort button pressed for loop ${loopId} by ${triggeredBy}`);

    try {
      // Write abort signal to database
      const signal: RalphLoopSignal = {
        signalId: this.generateSignalId(),
        loopId,
        signalType: 'abort',
        triggeredBy,
        triggeredAt: new Date().toISOString()
      };

      this.insertAbortSignal(signal);

      // Execute registered callback if exists
      const callback = this.callbacks.get(loopId);
      if (callback) {
        callback(loopId);
      }

      console.log(`Abort signal recorded for loop ${loopId}`);
    } catch (error) {
      console.error(`Failed to handle abort button for loop ${loopId}:`, error);
      throw error;
    }
  }

  async hasAbortSignal(loopId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ralph_loop_signals
      WHERE loopId = ? AND signalType = 'abort'
    `);

    const result = stmt.get(loopId) as { count: number };
    return result.count > 0;
  }

  async getAbortSignals(loopId: string): Promise<RalphLoopSignal[]> {
    const stmt = this.db.prepare(`
      SELECT signalId, loopId, signalType, triggeredBy, triggeredAt
      FROM ralph_loop_signals
      WHERE loopId = ? AND signalType = 'abort'
      ORDER BY triggeredAt ASC
    `);

    return stmt.all(loopId) as RalphLoopSignal[];
  }

  private insertAbortSignal(signal: RalphLoopSignal): void {
    const stmt = this.db.prepare(`
      INSERT INTO ralph_loop_signals (signalId, loopId, signalType, triggeredBy, triggeredAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      signal.signalId,
      signal.loopId,
      signal.signalType,
      signal.triggeredBy,
      signal.triggeredAt
    );
  }

  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}