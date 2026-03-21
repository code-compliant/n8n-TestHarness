import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ContractMigrator } from '../../../src/services/contract-migrator';
import { ContractManager } from '../../../src/services/contract-manager';
import type { QualityContract } from '../../../src/domain/models/quality-contract';
import type { ChangeDetectionResult } from '../../../src/services/change-detector';
import Database from 'better-sqlite3';
import { ensureCoreSchema } from '../../../src/infra/persistence/sqlite/schema';
import { WorkflowRegistry } from '../../../src/infra/registry/workflow-registry';

describe('ContractMigrator', () => {
  const createMigrator = () => {
    const db = new Database(':memory:');
    ensureCoreSchema(db);
    const registry = new WorkflowRegistry(db);
    const manager = new ContractManager(registry);
    return { db, migrator: new ContractMigrator(manager) };
  };

  it('plans migration for removed nodes', async () => {
    const { db, migrator } = createMigrator();

    const contract: QualityContract = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      source: 'authored',
      features: ['classify'],
      assertions: [{
        id: 'test-assertion',
        feature: 'classify',
        type: 'classification_check',
        target: 'removed-node',
        spec: { allowedValues: ['a', 'b'] }
      }],
      createdAt: '2026-03-21T10:00:00Z',
      updatedAt: '2026-03-21T10:00:00Z'
    };

    const changes: ChangeDetectionResult = {
      hasChanges: true,
      nodeChanges: [{
        nodeId: 'removed-node',
        nodeName: 'removed-node',
        changeType: 'remove'
      }],
      affectedFeatures: ['classify'],
      summary: '1 node removed'
    };

    const plan = await migrator.planMigration(contract, changes);

    assert.equal(plan.targetVersion, '1.0.1');
    assert.equal(plan.changes.length, 1);
    assert.equal(plan.changes[0].type, 'remove_assertion');
    assert.equal(plan.changes[0].assertionId, 'test-assertion');
    assert.equal(plan.requiresApproval, false);

    db.close();
  });

  it('plans migration for added LLM nodes', async () => {
    const { db, migrator } = createMigrator();

    const contract: QualityContract = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      source: 'authored',
      features: ['core'],
      assertions: [],
      createdAt: '2026-03-21T10:00:00Z',
      updatedAt: '2026-03-21T10:00:00Z'
    };

    const changes: ChangeDetectionResult = {
      hasChanges: true,
      nodeChanges: [{
        nodeId: 'email-classifier',
        nodeName: 'email-classifier',
        changeType: 'add'
      }],
      affectedFeatures: ['email'],
      summary: '1 node added'
    };

    const plan = await migrator.planMigration(contract, changes);

    assert.equal(plan.changes.length, 1);
    assert.equal(plan.changes[0].type, 'add_assertion');
    assert.equal(plan.changes[0].feature, 'email');
    assert.equal(plan.requiresApproval, true);

    db.close();
  });

  it('applies migration removing assertions', async () => {
    const { db, migrator } = createMigrator();

    const contract: QualityContract = {
      version: '1.0.0',
      workflowSlug: 'test-workflow',
      source: 'authored',
      features: ['classify', 'core'],
      assertions: [
        {
          id: 'keep-assertion',
          feature: 'core',
          type: 'error_handler_check',
          target: 'error-handler',
          spec: { workflowId: 'RumKLiLA2onXkppj' }
        },
        {
          id: 'remove-assertion',
          feature: 'classify',
          type: 'classification_check',
          target: 'removed-node',
          spec: { allowedValues: ['a', 'b'] }
        }
      ],
      createdAt: '2026-03-21T10:00:00Z',
      updatedAt: '2026-03-21T10:00:00Z'
    };

    const plan = {
      contractPath: 'test/fixtures/contracts/test-workflow.json',
      currentVersion: '1.0.0',
      targetVersion: '1.0.1',
      requiresApproval: false,
      changes: [{
        type: 'remove_assertion' as const,
        assertionId: 'remove-assertion',
        feature: 'classify',
        reason: 'Node removed'
      }]
    };

    const migrated = await migrator.applyMigration(contract, plan);

    assert.equal(migrated.version, '1.0.1');
    assert.equal(migrated.assertions.length, 1);
    assert.equal(migrated.assertions[0].id, 'keep-assertion');
    assert.deepEqual(migrated.features, ['core']);

    db.close();
  });
});