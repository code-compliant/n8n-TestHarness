import type Database from 'better-sqlite3';

export const INTENT_TABLE = 'intake_requests';
export const CANDIDATE_TABLE = 'candidates';
export const VALIDATION_FAILURE_TABLE = 'validation_failures';
export const INCIDENT_TABLE = 'incidents';
export const REPAIR_REQUEST_TABLE = 'repair_requests';
export const REPAIR_EVIDENCE_TABLE = 'repair_evidence';
export const RECOVERY_OUTCOME_TABLE = 'recovery_outcomes';
export const CREDENTIAL_BINDINGS_TABLE = 'credential_bindings';
export const SETUP_RECORDS_TABLE = 'setup_records';
export const AUDIT_EVENTS_TABLE = 'audit_events';
export const ROTATION_EVENTS_TABLE = 'rotation_events';
export const TRANSITION_TABLE = 'candidate_state_transitions';
export const DEPLOYMENT_ATTEMPT_TABLE = 'deployment_attempts';

export function ensureIntakeSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${INTENT_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      actor TEXT NOT NULL,
      journey_type TEXT NOT NULL CHECK (journey_type IN ('new','modify','repair','upgrade','test','rollback')),
      confidence REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('received','blocked','ready')),
      raw_payload TEXT NOT NULL,
      summary TEXT NOT NULL,
      workflow_identifier TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intake_requests_status ON ${INTENT_TABLE} (status);
    CREATE INDEX IF NOT EXISTS idx_intake_requests_journey ON ${INTENT_TABLE} (journey_type);
    CREATE INDEX IF NOT EXISTS idx_intake_requests_request_id ON ${INTENT_TABLE} (request_id);
  `;

  db.exec(migration);
}

export function ensureCandidateSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${CANDIDATE_TABLE} (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      candidate_id TEXT UNIQUE,
      request_id TEXT NULL,
      journey_type TEXT NULL CHECK (journey_type IN ('new','modify','repair','upgrade','test','rollback')),
      actor TEXT NULL,
      status TEXT NULL CHECK (status IN ('generated','review','pending_validation','validated','failed')),
      workflow_identifier TEXT NULL,
      base_workflow TEXT NULL,
      candidate_workflow TEXT NULL,
      placeholders TEXT NULL,
      diff TEXT NULL,
      section_traceability TEXT NULL,
      workflow_id TEXT NULL,
      candidate_type TEXT NULL CHECK (candidate_type IN ('new','modify','repair','upgrade','test','rollback')),
      source_type TEXT NULL CHECK (source_type IN ('incident','request','manual')),
      source_id TEXT NULL,
      current_state TEXT NULL CHECK (current_state IN ('pending','testing','approved','deployed','rolled_back')),
      current_revision TEXT NULL,
      known_good_revision TEXT NULL,
      created_at TEXT NULL,
      updated_at TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_candidates_request_id ON ${CANDIDATE_TABLE} (request_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_candidate_id ON ${CANDIDATE_TABLE} (candidate_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_journey ON ${CANDIDATE_TABLE} (journey_type);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON ${CANDIDATE_TABLE} (status);
    CREATE INDEX IF NOT EXISTS idx_candidates_workflow ON ${CANDIDATE_TABLE} (workflow_id);
  `;

  db.exec(migration);
}

export function ensureValidationSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${VALIDATION_FAILURE_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      failure_id TEXT NOT NULL UNIQUE,
      run_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      failure_class TEXT NOT NULL CHECK (failure_class IN ('fixture_missing','fixture_mismatch','execution_error','substitution_error')),
      reproducibility TEXT NOT NULL CHECK (reproducibility IN ('deterministic','nondeterministic','unknown')),
      retryability TEXT NOT NULL CHECK (retryability IN ('retryable','non_retryable','manual_review')),
      summary TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_validation_failures_run_id ON ${VALIDATION_FAILURE_TABLE} (run_id);
    CREATE INDEX IF NOT EXISTS idx_validation_failures_candidate_id ON ${VALIDATION_FAILURE_TABLE} (candidate_id);
    CREATE INDEX IF NOT EXISTS idx_validation_failures_failure_class ON ${VALIDATION_FAILURE_TABLE} (failure_class);
  `;

  db.exec(migration);
}

export function ensurePolicySchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS risk_classifications (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      decision_period_id TEXT NOT NULL,
      risk_band TEXT NOT NULL CHECK (risk_band IN ('low','medium','high')),
      rationale_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(candidate_id, decision_period_id)
    );

    CREATE INDEX IF NOT EXISTS idx_risk_classifications_candidate ON risk_classifications (candidate_id);

    CREATE TABLE IF NOT EXISTS policy_decisions (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      risk_band TEXT NOT NULL CHECK (risk_band IN ('low','medium','high')),
      decision TEXT NOT NULL CHECK (decision IN ('auto_approved','operator_review','blocked')),
      policy_version TEXT NOT NULL,
      rationale_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_policy_decisions_candidate ON policy_decisions (candidate_id);
  `;

  db.exec(migration);
}

