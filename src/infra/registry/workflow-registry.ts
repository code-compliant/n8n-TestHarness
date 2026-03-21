import type Database from 'better-sqlite3';

export interface WorkflowRegistryRecord {
  workflowId: string;
  slug: string;
  contractPath: string;
  contractVersion: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowRegistry {
  constructor(private readonly db: Database.Database) {}

  register(record: Omit<WorkflowRegistryRecord, 'createdAt' | 'updatedAt'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO workflow_registry (workflowId, slug, contractPath, contractVersion, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (workflowId) DO UPDATE SET
        slug = excluded.slug,
        contractPath = excluded.contractPath,
        contractVersion = excluded.contractVersion,
        updatedAt = excluded.updatedAt
    `);

    const now = new Date().toISOString();
    stmt.run(
      record.workflowId,
      record.slug,
      record.contractPath,
      record.contractVersion,
      now,
      now
    );
  }

  findByWorkflowId(workflowId: string): WorkflowRegistryRecord | null {
    const stmt = this.db.prepare(`
      SELECT workflowId, slug, contractPath, contractVersion, createdAt, updatedAt
      FROM workflow_registry
      WHERE workflowId = ?
    `);

    const result = stmt.get(workflowId) as WorkflowRegistryRecord | undefined;
    return result || null;
  }

  findBySlug(slug: string): WorkflowRegistryRecord | null {
    const stmt = this.db.prepare(`
      SELECT workflowId, slug, contractPath, contractVersion, createdAt, updatedAt
      FROM workflow_registry
      WHERE slug = ?
    `);

    const result = stmt.get(slug) as WorkflowRegistryRecord | undefined;
    return result || null;
  }

  updateContractVersion(workflowId: string, newVersion: string): void {
    const stmt = this.db.prepare(`
      UPDATE workflow_registry
      SET contractVersion = ?, updatedAt = ?
      WHERE workflowId = ?
    `);

    stmt.run(newVersion, new Date().toISOString(), workflowId);
  }

  listAll(): WorkflowRegistryRecord[] {
    const stmt = this.db.prepare(`
      SELECT workflowId, slug, contractPath, contractVersion, createdAt, updatedAt
      FROM workflow_registry
      ORDER BY createdAt DESC
    `);

    return stmt.all() as WorkflowRegistryRecord[];
  }
}