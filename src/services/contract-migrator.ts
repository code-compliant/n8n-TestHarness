import type { QualityContract, ContractMigrationPlan, ContractChange } from '../domain/models/quality-contract';
import type { ChangeDetectionResult } from './change-detector';
import { ContractManager } from './contract-manager';

export class ContractMigrator {
  constructor(private readonly contractManager: ContractManager) {}

  async planMigration(
    currentContract: QualityContract,
    changes: ChangeDetectionResult
  ): Promise<ContractMigrationPlan> {
    const migrationChanges: ContractChange[] = [];
    let requiresApproval = false;

    for (const nodeChange of changes.nodeChanges) {
      switch (nodeChange.changeType) {
        case 'remove':
          // Remove assertions targeting this node
          const removedAssertions = currentContract.assertions.filter(
            assertion => assertion.target === nodeChange.nodeName
          );

          for (const assertion of removedAssertions) {
            migrationChanges.push({
              type: 'remove_assertion',
              assertionId: assertion.id,
              feature: assertion.feature,
              reason: `Node "${nodeChange.nodeName}" was removed from workflow`,
              suggestedAction: 'Remove assertion automatically'
            });
          }
          break;

        case 'add':
          // Check if this is a known feature type that needs assertions
          const inferredFeature = this.inferFeatureFromNodeName(nodeChange.nodeName);
          if (inferredFeature && inferredFeature !== 'core') {
            migrationChanges.push({
              type: 'add_assertion',
              feature: inferredFeature,
              reason: `New ${inferredFeature} node "${nodeChange.nodeName}" was added`,
              suggestedAction: `Add ${inferredFeature} assertions for new node`
            });
            requiresApproval = true; // New assertions need human review
          }
          break;

        case 'modify':
          // Check if modifications affect existing assertions
          const affectedAssertions = currentContract.assertions.filter(
            assertion => assertion.target === nodeChange.nodeName
          );

          for (const assertion of affectedAssertions) {
            if (this.isAssertionAffectedByChanges(assertion, nodeChange.changes || [])) {
              migrationChanges.push({
                type: 'mark_stale',
                assertionId: assertion.id,
                feature: assertion.feature,
                reason: `Node "${nodeChange.nodeName}" was modified, assertion may be stale`,
                suggestedAction: 'Review and update assertion if needed'
              });
              requiresApproval = true; // Stale assertions need review
            }
          }
          break;
      }
    }

    const targetVersion = this.contractManager.incrementVersion(currentContract.version);

    return {
      contractPath: `test/fixtures/contracts/${currentContract.workflowSlug}.json`,
      currentVersion: currentContract.version,
      targetVersion,
      changes: migrationChanges,
      requiresApproval
    };
  }

  async applyMigration(
    contract: QualityContract,
    plan: ContractMigrationPlan
  ): Promise<QualityContract> {
    let migratedContract = { ...contract };
    migratedContract.version = plan.targetVersion;
    migratedContract.updatedAt = new Date().toISOString();

    for (const change of plan.changes) {
      switch (change.type) {
        case 'remove_assertion':
          migratedContract.assertions = migratedContract.assertions.filter(
            assertion => assertion.id !== change.assertionId
          );
          break;

        case 'mark_stale':
          // Add a comment or flag to the assertion indicating it needs review
          const staleAssertion = migratedContract.assertions.find(
            assertion => assertion.id === change.assertionId
          );
          if (staleAssertion) {
            (staleAssertion.spec as any)._stale = {
              markedAt: new Date().toISOString(),
              reason: change.reason
            };
          }
          break;

        // Note: 'add_assertion' and 'update_assertion' require human input
        // and should be handled through the contract elicitor
      }
    }

    // Update features list based on remaining assertions
    migratedContract.features = this.extractFeaturesFromAssertions(migratedContract.assertions);

    return migratedContract;
  }

  private inferFeatureFromNodeName(nodeName: string): string {
    const name = nodeName.toLowerCase();

    if (name.includes('email') || name.includes('mail')) return 'email';
    if (name.includes('calendar') || name.includes('schedule')) return 'calendar';
    if (name.includes('classif') || name.includes('categor')) return 'classify';
    if (name.includes('reply') || name.includes('respond')) return 'reply';
    if (name.includes('quote') || name.includes('estimate')) return 'quote';

    return 'core';
  }

  private isAssertionAffectedByChanges(assertion: any, changes: any[]): boolean {
    // Check if any of the changes could affect this assertion type
    for (const change of changes) {
      switch (assertion.type) {
        case 'llm_judge':
        case 'perspective_check':
          // LLM assertions are sensitive to prompt changes
          if (change.path.includes('prompt') ||
              change.path.includes('message') ||
              change.path.includes('system')) {
            return true;
          }
          break;

        case 'context_injection_audit':
          // Context injection is sensitive to system message changes
          if (change.path.includes('system') || change.path.includes('prompt')) {
            return true;
          }
          break;

        case 'schema_match':
          // Schema assertions are sensitive to output format changes
          if (change.path.includes('output') || change.path.includes('format')) {
            return true;
          }
          break;

        case 'error_handler_check':
          // Error handler assertions are sensitive to error handling changes
          if (change.path.includes('error') || change.path.includes('onError')) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  private extractFeaturesFromAssertions(assertions: any[]): string[] {
    const features = new Set<string>();
    assertions.forEach(assertion => features.add(assertion.feature));
    return Array.from(features).sort();
  }
}