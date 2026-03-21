import assert from 'node:assert';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { DashboardServer } from '../../../src/services/dashboard-server';

describe('DashboardServer', () => {
  it('creates dashboard server with proper configuration', () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const config = {
      port: 18942,
      loopId: 'test-loop-123',
      token: 'test-token-abc123'
    };

    const server = new DashboardServer(db, config);
    assert.ok(server);

    db.close();
  });

  it('generates dashboard HTML with proper structure', () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);

    const config = {
      port: 18942,
      loopId: 'test-loop-123',
      token: 'test-token-abc123'
    };

    const server = new DashboardServer(db, config);

    // Access the private method for testing (in real implementation, this would be tested via HTTP)
    const html = (server as any).generateDashboardHTML();

    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('Ralph Loop'));
    assert.ok(html.includes('abortLoop'));
    assert.ok(html.includes('eventSource'));
    assert.ok(html.includes('iteration'));

    db.close();
  });

  // Note: Integration tests for the full server would require starting the server
  // and making HTTP requests, which is beyond the scope of unit tests
});