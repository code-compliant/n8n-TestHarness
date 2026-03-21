import type { WorkflowDefinition } from './n8n-api-client';
import type { ContractDiff } from '../domain/models/quality-contract';

export interface WorkflowChange {
  path: string;
  changeType: 'add' | 'remove' | 'modify';
  before?: unknown;
  after?: unknown;
}

export interface NodeChange {
  nodeId: string;
  nodeName: string;
  changeType: 'add' | 'remove' | 'modify';
  changes?: WorkflowChange[];
}

export interface ChangeDetectionResult {
  hasChanges: boolean;
  nodeChanges: NodeChange[];
  affectedFeatures: string[];
  summary: string;
}

export class ChangeDetector {
  detectChanges(
    previousWorkflow: WorkflowDefinition,
    currentWorkflow: WorkflowDefinition
  ): ChangeDetectionResult {
    const nodeChanges = this.detectNodeChanges(previousWorkflow, currentWorkflow);
    const affectedFeatures = this.inferAffectedFeatures(nodeChanges);

    return {
      hasChanges: nodeChanges.length > 0,
      nodeChanges,
      affectedFeatures,
      summary: this.generateChangeSummary(nodeChanges)
    };
  }

  private detectNodeChanges(
    previous: WorkflowDefinition,
    current: WorkflowDefinition
  ): NodeChange[] {
    const changes: NodeChange[] = [];
    const previousNodes = this.indexNodesByName(previous);
    const currentNodes = this.indexNodesByName(current);

    // Detect removed nodes
    for (const [nodeName, node] of previousNodes) {
      if (!currentNodes.has(nodeName)) {
        changes.push({
          nodeId: node.id || nodeName,
          nodeName,
          changeType: 'remove'
        });
      }
    }

    // Detect added and modified nodes
    for (const [nodeName, currentNode] of currentNodes) {
      if (!previousNodes.has(nodeName)) {
        changes.push({
          nodeId: currentNode.id || nodeName,
          nodeName,
          changeType: 'add'
        });
      } else {
        const previousNode = previousNodes.get(nodeName)!;
        const nodeChanges = this.detectNodeModifications(previousNode, currentNode);

        if (nodeChanges.length > 0) {
          changes.push({
            nodeId: currentNode.id || nodeName,
            nodeName,
            changeType: 'modify',
            changes: nodeChanges
          });
        }
      }
    }

    return changes;
  }

  private indexNodesByName(workflow: WorkflowDefinition): Map<string, any> {
    const index = new Map<string, any>();

    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        const name = node.name || node.id || 'unnamed';
        index.set(name, node);
      }
    }

    return index;
  }

  private detectNodeModifications(previousNode: any, currentNode: any): WorkflowChange[] {
    const changes: WorkflowChange[] = [];

    // Check type changes
    if (previousNode.type !== currentNode.type) {
      changes.push({
        path: 'type',
        changeType: 'modify',
        before: previousNode.type,
        after: currentNode.type
      });
    }

    // Check parameter changes
    if (previousNode.parameters && currentNode.parameters) {
      const paramChanges = this.detectObjectChanges(
        previousNode.parameters,
        currentNode.parameters,
        'parameters'
      );
      changes.push(...paramChanges);
    } else if (previousNode.parameters && !currentNode.parameters) {
      changes.push({
        path: 'parameters',
        changeType: 'remove',
        before: previousNode.parameters
      });
    } else if (!previousNode.parameters && currentNode.parameters) {
      changes.push({
        path: 'parameters',
        changeType: 'add',
        after: currentNode.parameters
      });
    }

    return changes;
  }

  private detectObjectChanges(
    previousObj: Record<string, any>,
    currentObj: Record<string, any>,
    basePath: string
  ): WorkflowChange[] {
    const changes: WorkflowChange[] = [];

    // Check for removed properties
    for (const [key, value] of Object.entries(previousObj)) {
      if (!(key in currentObj)) {
        changes.push({
          path: `${basePath}.${key}`,
          changeType: 'remove',
          before: value
        });
      }
    }

    // Check for added and modified properties
    for (const [key, currentValue] of Object.entries(currentObj)) {
      const path = `${basePath}.${key}`;

      if (!(key in previousObj)) {
        changes.push({
          path,
          changeType: 'add',
          after: currentValue
        });
      } else {
        const previousValue = previousObj[key];

        if (JSON.stringify(previousValue) !== JSON.stringify(currentValue)) {
          changes.push({
            path,
            changeType: 'modify',
            before: previousValue,
            after: currentValue
          });
        }
      }
    }

    return changes;
  }

  private inferAffectedFeatures(nodeChanges: NodeChange[]): string[] {
    const features = new Set<string>();

    for (const change of nodeChanges) {
      // Infer feature based on node name patterns
      const nodeName = change.nodeName.toLowerCase();

      if (nodeName.includes('email') || nodeName.includes('mail')) {
        features.add('email');
      }
      if (nodeName.includes('calendar') || nodeName.includes('schedule')) {
        features.add('calendar');
      }
      if (nodeName.includes('classif') || nodeName.includes('categor')) {
        features.add('classify');
      }
      if (nodeName.includes('reply') || nodeName.includes('respond')) {
        features.add('reply');
      }
      if (nodeName.includes('quote') || nodeName.includes('estimate')) {
        features.add('quote');
      }

      // Check for LLM prompt changes
      if (change.changes) {
        for (const workflowChange of change.changes) {
          if (workflowChange.path.includes('prompt') || workflowChange.path.includes('message')) {
            features.add('llm_prompt');
          }
        }
      }
    }

    if (features.size === 0) {
      features.add('core');
    }

    return Array.from(features);
  }

  private generateChangeSummary(nodeChanges: NodeChange[]): string {
    if (nodeChanges.length === 0) {
      return 'No changes detected';
    }

    const added = nodeChanges.filter(c => c.changeType === 'add').length;
    const removed = nodeChanges.filter(c => c.changeType === 'remove').length;
    const modified = nodeChanges.filter(c => c.changeType === 'modify').length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (modified > 0) parts.push(`${modified} modified`);

    return `${nodeChanges.length} nodes changed: ${parts.join(', ')}`;
  }
}