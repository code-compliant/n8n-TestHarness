import type { Environment, RotationOutcome } from '../domain/models/credentials';
import type { SQLiteCredentialRepository } from '../infra/persistence/sqlite/repositories/credential-repository';
import type { SQLiteRotationRepository } from '../infra/persistence/sqlite/repositories/rotation-repository';
import { buildId } from '../shared/util/ids';

const REFERENCE_PATTERN = /^env:[A-Z0-9_]+$/;

export class RotationService {
  constructor(
    private readonly repository: SQLiteCredentialRepository,
    private readonly rotationRepository: SQLiteRotationRepository,
  ) {}

  rotateReference(params: {
    candidateId: string;
    actor: string;
    fromEnvironment: Environment;
    toEnvironment: Environment;
    credentialKey: string;
  }): RotationOutcome {
    const source = this.repository.findBinding(params.fromEnvironment, params.credentialKey);
    const target = this.repository.findBinding(params.toEnvironment, params.credentialKey);

    if (!source || !target) {
      throw new Error('Missing credential binding for rotation.');
    }

    if (!REFERENCE_PATTERN.test(source.reference) || !REFERENCE_PATTERN.test(target.reference)) {
      throw new Error('Invalid credential reference for rotation.');
    }

    const now = new Date().toISOString();
    const outcome: RotationOutcome = {
      rotationId: buildId(
        'rotation',
        params.candidateId,
        params.actor,
        params.fromEnvironment,
        params.toEnvironment,
        params.credentialKey,
        source.reference,
        target.reference,
      ),
      candidateId: params.candidateId,
      actor: params.actor,
      fromEnvironment: params.fromEnvironment,
      toEnvironment: params.toEnvironment,
      credentialKey: params.credentialKey,
      previousReference: target.reference,
      newReference: source.reference,
      rollbackReference: target.reference,
    };

    this.repository.upsertBinding({
      environment: params.toEnvironment,
      credentialKey: params.credentialKey,
      reference: source.reference,
      rollbackReference: target.reference,
      createdAt: target.createdAt,
      updatedAt: now,
    });

    this.rotationRepository.saveRotation(outcome, now);

    return outcome;
  }
}
