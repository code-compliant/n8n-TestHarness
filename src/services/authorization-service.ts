import { DeploymentAction } from '../domain/models/candidate';
import { SQLiteDeploymentRepository } from '../infra/persistence/sqlite/repositories/deployment-repository';
import { createId } from '../shared/util/id';

export interface RolePolicy {
  [action: string]: string[];
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
}

export interface AuthorizationInput {
  candidateId: string;
  action: DeploymentAction;
  actor: string;
  actorRole: string;
  justification?: string;
}

const DEFAULT_POLICY: RolePolicy = {
  deploy: ['operator', 'approver'],
  rollback: ['approver'],
};

export class AuthorizationService {
  constructor(
    private readonly repository: SQLiteDeploymentRepository,
    private readonly rolePolicy: RolePolicy = DEFAULT_POLICY,
  ) {}

  authorize(input: AuthorizationInput): AuthorizationResult {
    const allowedRoles = this.rolePolicy[input.action] ?? [];
    const allowed = allowedRoles.includes(input.actorRole);
    const reason = allowed
      ? `role ${input.actorRole} permitted for ${input.action}`
      : `role ${input.actorRole} not permitted for ${input.action}`;

    const createdAt = new Date().toISOString();
    this.repository.recordAttempt({
      attemptId: createId('attempt_', [
        input.candidateId,
        input.action,
        input.actor,
        input.actorRole,
        createdAt,
      ]),
      candidateId: input.candidateId,
      action: input.action,
      actor: input.actor,
      actorRole: input.actorRole,
      allowed,
      reason: input.justification ? `${reason} (${input.justification})` : reason,
      createdAt,
    });

    return { allowed, reason };
  }
}
