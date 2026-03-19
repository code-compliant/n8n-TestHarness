import type {
  CredentialRequirement,
  Environment,
  SetupActionStep,
  SetupOutcome,
} from '../domain/models/credentials';
import type { SQLiteCredentialRepository } from '../infra/persistence/sqlite/repositories/credential-repository';
import type { SQLiteSetupRepository } from '../infra/persistence/sqlite/repositories/setup-repository';
import { buildId } from '../shared/util/ids';
import type { AuditService } from './audit-service';

export interface FixtureSeeder {
  seedFixtures(params: { candidateId: string; environment: Environment }): Promise<{ status: 'success' | 'failed' }>;
}

export interface SetupSkill {
  createCredential(params: {
    environment: Environment;
    credentialKey: string;
    reference: string;
  }): Promise<{ status: 'success' | 'failed' }>;
}

export interface PlaywrightFallback {
  run(params: { candidateId: string; environment: Environment }): Promise<{ status: 'success' | 'failed' }>;
}

export interface ManualSetupGuide {
  stepsFor(environment: Environment): string[];
}

const REFERENCE_PATTERN = /^env:[A-Z0-9_]+$/;

export class SetupService {
  constructor(
    private readonly repository: SQLiteCredentialRepository,
    private readonly setupRepository: SQLiteSetupRepository,
    private readonly auditService: AuditService,
    private readonly fixtureSeeder: FixtureSeeder,
    private readonly setupSkill: SetupSkill,
    private readonly playwrightFallback: PlaywrightFallback,
    private readonly manualGuide: ManualSetupGuide,
  ) {}

  async runSetup(params: {
    candidateId: string;
    environment: Environment;
    actor: string;
    required: CredentialRequirement[];
  }): Promise<SetupOutcome> {
    const actionSequence: SetupActionStep[] = [];
    let fixtureSeeded = false;

    const fixtureResult = await this.fixtureSeeder.seedFixtures({
      candidateId: params.candidateId,
      environment: params.environment,
    });
    fixtureSeeded = fixtureResult.status === 'success';
    actionSequence.push({
      action: 'seed_fixtures',
      status: fixtureResult.status,
    });

    const missingEnvRefs: string[] = [];
    const resolvedReferences = params.required.map((requirement) => {
      const value = process.env[requirement.referenceEnvVar];
      if (!value) {
        missingEnvRefs.push(requirement.referenceEnvVar);
      }
      return {
        credentialKey: requirement.credentialKey,
        reference: value ?? '',
        referenceEnvVar: requirement.referenceEnvVar,
      };
    });

    if (missingEnvRefs.length > 0) {
      actionSequence.push({
        action: 'resolve_env_references',
        status: 'failed',
        detail: `Missing reference variables: ${missingEnvRefs.join(', ')}`,
      });
      const outcome = this.buildOutcome({
        candidateId: params.candidateId,
        environment: params.environment,
        actor: params.actor,
        status: 'failed',
        actionSequence,
        fixtureSeeded,
      });
      this.persistOutcome(outcome);
      return outcome;
    }

    actionSequence.push({
      action: 'resolve_env_references',
      status: 'success',
    });

    let apiSetupFailed = false;
    for (const resolved of resolvedReferences) {
      if (!REFERENCE_PATTERN.test(resolved.reference)) {
        actionSequence.push({
          action: `validate_reference:${resolved.credentialKey}`,
          status: 'failed',
        });
        apiSetupFailed = true;
        continue;
      }

      const result = await this.setupSkill.createCredential({
        environment: params.environment,
        credentialKey: resolved.credentialKey,
        reference: resolved.reference,
      });
      actionSequence.push({
        action: `setup_credential:${resolved.credentialKey}`,
        status: result.status,
      });
      if (result.status === 'failed') {
        apiSetupFailed = true;
        continue;
      }

      const now = new Date().toISOString();
      this.repository.upsertBinding({
        environment: params.environment,
        credentialKey: resolved.credentialKey,
        reference: resolved.reference,
        rollbackReference: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!apiSetupFailed) {
      const outcome = this.buildOutcome({
        candidateId: params.candidateId,
        environment: params.environment,
        actor: params.actor,
        status: 'success',
        actionSequence,
        fixtureSeeded,
      });
      this.persistOutcome(outcome);
      return outcome;
    }

    const fallback = await this.playwrightFallback.run({
      candidateId: params.candidateId,
      environment: params.environment,
    });
    actionSequence.push({
      action: 'playwright_fallback',
      status: fallback.status,
    });

    if (fallback.status === 'success') {
      const outcome = this.buildOutcome({
        candidateId: params.candidateId,
        environment: params.environment,
        actor: params.actor,
        status: 'success',
        actionSequence,
        fixtureSeeded,
      });
      this.persistOutcome(outcome);
      return outcome;
    }

    const manualSteps = this.manualGuide.stepsFor(params.environment);
    actionSequence.push({
      action: 'manual_guidance',
      status: 'success',
    });

    const outcome = this.buildOutcome({
      candidateId: params.candidateId,
      environment: params.environment,
      actor: params.actor,
      status: 'manual_required',
      actionSequence,
      fixtureSeeded,
      manualGuidance: manualSteps,
    });
    this.persistOutcome(outcome);
    return outcome;
  }

  private buildOutcome(input: Omit<SetupOutcome, 'setupId'> & { setupId?: string }): SetupOutcome {
    const actionDigest = JSON.stringify(input.actionSequence);
    const manualDigest = input.manualGuidance ? input.manualGuidance.join('|') : 'none';
    return {
      ...input,
      setupId:
        input.setupId ??
        buildId(
          'setup',
          input.candidateId,
          input.environment,
          input.actor,
          input.status,
          actionDigest,
          input.fixtureSeeded ? 'fixtures' : 'no-fixtures',
          manualDigest,
        ),
    };
  }

  private persistOutcome(outcome: SetupOutcome): void {
    this.setupRepository.saveSetupOutcome(outcome);
    this.auditService.recordSetupAudit({
      candidateId: outcome.candidateId,
      actor: outcome.actor,
      environment: outcome.environment,
      status: outcome.status,
      actionSequence: outcome.actionSequence,
    });
  }
}
