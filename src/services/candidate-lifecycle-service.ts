import { ArtifactService } from './artifact-service';
import { AuthorizationService } from './authorization-service';
import {
  CandidateRecord,
  CandidateState,
  CandidateStateTransition,
  DeploymentAction,
} from '../domain/models/candidate';
import { SQLiteCandidateRepository } from '../infra/persistence/sqlite/repositories/candidate-repository';
import { createId } from '../shared/util/id';

export interface CreateCandidateInput {
  candidateId?: string;
  actor: string;
  initialRevision: string;
  knownGoodRevision?: string | null;
  reason?: string;
}

export interface TransitionInput {
  candidateId: string;
  nextState: CandidateState;
  actor: string;
  reason: string;
  policyRuleId?: string | null;
  policyResult?: 'allow' | 'deny';
  evidenceRefs?: string[];
  currentRevision?: string;
}

export interface RollbackInput {
  candidateId: string;
  actor: string;
  actorRole: string;
  targetRevision: string;
  reason: string;
}

export interface RollbackResult {
  allowed: boolean;
  reason: string;
  candidate: CandidateRecord;
  transition: CandidateStateTransition | null;
}

export class CandidateLifecycleService {
  constructor(
    private readonly repository: SQLiteCandidateRepository,
    private readonly artifactService: ArtifactService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  createCandidate(input: CreateCandidateInput): CandidateRecord {
    const createdAt = new Date().toISOString();
    const candidateId =
      input.candidateId ??
      createId('candidate_', [input.actor, input.initialRevision, createdAt]);
    const candidate = this.repository.createCandidate({
      candidateId,
      currentState: 'pending',
      currentRevision: input.initialRevision,
      knownGoodRevision: input.knownGoodRevision ?? null,
      createdAt,
    });

    this.repository.appendTransition({
      transitionId: createId('event_', [candidateId, 'pending', input.actor, createdAt]),
      candidateId,
      fromState: null,
      toState: 'pending',
      actor: input.actor,
      reason: input.reason ?? 'candidate created',
      policyRuleId: null,
      policyResult: 'allow',
      evidenceRefs: [],
      createdAt,
    });

    this.refreshArtifacts(candidateId);
    return candidate;
  }

  transitionCandidate(input: TransitionInput): CandidateStateTransition {
    const candidate = this.getCandidateOrThrow(input.candidateId);
    const now = new Date().toISOString();
    const evidenceRefs = input.evidenceRefs ?? [];
    const transition = this.repository.appendTransition({
      transitionId: createId('event_', [
        input.candidateId,
        candidate.current_state ?? 'none',
        input.nextState,
        input.actor,
        input.reason,
        now,
        evidenceRefs.join(','),
      ]),
      candidateId: input.candidateId,
      fromState: candidate.current_state,
      toState: input.nextState,
      actor: input.actor,
      reason: input.reason,
      policyRuleId: input.policyRuleId ?? null,
      policyResult: input.policyResult ?? 'allow',
      evidenceRefs,
      createdAt: now,
    });

    this.repository.updateCandidateState(
      input.candidateId,
      input.nextState,
      input.currentRevision ?? candidate.current_revision,
      now,
    );

    this.refreshArtifacts(input.candidateId);
    return transition;
  }

  rollbackToKnownGood(input: RollbackInput): RollbackResult {
    const candidate = this.getCandidateOrThrow(input.candidateId);
    const authorization = this.authorizationService.authorize({
      candidateId: input.candidateId,
      action: 'rollback',
      actor: input.actor,
      actorRole: input.actorRole,
      justification: input.reason,
    });

    if (!authorization.allowed) {
      return { allowed: false, reason: authorization.reason, candidate, transition: null };
    }

    if (!candidate.known_good_revision) {
      throw new Error('Known-good revision is not set for this candidate.');
    }

    if (candidate.known_good_revision !== input.targetRevision) {
      throw new Error('Target revision is not the designated known-good revision.');
    }

    const now = new Date().toISOString();
    const evidenceRefs = [`rollback:${input.targetRevision}`];
    const transition = this.repository.appendTransition({
      transitionId: createId('event_', [
        input.candidateId,
        candidate.current_state ?? 'none',
        'rolled_back',
        input.actor,
        input.reason,
        now,
        evidenceRefs.join(','),
      ]),
      candidateId: input.candidateId,
      fromState: candidate.current_state,
      toState: 'rolled_back',
      actor: input.actor,
      reason: input.reason,
      policyRuleId: null,
      policyResult: 'allow',
      evidenceRefs,
      createdAt: now,
    });

    this.repository.updateCandidateState(input.candidateId, 'rolled_back', input.targetRevision, now);
    this.refreshArtifacts(input.candidateId);

    const updated = this.getCandidateOrThrow(input.candidateId);
    return { allowed: true, reason: authorization.reason, candidate: updated, transition };
  }

  recordDeploymentAttempt(input: {
    candidateId: string;
    actor: string;
    actorRole: string;
    action: DeploymentAction;
    reason?: string;
  }): { allowed: boolean; reason: string } {
    return this.authorizationService.authorize({
      candidateId: input.candidateId,
      action: input.action,
      actor: input.actor,
      actorRole: input.actorRole,
      justification: input.reason,
    });
  }

  setKnownGoodRevision(candidateId: string, revision: string): CandidateRecord {
    const candidate = this.getCandidateOrThrow(candidateId);
    const updatedAt = new Date().toISOString();
    this.repository.setKnownGoodRevision(candidateId, revision, updatedAt);
    const updated = this.getCandidateOrThrow(candidateId);
    this.refreshArtifacts(candidateId);
    return updated;
  }

  private refreshArtifacts(candidateId: string): void {
    const candidate = this.getCandidateOrThrow(candidateId);
    const transitions = this.repository.listTransitions(candidateId);
    this.artifactService.writeCandidateStateArtifact(candidate, transitions);
  }

  private getCandidateOrThrow(candidateId: string): CandidateRecord {
    const candidate = this.repository.getCandidateById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate ${candidateId} not found.`);
    }
    return candidate;
  }
}
