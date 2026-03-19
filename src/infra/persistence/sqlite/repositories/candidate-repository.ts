import Database from 'better-sqlite3';

import {
  CandidateJourney,
  CandidateRecord,
  CandidateSourceType,
  CandidateState,
  CandidateStateTransition,
  CandidateStatus,
  CandidateType,
} from '../../../domain/models/candidate';
import { CANDIDATE_TABLE, TRANSITION_TABLE } from '../schema';

export interface PersistGeneratedCandidateInput {
  candidateId: string;
  requestId: string;
  journey: CandidateJourney;
  actor: string;
  workflowIdentifier?: string | null;
  status: Extract<CandidateStatus, 'generated' | 'review'>;
  baseWorkflow: string;
  candidateWorkflow: string;
  placeholders: string;
  diff: string;
  sectionTraceability: string;
  createdAt: string;
}

export interface PersistIncidentCandidateInput {
  candidateId: string;
  workflowId: string;
  candidateType: CandidateType;
  status: Extract<CandidateStatus, 'pending_validation' | 'validated' | 'failed'>;
  sourceType: CandidateSourceType;
  sourceId: string;
  createdAt: string;
}

export type PersistCandidateInput = PersistGeneratedCandidateInput | PersistIncidentCandidateInput;

export interface CreateCandidateInput {
  candidateId: string;
  currentState: CandidateState;
  currentRevision: string;
  knownGoodRevision?: string | null;
  createdAt: string;
}

export interface TransitionInput {
  transitionId: string;
  candidateId: string;
  fromState: CandidateState | null;
  toState: CandidateState;
  actor: string;
  reason: string;
  policyRuleId?: string | null;
  policyResult: 'allow' | 'deny';
  evidenceRefs: string[];
  createdAt: string;
}

export class SQLiteCandidateRepository {
  private readonly insertGeneratedCandidate: Database.Statement;
  private readonly insertIncidentCandidate: Database.Statement;
  private readonly readByCandidateId: Database.Statement;
  private readonly insertLifecycleCandidate: Database.Statement;
  private readonly selectLifecycleCandidate: Database.Statement;
  private readonly updateCandidateStateStmt: Database.Statement;
  private readonly updateKnownGoodStmt: Database.Statement;
  private readonly insertTransition: Database.Statement;
  private readonly listTransitionsStmt: Database.Statement;
  private readonly transactionWrapper: <T>(fn: () => T) => T;

