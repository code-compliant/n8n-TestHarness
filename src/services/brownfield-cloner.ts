import { N8nApiClient, WorkflowDefinition } from './n8n-api-client';
import { CredentialGuard } from './credential-guard';

export class BrownfieldCloner {
  private readonly n8nClient: N8nApiClient;
  private readonly credentialGuard: CredentialGuard;

  constructor() {
    this.n8nClient = new N8nApiClient();
    this.credentialGuard = new CredentialGuard();
  }

  async cloneWorkflowForTesting(workflowId: string): Promise<WorkflowDefinition> {
    // Get the live workflow definition
    const liveWorkflow = await this.fetchLiveWorkflow(workflowId);

    // Clean the workflow for test deployment
    const cleanedWorkflow = this.cleanWorkflowForTest(liveWorkflow);

    // Substitute production credentials with test equivalents
    const testWorkflow = this.credentialGuard.substituteCredentials(cleanedWorkflow);

    // Validate no production credentials remain
    this.credentialGuard.validateWorkflow(testWorkflow);

    return testWorkflow;
  }

  private async fetchLiveWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    try {
      const response = await this.n8nClient.makeRequest('GET', `/workflows/${workflowId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch workflow ${workflowId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanWorkflowForTest(workflow: WorkflowDefinition): WorkflowDefinition {
    const cleaned: WorkflowDefinition = {
      ...workflow,
      // Remove properties that shouldn't be in a test deployment
      id: undefined,
      active: false,
      // Add test prefix to name to distinguish from production
      name: `TEST_${workflow.name}`,
      // Remove any production-specific settings
      createdAt: undefined,
      updatedAt: undefined,
      versionId: undefined
    };

    // Remove any system-generated fields that would conflict
    delete (cleaned as any).id;
    delete (cleaned as any).createdAt;
    delete (cleaned as any).updatedAt;
    delete (cleaned as any).versionId;

    return cleaned;
  }

  async validateTestDeployment(workflowDefinition: WorkflowDefinition): Promise<boolean> {
    try {
      // Validate credentials are all test credentials
      this.credentialGuard.validateWorkflow(workflowDefinition);

      // Check that workflow name has test prefix
      if (!workflowDefinition.name.startsWith('TEST_')) {
        throw new Error('Test workflow must have TEST_ prefix in name');
      }

      // Check that active is false
      if (workflowDefinition.active === true) {
        throw new Error('Test workflow must not be active by default');
      }

      return true;
    } catch (error) {
      console.error('Test deployment validation failed:', error);
      return false;
    }
  }

  async cleanupTestWorkflow(workflowId: string): Promise<void> {
    try {
      await this.n8nClient.deleteWorkflow(workflowId);
      console.log(`Cleaned up test workflow: ${workflowId}`);
    } catch (error) {
      console.warn(`Failed to cleanup test workflow ${workflowId}:`, error);
      // Don't throw - cleanup failures shouldn't block the main flow
    }
  }
}