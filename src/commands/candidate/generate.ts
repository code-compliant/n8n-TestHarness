import { openDatabaseConnection } from '../../infra/persistence/sqlite/connection';
import { SQLiteCandidateRepository } from '../../infra/persistence/sqlite/repositories/candidate-repository';
import { CandidateService } from '../../services/candidate-service';
import { CandidateDiffPackage, CandidateJourney, CandidateWorkflow } from '../../domain/models/candidate';

export interface GenerateCandidateCommandInput {
  request_id: string;
  actor: string;
  journey: CandidateJourney;
  workflow_identifier?: string | null;
  base_workflow?: CandidateWorkflow | null;
  proposed_workflow?: CandidateWorkflow | null;
  intent_summary?: string;
}

export interface GenerateCandidateCommandResult {
  status: 'pass' | 'blocked';
  request_id: string;
  candidate_id: string;
  diff: CandidateDiffPackage;
  placeholders: Array<{ path: string; token: string }>;
  next_action: string;
}

export function handleGenerateCandidate(
  payload: GenerateCandidateCommandInput,
  options?: { dbPath?: string },
): GenerateCandidateCommandResult {
  const db = openDatabaseConnection({ dbPath: options?.dbPath });
  try {
    const repository = new SQLiteCandidateRepository(db);
    const service = new CandidateService(repository);
    const result = service.generateCandidate(payload);

    return {
      status: 'pass',
      request_id: payload.request_id,
      candidate_id: result.candidate_id,
      diff: result.diff,
      placeholders: result.placeholders,
      next_action: 'review_candidate',
    };
  } finally {
    db.close();
  }
}

export const commandManifest = {
  id: 'candidate:generate',
  description: 'Generate a workflow candidate from request context',
  minimumInputs: ['request_id', 'actor', 'journey'],
};
