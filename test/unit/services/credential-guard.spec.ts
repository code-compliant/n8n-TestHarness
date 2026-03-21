import assert from 'node:assert';
import { describe, it } from 'node:test';
import { CredentialGuard } from '../../../src/services/credential-guard';

describe('CredentialGuard', () => {
  it('detects production credentials in workflow', () => {
    const guard = new CredentialGuard();

    const workflowWithProdCreds = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          type: 'GoogleSheets',
          credentials: {
            googleSheetsOAuth2: 'AyN7Ua2hilSBg1ac' // Production credential
          }
        }
      ],
      connections: {}
    };

    assert.throws(
      () => guard.validateWorkflow(workflowWithProdCreds),
      /Production credentials found/
    );
  });

  it('allows test credentials in workflow', () => {
    const guard = new CredentialGuard();

    const workflowWithTestCreds = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          type: 'GoogleSheets',
          credentials: {
            googleSheetsOAuth2: 'ekqEk9tYzLidPR2P' // Test credential
          }
        }
      ],
      connections: {}
    };

    assert.doesNotThrow(() => guard.validateWorkflow(workflowWithTestCreds));
  });

  it('substitutes production credentials with test equivalents', () => {
    const guard = new CredentialGuard();

    const workflowWithProdCreds = {
      name: 'Test Workflow',
      nodes: [
        {
          id: 'node1',
          type: 'GoogleSheets',
          credentials: {
            googleSheetsOAuth2: 'AyN7Ua2hilSBg1ac' // Production credential
          }
        },
        {
          id: 'node2',
          type: 'Telegram',
          credentials: {
            telegramApi: 'swBScWJU4giImXvY' // Production credential
          }
        }
      ],
      connections: {}
    };

    const substituted = guard.substituteCredentials(workflowWithProdCreds);

    assert.equal(
      substituted.nodes[0].credentials.googleSheetsOAuth2,
      'ekqEk9tYzLidPR2P' // Should be test credential
    );
    assert.equal(
      substituted.nodes[1].credentials.telegramApi,
      'waOO7VpvhvgL81Ss' // Should be test credential
    );

    // Original should not be modified
    assert.equal(
      workflowWithProdCreds.nodes[0].credentials.googleSheetsOAuth2,
      'AyN7Ua2hilSBg1ac'
    );
  });

  it('returns correct test credential for production credential', () => {
    const guard = new CredentialGuard();

    assert.equal(
      guard.getTestCredentialFor('AyN7Ua2hilSBg1ac'),
      'ekqEk9tYzLidPR2P'
    );

    assert.equal(
      guard.getTestCredentialFor('swBScWJU4giImXvY'),
      'waOO7VpvhvgL81Ss'
    );

    assert.equal(
      guard.getTestCredentialFor('nonexistent'),
      null
    );
  });
});