  constructor(private readonly db: Database.Database) {
    this.insertGeneratedCandidate = this.db.prepare(`
      INSERT INTO ${CANDIDATE_TABLE} (
        candidate_id,
        request_id,
        journey_type,
        actor,
        status,
        workflow_identifier,
        base_workflow,
        candidate_workflow,
        placeholders,
        diff,
        section_traceability,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.insertIncidentCandidate = this.db.prepare(`
      INSERT INTO ${CANDIDATE_TABLE} (
        candidate_id,
        workflow_id,
        candidate_type,
        status,
        source_type,
        source_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.readByCandidateId = this.db.prepare(`
      SELECT
        candidate_id,
        request_id,
        journey_type,
        actor,
        status,
        workflow_identifier,
        base_workflow,
        candidate_workflow,
        placeholders,
        diff,
        workflow_id,
        candidate_type,
        source_type,
        source_id,
        created_at
      FROM ${CANDIDATE_TABLE}
      WHERE candidate_id = ?
    `);

    this.insertLifecycleCandidate = this.db.prepare(`
      INSERT INTO ${CANDIDATE_TABLE} (
        id,
        current_state,
        current_revision,
        known_good_revision,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.selectLifecycleCandidate = this.db.prepare(`
      SELECT id, current_state, current_revision, known_good_revision, created_at, updated_at
      FROM ${CANDIDATE_TABLE}
      WHERE id = ?
    `);
    this.updateCandidateStateStmt = this.db.prepare(`
      UPDATE ${CANDIDATE_TABLE}
      SET current_state = ?, current_revision = ?, updated_at = ?
      WHERE id = ?
    `);
    this.updateKnownGoodStmt = this.db.prepare(`
      UPDATE ${CANDIDATE_TABLE}
      SET known_good_revision = ?, updated_at = ?
      WHERE id = ?
    `);
    this.insertTransition = this.db.prepare(`
      INSERT INTO ${TRANSITION_TABLE} (
        id,
        candidate_id,
        from_state,
        to_state,
        actor,
        reason,
        policy_rule_id,
        policy_result,
        evidence_refs,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.listTransitionsStmt = this.db.prepare(`
      SELECT
        id,
        candidate_id,
        from_state,
        to_state,
        actor,
        reason,
        policy_rule_id,
        policy_result,
        evidence_refs,
        created_at
      FROM ${TRANSITION_TABLE}
      WHERE candidate_id = ?
      ORDER BY created_at ASC
    `);
    this.transactionWrapper = this.db.transaction.bind(this.db);
  }

  saveCandidate(input: PersistCandidateInput): CandidateRecord {
    const existing = this.readByCandidateId.get(input.candidateId) as
      | {
          candidate_id: string;
          request_id: string | null;
          journey_type: string | null;
          actor: string | null;
          status: CandidateStatus | null;
          workflow_identifier: string | null;
          base_workflow: string | null;
          candidate_workflow: string | null;
          placeholders: string | null;
          diff: string | null;
          workflow_id: string | null;
          candidate_type: CandidateType | null;
          source_type: CandidateSourceType | null;
          source_id: string | null;
          created_at: string;
        }
      | undefined;

    if (existing) {
      if (existing.workflow_id || existing.candidate_type) {
        return {
          candidate_id: existing.candidate_id,
          workflow_id: existing.workflow_id ?? '',
          candidate_type: (existing.candidate_type ?? 'repair') as CandidateType,
          status: (existing.status ?? 'pending_validation') as CandidateStatus,
          source_type: (existing.source_type ?? 'incident') as CandidateSourceType,
          source_id: existing.source_id ?? '',
          created_at: existing.created_at,
        };
      }

      return {
        candidate_id: existing.candidate_id,
        request_id: existing.request_id ?? '',
        journey: (existing.journey_type ?? 'new') as CandidateJourney,
        actor: existing.actor ?? 'operator',
        workflow_identifier: existing.workflow_identifier,
        status: (existing.status ?? 'generated') as CandidateStatus,
        base_workflow: existing.base_workflow ?? '',
        candidate_workflow: existing.candidate_workflow ?? '',
        placeholders: JSON.parse(existing.placeholders ?? '[]'),
        diff: JSON.parse(existing.diff ?? '{}'),
        created_at: existing.created_at,
      };
    }

    const now = input.createdAt;

    if (isIncidentInput(input)) {
      this.insertIncidentCandidate.run(
        input.candidateId,
        input.workflowId,
        input.candidateType,
        input.status,
        input.sourceType,
        input.sourceId,
        now,
        now,
      );

      return {
        candidate_id: input.candidateId,
        workflow_id: input.workflowId,
        candidate_type: input.candidateType,
        status: input.status,
        source_type: input.sourceType,
        source_id: input.sourceId,
        created_at: now,
      };
    }

    this.insertGeneratedCandidate.run(
      input.candidateId,
      input.requestId,
      input.journey,
      input.actor,
      input.status,
      input.workflowIdentifier ?? null,
      input.baseWorkflow,
      input.candidateWorkflow,
      input.placeholders,
      input.diff,
      input.sectionTraceability,
      now,
      now,
    );

    return {
      candidate_id: input.candidateId,
      request_id: input.requestId,
      journey: input.journey,
      actor: input.actor,
      workflow_identifier: input.workflowIdentifier,
      status: input.status,
      base_workflow: input.baseWorkflow,
      candidate_workflow: input.candidateWorkflow,
      placeholders: JSON.parse(input.placeholders),
      diff: JSON.parse(input.diff),
      created_at: now,
    };
  }

  transaction<T>(fn: () => T): T {
    return this.transactionWrapper(fn)();
  }

  createCandidate(input: CreateCandidateInput): CandidateRecord {
    const existing = this.getCandidateById(input.candidateId);
    if (existing) {
      return existing;
    }

    const createdAt = input.createdAt;
    this.insertLifecycleCandidate.run(
      input.candidateId,
      input.currentState,
      input.currentRevision,
      input.knownGoodRevision ?? null,
      createdAt,
      createdAt,
    );

    return {
      candidate_id: input.candidateId,
      current_state: input.currentState,
      current_revision: input.currentRevision,
      known_good_revision: input.knownGoodRevision ?? null,
      created_at: createdAt,
      updated_at: createdAt,
    };
  }

  getCandidateById(candidateId: string): CandidateRecord | null {
    const row = this.selectLifecycleCandidate.get(candidateId) as
      | {
          id: string;
          current_state: CandidateState;
          current_revision: string;
          known_good_revision: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      candidate_id: row.id,
      current_state: row.current_state,
      current_revision: row.current_revision,
      known_good_revision: row.known_good_revision,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  updateCandidateState(candidateId: string, nextState: CandidateState, currentRevision: string, updatedAt: string): void {
    this.updateCandidateStateStmt.run(nextState, currentRevision, updatedAt, candidateId);
  }

  setKnownGoodRevision(candidateId: string, revision: string, updatedAt: string): void {
    this.updateKnownGoodStmt.run(revision, updatedAt, candidateId);
  }

  appendTransition(input: TransitionInput): CandidateStateTransition {
    this.insertTransition.run(
      input.transitionId,
      input.candidateId,
      input.fromState,
      input.toState,
      input.actor,
      input.reason,
      input.policyRuleId ?? null,
      input.policyResult,
      JSON.stringify(input.evidenceRefs),
      input.createdAt,
    );

    return {
      transition_id: input.transitionId,
      candidate_id: input.candidateId,
      from_state: input.fromState,
      to_state: input.toState,
      actor: input.actor,
      reason: input.reason,
      policy_rule_id: input.policyRuleId ?? null,
      policy_result: input.policyResult,
      evidence_refs: input.evidenceRefs,
      created_at: input.createdAt,
    };
  }

  listTransitions(candidateId: string): CandidateStateTransition[] {
    const rows = this.listTransitionsStmt.all(candidateId) as Array<{
      id: string;
      candidate_id: string;
      from_state: CandidateState | null;
      to_state: CandidateState;
      actor: string;
      reason: string;
      policy_rule_id: string | null;
      policy_result: 'allow' | 'deny';
      evidence_refs: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      transition_id: row.id,
      candidate_id: row.candidate_id,
      from_state: row.from_state,
      to_state: row.to_state,
      actor: row.actor,
      reason: row.reason,
      policy_rule_id: row.policy_rule_id,
      policy_result: row.policy_result,
      evidence_refs: JSON.parse(row.evidence_refs) as string[],
      created_at: row.created_at,
    }));
  }
}

function isIncidentInput(input: PersistCandidateInput): input is PersistIncidentCandidateInput {
  return 'workflowId' in input;
}