export function ensureAuditSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${AUDIT_EVENTS_TABLE} (
      id TEXT PRIMARY KEY,
      event_type TEXT NULL,
      actor TEXT NOT NULL,
      occurred_at TEXT NULL,
      policy_id TEXT NULL,
      candidate_id TEXT NULL,
      request_id TEXT NULL,
      approver_action_id TEXT NULL,
      input_artifacts_json TEXT NULL,
      metadata_json TEXT NULL,
      environment TEXT NULL,
      status TEXT NULL,
      action_sequence TEXT NULL,
      created_at TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_candidate ON ${AUDIT_EVENTS_TABLE} (candidate_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_policy ON ${AUDIT_EVENTS_TABLE} (policy_id);
  `;

  db.exec(migration);
}

export function ensureIncidentSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${INCIDENT_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id TEXT NOT NULL UNIQUE,
      workflow_id TEXT NOT NULL,
      error_context TEXT NOT NULL,
      payload TEXT NOT NULL,
      run_snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${REPAIR_REQUEST_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      incident_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES ${INCIDENT_TABLE}(incident_id)
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_workflow ON ${INCIDENT_TABLE} (workflow_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_incident_id ON ${INCIDENT_TABLE} (incident_id);
    CREATE INDEX IF NOT EXISTS idx_repair_requests_incident_id ON ${REPAIR_REQUEST_TABLE} (incident_id);
  `;

  db.exec(migration);
}

export function ensureRepairEvidenceSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${REPAIR_EVIDENCE_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evidence_id TEXT NOT NULL UNIQUE,
      incident_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      evidence_payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES ${INCIDENT_TABLE}(incident_id),
      FOREIGN KEY (candidate_id) REFERENCES ${CANDIDATE_TABLE}(candidate_id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_evidence_incident_id ON ${REPAIR_EVIDENCE_TABLE} (incident_id);
    CREATE INDEX IF NOT EXISTS idx_repair_evidence_candidate_id ON ${REPAIR_EVIDENCE_TABLE} (candidate_id);
  `;

  db.exec(migration);
}

export function ensureRecoveryOutcomeSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${RECOVERY_OUTCOME_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outcome_id TEXT NOT NULL UNIQUE,
      incident_id TEXT NOT NULL,
      candidate_id TEXT NULL,
      recovery_type TEXT NOT NULL CHECK (recovery_type IN ('manual','automated')),
      summary TEXT NOT NULL,
      fixture_snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES ${INCIDENT_TABLE}(incident_id),
      FOREIGN KEY (candidate_id) REFERENCES ${CANDIDATE_TABLE}(candidate_id)
    );

    CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_incident_id ON ${RECOVERY_OUTCOME_TABLE} (incident_id);
    CREATE INDEX IF NOT EXISTS idx_recovery_outcomes_outcome_id ON ${RECOVERY_OUTCOME_TABLE} (outcome_id);
  `;

  db.exec(migration);
}

export function ensureCredentialSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${CREDENTIAL_BINDINGS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      environment TEXT NOT NULL CHECK (environment IN ('test','production')),
      credential_key TEXT NOT NULL,
      reference TEXT NOT NULL,
      rollback_reference TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(environment, credential_key)
    );

    CREATE INDEX IF NOT EXISTS idx_credential_bindings_env ON ${CREDENTIAL_BINDINGS_TABLE} (environment);
    CREATE INDEX IF NOT EXISTS idx_credential_bindings_key ON ${CREDENTIAL_BINDINGS_TABLE} (credential_key);
  `;

  db.exec(migration);
}

export function ensureSetupSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${SETUP_RECORDS_TABLE} (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      environment TEXT NOT NULL CHECK (environment IN ('test','production')),
      actor TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success','failed','manual_required')),
      action_sequence TEXT NOT NULL,
      fixture_seeded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_setup_records_candidate ON ${SETUP_RECORDS_TABLE} (candidate_id);
  `;

  db.exec(migration);
}

export function ensureRotationSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${ROTATION_EVENTS_TABLE} (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      from_environment TEXT NOT NULL CHECK (from_environment IN ('test','production')),
      to_environment TEXT NOT NULL CHECK (to_environment IN ('test','production')),
      credential_key TEXT NOT NULL,
      previous_reference TEXT NOT NULL,
      new_reference TEXT NOT NULL,
      rollback_reference TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rotation_events_candidate ON ${ROTATION_EVENTS_TABLE} (candidate_id);
  `;

  db.exec(migration);
}

export function ensureCandidateLifecycleSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS ${TRANSITION_TABLE} (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      from_state TEXT NULL CHECK (from_state IN ('pending','testing','approved','deployed','rolled_back')),
      to_state TEXT NOT NULL CHECK (to_state IN ('pending','testing','approved','deployed','rolled_back')),
      actor TEXT NOT NULL,
      reason TEXT NOT NULL,
      policy_rule_id TEXT NULL,
      policy_result TEXT NOT NULL CHECK (policy_result IN ('allow','deny')),
      evidence_refs TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(candidate_id) REFERENCES ${CANDIDATE_TABLE}(id)
    );

    CREATE INDEX IF NOT EXISTS idx_candidate_state_candidate ON ${TRANSITION_TABLE} (candidate_id);
    CREATE INDEX IF NOT EXISTS idx_candidate_state_created ON ${TRANSITION_TABLE} (created_at);

    CREATE TABLE IF NOT EXISTS ${DEPLOYMENT_ATTEMPT_TABLE} (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('deploy','rollback')),
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(candidate_id) REFERENCES ${CANDIDATE_TABLE}(id)
    );

    CREATE INDEX IF NOT EXISTS idx_deployment_attempt_candidate ON ${DEPLOYMENT_ATTEMPT_TABLE} (candidate_id);
    CREATE INDEX IF NOT EXISTS idx_deployment_attempt_created ON ${DEPLOYMENT_ATTEMPT_TABLE} (created_at);
  `;

  db.exec(migration);
}

export function ensureKnowledgeSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS patterns (
      pattern_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      integration TEXT NOT NULL,
      tags TEXT NOT NULL,
      workflow_identifiers TEXT NOT NULL,
      context_json TEXT NOT NULL,
      success_count INTEGER NOT NULL,
      last_success_at TEXT NOT NULL,
      quality_score REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source_request_id TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patterns_integration ON patterns (integration);
    CREATE INDEX IF NOT EXISTS idx_patterns_tags ON patterns (tags);

    CREATE TABLE IF NOT EXISTS pattern_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      pattern_id TEXT NOT NULL,
      applied_by TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('intake','generation')),
      notes TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pattern_applications_request ON pattern_applications (request_id);
    CREATE INDEX IF NOT EXISTS idx_pattern_applications_pattern ON pattern_applications (pattern_id);

    CREATE TABLE IF NOT EXISTS incident_reviews (
      review_id TEXT PRIMARY KEY,
      submitted_by TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fixture_sets (
      fixture_id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      inputs TEXT NOT NULL,
      expected TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fixture_sets_review ON fixture_sets (review_id);

    CREATE TABLE IF NOT EXISTS quality_hints (
      hint_id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      scope TEXT NOT NULL CHECK (scope IN ('integration','pattern')),
      target TEXT NOT NULL,
      score_delta REAL NOT NULL,
      rationale TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quality_hints_target ON quality_hints (target);
  `;

  db.exec(migration);
}

export function ensureRalphLoopSchema(db: Database.Database): void {
  const migration = `
    CREATE TABLE IF NOT EXISTS workflow_registry (
      workflowId TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      contractPath TEXT NOT NULL,
      contractVersion TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_registry_slug ON workflow_registry (slug);

    CREATE TABLE IF NOT EXISTS ralph_loops (
      loopId TEXT PRIMARY KEY,
      workflowSlug TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('IDLE', 'INITIALISING', 'ITERATING', 'PASS', 'EXHAUSTED', 'ABORTED', 'TIMEOUT')),
      currentIteration INTEGER NOT NULL DEFAULT 0,
      maxIterations INTEGER NOT NULL DEFAULT 5,
      startedAt TEXT NOT NULL,
      lastActionAt TEXT NOT NULL,
      completedAt TEXT NULL,
      dashboardToken TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ralph_loops_workflow ON ralph_loops (workflowSlug);
    CREATE INDEX IF NOT EXISTS idx_ralph_loops_status ON ralph_loops (status);

    CREATE TABLE IF NOT EXISTS ralph_loop_signals (
      signalId TEXT PRIMARY KEY,
      loopId TEXT NOT NULL,
      signalType TEXT NOT NULL CHECK (signalType IN ('abort', 'pause', 'resume')),
      triggeredBy TEXT NOT NULL,
      triggeredAt TEXT NOT NULL,
      FOREIGN KEY (loopId) REFERENCES ralph_loops(loopId)
    );

    CREATE INDEX IF NOT EXISTS idx_ralph_loop_signals_loop ON ralph_loop_signals (loopId);
  `;

  db.exec(migration);
}

export function ensureCoreSchema(db: Database.Database): void {
  ensureIntakeSchema(db);
  ensureCandidateSchema(db);
  ensureValidationSchema(db);
  ensurePolicySchema(db);
  ensureAuditSchema(db);
  ensureIncidentSchema(db);
  ensureRepairEvidenceSchema(db);
  ensureRecoveryOutcomeSchema(db);
  ensureCredentialSchema(db);
  ensureSetupSchema(db);
  ensureRotationSchema(db);
  ensureCandidateLifecycleSchema(db);
  ensureKnowledgeSchema(db);
  ensureRalphLoopSchema(db);
}
