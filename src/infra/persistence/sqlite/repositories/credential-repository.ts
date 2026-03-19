import Database from 'better-sqlite3';

import type { CredentialBinding, Environment } from '../../../domain/models/credentials';
import { CREDENTIAL_BINDINGS_TABLE } from '../schema';

export class SQLiteCredentialRepository {
  private readonly insertBinding: Database.Statement;
  private readonly updateBinding: Database.Statement;
  private readonly readBinding: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertBinding = this.db.prepare(`
      INSERT INTO ${CREDENTIAL_BINDINGS_TABLE} (
        environment,
        credential_key,
        reference,
        rollback_reference,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.updateBinding = this.db.prepare(`
      UPDATE ${CREDENTIAL_BINDINGS_TABLE}
      SET reference = ?, rollback_reference = ?, updated_at = ?
      WHERE environment = ? AND credential_key = ?
    `);
    this.readBinding = this.db.prepare(`
      SELECT environment, credential_key, reference, rollback_reference, created_at, updated_at
      FROM ${CREDENTIAL_BINDINGS_TABLE}
      WHERE environment = ? AND credential_key = ?
    `);
  }

  findBinding(environment: Environment, credentialKey: string): CredentialBinding | null {
    const row = this.readBinding.get(environment, credentialKey) as
      | {
          environment: Environment;
          credential_key: string;
          reference: string;
          rollback_reference: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      environment: row.environment,
      credentialKey: row.credential_key,
      reference: row.reference,
      rollbackReference: row.rollback_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  upsertBinding(binding: CredentialBinding): void {
    const existing = this.findBinding(binding.environment, binding.credentialKey);
    if (existing) {
      this.updateBinding.run(
        binding.reference,
        binding.rollbackReference ?? null,
        binding.updatedAt,
        binding.environment,
        binding.credentialKey,
      );
      return;
    }

    this.insertBinding.run(
      binding.environment,
      binding.credentialKey,
      binding.reference,
      binding.rollbackReference ?? null,
      binding.createdAt,
      binding.updatedAt,
    );
  }
}
