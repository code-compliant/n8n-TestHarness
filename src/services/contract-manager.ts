import * as fs from 'fs';
import * as path from 'path';
import type { QualityContract } from '../domain/models/quality-contract';
import { WorkflowRegistry } from '../infra/registry/workflow-registry';

export class ContractManager {
  constructor(private readonly workflowRegistry: WorkflowRegistry) {}

  async createContract(contract: QualityContract): Promise<void> {
    const contractPath = this.getContractPath(contract.workflowSlug);

    // Ensure directory exists
    await this.ensureContractsDirectory();

    // Write contract to file
    const contractJson = JSON.stringify(contract, null, 2);
    fs.writeFileSync(contractPath, contractJson, 'utf-8');

    // Register in workflow registry
    this.workflowRegistry.register({
      workflowId: contract.workflowSlug, // Use slug as ID for now
      slug: contract.workflowSlug,
      contractPath,
      contractVersion: contract.version
    });

    console.log(`Created contract for ${contract.workflowSlug} at ${contractPath}`);
  }

  async loadContract(workflowSlug: string): Promise<QualityContract | null> {
    const contractPath = this.getContractPath(workflowSlug);

    if (!fs.existsSync(contractPath)) {
      return null;
    }

    try {
      const contractJson = fs.readFileSync(contractPath, 'utf-8');
      return JSON.parse(contractJson) as QualityContract;
    } catch (error) {
      console.error(`Failed to load contract for ${workflowSlug}:`, error);
      return null;
    }
  }

  async updateContract(contract: QualityContract): Promise<void> {
    const contractPath = this.getContractPath(contract.workflowSlug);

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract not found for workflow ${contract.workflowSlug}`);
    }

    // Update timestamps
    const updatedContract = {
      ...contract,
      updatedAt: new Date().toISOString()
    };

    // Write updated contract
    const contractJson = JSON.stringify(updatedContract, null, 2);
    fs.writeFileSync(contractPath, contractJson, 'utf-8');

    // Update registry
    this.workflowRegistry.updateContractVersion(contract.workflowSlug, contract.version);

    console.log(`Updated contract for ${contract.workflowSlug} to version ${contract.version}`);
  }

  async deleteContract(workflowSlug: string): Promise<void> {
    const contractPath = this.getContractPath(workflowSlug);

    if (fs.existsSync(contractPath)) {
      fs.unlinkSync(contractPath);
      console.log(`Deleted contract for ${workflowSlug}`);
    }
  }

  async listContracts(): Promise<string[]> {
    const contractsDir = this.getContractsDirectory();

    if (!fs.existsSync(contractsDir)) {
      return [];
    }

    return fs.readdirSync(contractsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
  }

  async contractExists(workflowSlug: string): Promise<boolean> {
    const contractPath = this.getContractPath(workflowSlug);
    return fs.existsSync(contractPath);
  }

  incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`Invalid version format: ${currentVersion}`);
    }

    // Increment patch version
    parts[2]++;
    return parts.join('.');
  }

  private getContractPath(workflowSlug: string): string {
    return path.join(this.getContractsDirectory(), `${workflowSlug}.json`);
  }

  private getContractsDirectory(): string {
    return path.join(process.cwd(), 'test', 'fixtures', 'contracts');
  }

  private async ensureContractsDirectory(): Promise<void> {
    const contractsDir = this.getContractsDirectory();
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
  }
}