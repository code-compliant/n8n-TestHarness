import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { CandidateRecord, CandidateStateTransition } from '../domain/models/candidate';

export interface StateArtifact {
  artifact_version: string;
  candidate_id: string;
  current_state: string;
  current_revision: string;
  known_good_revision: string | null;
  evidence_refs: string[];
  timeline: Array<{
    transition_id: string;
    from_state: string | null;
    to_state: string;
    actor: string;
    reason: string;
    policy_rule_id: string | null;
    policy_result: string;
    evidence_refs: string[];
    created_at: string;
  }>;
}

export interface ArtifactServiceConfig {
  basePath?: string;
}

export class ArtifactService {
  private readonly basePath: string;

  constructor(config: ArtifactServiceConfig = {}) {
    this.basePath = config.basePath ?? join(process.cwd(), '_bmad-output', 'implementation-artifacts');
  }

  writeCandidateStateArtifact(candidate: CandidateRecord, transitions: CandidateStateTransition[]): string {
    const evidenceRefs = Array.from(
      new Set(transitions.flatMap((transition) => transition.evidence_refs)),
    );
    const artifact: StateArtifact = {
      artifact_version: '1',
      candidate_id: candidate.candidate_id,
      current_state: candidate.current_state,
      current_revision: candidate.current_revision,
      known_good_revision: candidate.known_good_revision,
      evidence_refs: evidenceRefs,
      timeline: transitions.map((transition) => ({
        transition_id: transition.transition_id,
        from_state: transition.from_state,
        to_state: transition.to_state,
        actor: transition.actor,
        reason: transition.reason,
        policy_rule_id: transition.policy_rule_id,
        policy_result: transition.policy_result,
        evidence_refs: transition.evidence_refs,
        created_at: transition.created_at,
      })),
    };

    const filePath = this.resolveArtifactPath(candidate.candidate_id);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(artifact, null, 2), 'utf8');
    return filePath;
  }

  resolveArtifactPath(candidateId: string): string {
    return join(this.basePath, `candidate-${candidateId}-state.json`);
  }
}
