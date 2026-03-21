import * as fs from 'fs';
import * as path from 'path';
import { WorkflowDefinition } from './n8n-api-client';

export interface CredentialMapping {
  [prodCredentialId: string]: string; // maps to test credential ID
}

export class CredentialGuard {
  private credentialMap: CredentialMapping;
  private readonly prodCredentialIds: Set<string>;

  constructor() {
    this.loadCredentialMap();
    this.prodCredentialIds = new Set(Object.keys(this.credentialMap));
  }

  validateWorkflow(workflowDefinition: WorkflowDefinition): void {
    const violations = this.findProductionCredentials(workflowDefinition);

    if (violations.length > 0) {
      throw new Error(`Production credentials found in test workflow: ${violations.join(', ')}`);
    }
  }

  substituteCredentials(workflowDefinition: WorkflowDefinition): WorkflowDefinition {
    // Deep clone the workflow to avoid mutations
    const cloned = JSON.parse(JSON.stringify(workflowDefinition));

    this.replaceCredentialsRecursive(cloned);

    return cloned;
  }

  private loadCredentialMap(): void {
    try {
      const configPath = path.join(process.cwd(), 'config', 'credential-map.json');
      const mapData = fs.readFileSync(configPath, 'utf-8');
      this.credentialMap = JSON.parse(mapData);
    } catch (error) {
      console.warn('Failed to load credential map, using empty map:', error);
      this.credentialMap = {};
    }
  }

  private findProductionCredentials(obj: any): string[] {
    const violations: string[] = [];

    if (typeof obj === 'string' && this.prodCredentialIds.has(obj)) {
      violations.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        violations.push(...this.findProductionCredentials(item));
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        violations.push(...this.findProductionCredentials(value));
      }
    }

    return violations;
  }

  private replaceCredentialsRecursive(obj: any): void {
    if (typeof obj === 'string' && this.prodCredentialIds.has(obj)) {
      // This won't work for strings in place, need to handle at parent level
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string' && this.prodCredentialIds.has(obj[i])) {
          obj[i] = this.credentialMap[obj[i]];
        } else if (obj[i] && typeof obj[i] === 'object') {
          this.replaceCredentialsRecursive(obj[i]);
        }
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && this.prodCredentialIds.has(value)) {
          obj[key] = this.credentialMap[value];
        } else if (value && typeof value === 'object') {
          this.replaceCredentialsRecursive(value);
        }
      }
    }
  }

  getTestCredentialFor(prodCredentialId: string): string | null {
    return this.credentialMap[prodCredentialId] || null;
  }

  listProductionCredentialIds(): string[] {
    return Array.from(this.prodCredentialIds);
  }

  listTestCredentialIds(): string[] {
    return Object.values(this.credentialMap);
  }
}