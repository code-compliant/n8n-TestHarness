import { CandidateRecord } from '../domain/models/candidate';
import {
  IncidentInput,
  IncidentRecord,
  RecoveryOutcomeRecord,
  RepairEvidenceRecord,
  RepairRequestRecord,
  RecoveryType,
} from '../domain/models/incident';
import {
  createDeterministicCandidateId,
  createDeterministicEvidenceId,
  createDeterministicIncidentId,
  createDeterministicOutcomeId,
  createDeterministicRepairRequestId,
  normalizeIncidentPayload,
} from '../shared/schemas/incident-schema';
import { SQLiteCandidateRepository } from '../infra/persistence/sqlite/repositories/candidate-repository';
import { SQLiteIncidentRepository } from '../infra/persistence/sqlite/repositories/incident-repository';
import { SQLiteRecoveryOutcomeRepository } from '../infra/persistence/sqlite/repositories/recovery-outcome-repository';
import { SQLiteRepairEvidenceRepository } from '../infra/persistence/sqlite/repositories/repair-evidence-repository';

export interface CaptureIncidentOutput {
  incident: IncidentRecord;
  repairRequest: RepairRequestRecord;
}

export interface RepairInitiationOutput {
  candidate: CandidateRecord;
  evidence: RepairEvidenceRecord;
}

export interface RecoveryOutcomeInput {
  incidentId: string;
  candidateId?: string | null;
  recoveryType: RecoveryType;
  summary: string;
  fixtureSnapshot?: unknown;
}

export class IncidentService {
  constructor(
    private readonly incidentRepository: SQLiteIncidentRepository,
    private readonly candidateRepository: SQLiteCandidateRepository,
    private readonly evidenceRepository: SQLiteRepairEvidenceRepository,
    private readonly outcomeRepository: SQLiteRecoveryOutcomeRepository,
  ) {}

  captureIncident(input: IncidentInput): CaptureIncidentOutput {
    const normalized = normalizeIncidentPayload(input);
    const incidentId = createDeterministicIncidentId(normalized);
    const repairRequestId = createDeterministicRepairRequestId(incidentId);
    const createdAt = new Date().toISOString();

    const incident = this.incidentRepository.saveIncident({
      incidentId,
      workflowId: normalized.workflowId,
      errorContext: JSON.stringify(normalized.errorContext ?? null),
      payload: JSON.stringify(normalized.payload ?? null),
      runSnapshot: JSON.stringify(normalized.runSnapshot ?? null),
      createdAt,
    });

    const repairRequest = this.incidentRepository.saveRepairRequest({
      requestId: repairRequestId,
      incidentId: incident.incident_id,
      summary: JSON.stringify({
        incident_id: incident.incident_id,
        workflow_id: incident.workflow_id,
        occurred_at: normalized.occurredAt,
        next_action: 'generate_repair_candidate',
      }),
      createdAt,
    });

    return { incident, repairRequest };
  }

  initiateRepairFromIncident(incidentId: string): RepairInitiationOutput {
    const candidateId = createDeterministicCandidateId(incidentId);
    const evidenceId = createDeterministicEvidenceId(candidateId, incidentId);
    const createdAt = new Date().toISOString();

    const incidentRecord = this.incidentRepository.findIncidentById(incidentId);
    if (!incidentRecord) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const candidate = this.candidateRepository.saveCandidate({
      candidateId,
      workflowId: incidentRecord.workflow_id,
      candidateType: 'repair',
      status: 'pending_validation',
      sourceType: 'incident',
      sourceId: incidentRecord.incident_id,
      createdAt,
    });

    const evidence = this.evidenceRepository.saveEvidence({
      evidenceId,
      incidentId: incidentRecord.incident_id,
      candidateId: candidate.candidate_id,
      evidencePayload: JSON.stringify({
        incident_id: incidentRecord.incident_id,
        candidate_id: candidate.candidate_id,
        workflow_id: candidate.workflow_id,
        validation_route: 'standard',
      }),
      createdAt,
    });

    return { candidate, evidence };
  }

  recordRecoveryOutcome(input: RecoveryOutcomeInput): RecoveryOutcomeRecord {
    const outcomeId = createDeterministicOutcomeId(input.incidentId, input.recoveryType);
    const createdAt = new Date().toISOString();

    return this.outcomeRepository.saveOutcome({
      outcomeId,
      incidentId: input.incidentId,
      candidateId: input.candidateId ?? null,
      recoveryType: input.recoveryType,
      summary: input.summary,
      fixtureSnapshot: JSON.stringify(input.fixtureSnapshot ?? {}),
      createdAt,
    });
  }
}
