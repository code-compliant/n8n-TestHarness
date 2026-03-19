import type { CredentialRequirement, CredentialValidationResult, Environment } from '../domain/models/credentials';
import type { SQLiteCredentialRepository } from '../infra/persistence/sqlite/repositories/credential-repository';

const REFERENCE_PATTERN = /^env:[A-Z0-9_]+$/;

export class CredentialService {
  constructor(private readonly repository: SQLiteCredentialRepository) {}

  validateBindings(
    environment: Environment,
    required: CredentialRequirement[],
  ): CredentialValidationResult {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const requirement of required) {
      const binding = this.repository.findBinding(environment, requirement.credentialKey);
      if (!binding) {
        missing.push(requirement.credentialKey);
        continue;
      }
      if (!REFERENCE_PATTERN.test(binding.reference)) {
        invalid.push(requirement.credentialKey);
      }
    }

    if (missing.length === 0 && invalid.length === 0) {
      return {
        status: 'pass',
        environment,
        missing,
        invalid,
        remediation: 'All credential bindings are present and valid.',
      };
    }

    return {
      status: 'blocked',
      environment,
      missing,
      invalid,
      remediation:
        'Add missing bindings or fix invalid references (expected env:NAME format) before execution.',
    };
  }
}
