import * as fs from 'fs';
import * as path from 'path';

export interface PatternMatch {
  file: string;
  category: string;
  name: string;
  nodeTypes: string[];
  score: number;
  workflowJson: unknown;
}

interface WorkflowIndexEntry {
  file: string;
  category: string;
  name: string;
  triggerType: string;
  nodeTypes: string[];
  nodeCount: number;
}

export interface SearchQuery {
  nodeTypes?: string[];
  category?: string;
  keywords?: string[];
}

export class WorkflowPatternSearch {
  private index: WorkflowIndexEntry[] = [];
  private indexPath: string;
  private workflowBasePath: string;

  constructor(injectIndex?: WorkflowIndexEntry[]) {
    this.indexPath = process.env.WORKFLOW_PATTERN_INDEX ||
      '/mnt/pgdata/openclaw/workspace/references/awesome-n8n-workflows-index.json';
    this.workflowBasePath = process.env.WORKFLOW_PATTERN_BASE ||
      '/mnt/pgdata/openclaw/workspace/references/';
    if (injectIndex) {
      this.index = injectIndex;
    } else {
      this.loadIndex();
    }
  }

  private loadIndex(): void {
    try {
      const indexData = fs.readFileSync(this.indexPath, 'utf-8');
      this.index = JSON.parse(indexData);
    } catch (error) {
      console.error(`Failed to load workflow pattern index from ${this.indexPath}:`, error);
      this.index = [];
    }
  }

  private calculateScore(entry: WorkflowIndexEntry, query: SearchQuery): number {
    let score = 0;

    // +3 for each queried nodeType found in entry.nodeTypes
    if (query.nodeTypes && query.nodeTypes.length > 0) {
      const matchingNodeTypes = query.nodeTypes.filter(nodeType =>
        entry.nodeTypes.some(entryNodeType =>
          entryNodeType.toLowerCase() === nodeType.toLowerCase()
        )
      );
      score += matchingNodeTypes.length * 3;
    }

    // +2 if queried category matches entry.category (case-insensitive substring)
    if (query.category && entry.category.toLowerCase().includes(query.category.toLowerCase())) {
      score += 2;
    }

    // +1 for each keyword found in entry.name (case-insensitive)
    if (query.keywords && query.keywords.length > 0) {
      const matchingKeywords = query.keywords.filter(keyword =>
        entry.name.toLowerCase().includes(keyword.toLowerCase())
      );
      score += matchingKeywords.length;
    }

    return score;
  }

  private loadWorkflowJson(relativePath: string): unknown {
    try {
      const fullPath = path.join(this.workflowBasePath, relativePath);
      const workflowData = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(workflowData);
    } catch (error) {
      console.error(`Failed to load workflow JSON from ${relativePath}:`, error);
      return null;
    }
  }

  search(query: SearchQuery, limit = 3): PatternMatch[] {
    // Calculate scores and filter out entries with score 0
    const scoredEntries = this.index
      .map(entry => ({
        entry,
        score: this.calculateScore(entry, query)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, limit); // Take top results

    // Load workflow JSONs lazily (only for top matches)
    return scoredEntries.map(({ entry, score }) => ({
      file: entry.file,
      category: entry.category,
      name: entry.name,
      nodeTypes: entry.nodeTypes,
      score,
      workflowJson: this.loadWorkflowJson(entry.file)
    }));
  }
}