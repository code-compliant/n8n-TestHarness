import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { PatternApplicationRecord, PatternMetadata } from '../../../domain/models/patterns';

export interface PatternSearchInput {
  integration?: string | null;
  tokens?: string[];
}

export class SQLitePatternRepository {
  private readonly insertPattern: Database.Statement;
  private readonly updatePattern: Database.Statement;
  private readonly readPattern: Database.Statement;
  private readonly searchPatterns: Database.Statement;
  private readonly insertApplication: Database.Statement;

  constructor(private readonly db: Database.Database, private readonly baseDir: string = process.cwd()) {
    this.insertPattern = this.db.prepare(`
      INSERT INTO patterns (
        pattern_id,
        name,
        description,
        integration,
        tags,
        workflow_identifiers,
        context_json,
        success_count,
        last_success_at,
        quality_score,
        created_at,
        updated_at,
        source_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updatePattern = this.db.prepare(`
      UPDATE patterns
      SET
        name = ?,
        description = ?,
        integration = ?,
        tags = ?,
        workflow_identifiers = ?,
        context_json = ?,
        success_count = ?,
        last_success_at = ?,
        quality_score = ?,
        updated_at = ?,
        source_request_id = ?
      WHERE pattern_id = ?
    `);
    this.readPattern = this.db.prepare(`
      SELECT
        pattern_id,
        name,
        description,
        integration,
        tags,
        workflow_identifiers,
        context_json,
        success_count,
        last_success_at,
        quality_score,
        created_at,
        updated_at,
        source_request_id
      FROM patterns
      WHERE pattern_id = ?
    `);
    this.searchPatterns = this.db.prepare(`
      SELECT
        pattern_id,
        name,
        description,
        integration,
        tags,
        workflow_identifiers,
        context_json,
        success_count,
        last_success_at,
        quality_score,
        created_at,
        updated_at,
        source_request_id
      FROM patterns
      WHERE (? IS NULL OR integration LIKE ?) OR (? IS NULL OR tags LIKE ?) OR (? IS NULL OR workflow_identifiers LIKE ?)
    `);
    this.insertApplication = this.db.prepare(`
      INSERT INTO pattern_applications (
        request_id,
        pattern_id,
        applied_by,
        applied_at,
        source,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
  }

  savePattern(pattern: PatternMetadata): PatternMetadata {
    const existing = this.readPattern.get(pattern.pattern_id) as
      | {
          pattern_id: string;
          success_count: number;
          created_at: string;
        }
      | undefined;

    const tags = JSON.stringify(pattern.tags ?? []);
    const workflowIdentifiers = JSON.stringify(pattern.workflow_identifiers ?? []);
    const contextJson = JSON.stringify(pattern.context ?? { integrations: [], operations: [], keywords: [] });

    if (existing) {
      const successCount = existing.success_count + 1;
      this.updatePattern.run(
        pattern.name,
        pattern.description,
        pattern.integration,
        tags,
        workflowIdentifiers,
        contextJson,
        successCount,
        pattern.last_success_at,
        pattern.quality_score,
        pattern.updated_at,
        pattern.source_request_id ?? null,
        pattern.pattern_id,
      );
      const updated = { ...pattern, success_count: successCount, created_at: existing.created_at };
      this.persistPatternFile(updated);
      return updated;
    }

    this.insertPattern.run(
      pattern.pattern_id,
      pattern.name,
      pattern.description,
      pattern.integration,
      tags,
      workflowIdentifiers,
      contextJson,
      pattern.success_count,
      pattern.last_success_at,
      pattern.quality_score,
      pattern.created_at,
      pattern.updated_at,
      pattern.source_request_id ?? null,
    );
    this.persistPatternFile(pattern);
    return pattern;
  }

  recordPatternApplication(record: PatternApplicationRecord): void {
    this.insertApplication.run(
      record.request_id,
      record.pattern_id,
      record.applied_by,
      record.applied_at,
      record.source,
      record.notes ?? null,
    );
  }

  findPattern(patternId: string): PatternMetadata | null {
    const row = this.readPattern.get(patternId) as
      | {
          pattern_id: string;
          name: string;
          description: string;
          integration: string;
          tags: string;
          workflow_identifiers: string;
          context_json: string;
          success_count: number;
          last_success_at: string;
          quality_score: number;
          created_at: string;
          updated_at: string;
          source_request_id: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      pattern_id: row.pattern_id,
      name: row.name,
      description: row.description,
      integration: row.integration,
      tags: JSON.parse(row.tags) as string[],
      workflow_identifiers: JSON.parse(row.workflow_identifiers) as string[],
      context: JSON.parse(row.context_json) as PatternMetadata['context'],
      success_count: row.success_count,
      last_success_at: row.last_success_at,
      quality_score: row.quality_score,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_request_id: row.source_request_id,
    };
  }

  searchByContext(input: PatternSearchInput): PatternMetadata[] {
    const token = input.tokens?.[0] ?? null;
    const integration = input.integration ?? null;
    const wildcardToken = token ? `%${token}%` : null;
    const wildcardIntegration = integration ? `%${integration}%` : null;

    const rows = this.searchPatterns.all(
      integration,
      wildcardIntegration,
      token,
      wildcardToken,
      token,
      wildcardToken,
    ) as Array<{
      pattern_id: string;
      name: string;
      description: string;
      integration: string;
      tags: string;
      workflow_identifiers: string;
      context_json: string;
      success_count: number;
      last_success_at: string;
      quality_score: number;
      created_at: string;
      updated_at: string;
      source_request_id: string | null;
    }>;

    return rows.map((row) => ({
      pattern_id: row.pattern_id,
      name: row.name,
      description: row.description,
      integration: row.integration,
      tags: JSON.parse(row.tags) as string[],
      workflow_identifiers: JSON.parse(row.workflow_identifiers) as string[],
      context: JSON.parse(row.context_json) as PatternMetadata['context'],
      success_count: row.success_count,
      last_success_at: row.last_success_at,
      quality_score: row.quality_score,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_request_id: row.source_request_id,
    }));
  }

  private persistPatternFile(pattern: PatternMetadata): void {
    const dir = join(this.baseDir, 'data', 'patterns');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${pattern.pattern_id}.json`);
    writeFileSync(path, JSON.stringify(pattern, null, 2));
  }
}
