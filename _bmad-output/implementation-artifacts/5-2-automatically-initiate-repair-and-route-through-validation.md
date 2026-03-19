# Story 5.2: Automatically initiate repair and route through validation

Status: review

## Story

As an operator,
I want repair candidates auto-created from incidents and validated via standard checks,
so that response time is reduced.

## Acceptance Criteria

1. Given an incident case is generated, when repair initiation runs, then a repair candidate follows the same validation workflow as other candidates.
2. Given a repair candidate is created from an incident, when evidence is stored, then evidence artifacts are linked to the original incident.

## Tasks / Subtasks

- [x] Define candidate model and persistence schema
- [x] Create repair candidate from incident with validation status
- [x] Link repair evidence artifacts to incident
- [x] Add unit tests for repair initiation and evidence linkage

## Dev Notes

### FR coverage
- FR35, FR36

### Relevant Architecture Patterns and Constraints

- Candidate records mirror canonical candidate shape and use deterministic ids.
- Evidence linkages are persisted in SQLite with incident/candidate foreign keys.
- Repair candidates default to pending_validation status to align with standard validation paths.

### Source Tree Notes

- `src/domain/models/candidate.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `src/infra/persistence/sqlite/repositories/repair-evidence-repository.ts`
- `test/unit/services/incident-service.spec.ts`

### References

- Source: `_bmad-output/planning-artifacts/epics.md`
- Source: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Completion Notes List

- Added candidate persistence schema with repair candidate status tracking.
- Implemented incident-driven repair candidate creation and evidence linking.
- Added unit tests for repair initiation flow and evidence linkage.

### File List

- `_bmad-output/implementation-artifacts/5-2-automatically-initiate-repair-and-route-through-validation.md`
- `src/domain/models/candidate.ts`
- `src/services/incident-service.ts`
- `src/infra/persistence/sqlite/schema.ts`
- `src/infra/persistence/sqlite/repositories/candidate-repository.ts`
- `src/infra/persistence/sqlite/repositories/repair-evidence-repository.ts`
- `test/unit/services/incident-service.spec.ts`
