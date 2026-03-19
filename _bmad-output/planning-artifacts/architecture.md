---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
workflowType: 'architecture'
lastStep: 8
status: complete
completedAt: 2026-03-19
inputDocuments: []

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._


## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- 54 FRs identified in PRD (`prd.md`).
- Major categories: Intake/context capture, workflow generation/evolution, test + validation, policy/risk gates, recovery/repair, credential lifecycle, governance, and quality feedback.

**Non-Functional Requirements:**
- Security: no secret material in repo artifacts; credentials via env references only; auditable actor/environment-boundary events.
- Reliability: deterministic fixtures and safe rollback behavior on failed validation/setup/deploy.
- Integration: bounded retry and explicit failure handling for GitHub, n8n, Telegram, OpenClaw.
- Performance: end-to-end validation cycle ≤45 minutes; incident-repair evidence ≤5 minutes.

### Scale & Complexity

- Primary technical domain: automation control plane + GitHub-native workflow operations.
- Estimated architectural component count: 8-10 bounded components (control plane, orchestration adapters, candidate lifecycle, test runner, policy engine, audit/trace, credential/env management, repair pipeline).
- Complexity level: **medium** (low UI volume, high integration and operational consistency requirements).

### Technical Constraints & Dependencies

- GitHub is required as source of truth for artifacts and PR evidence.
- No long-lived custom control server expected for orchestration baseline.
- Deterministic candidate lifecycle and immutable audit evidence per transition are required.
- Must support reversible substitutions for environment bindings and test execution paths.
- Candidate state machine must be explicit and auditable (pending → testing → approved → deploy).

### Cross-Cutting Concerns

- Traceability from requirement → decision → artifact.
- Security posture around credential values and environment boundaries.
- Operational safety via policy gates and approval rails.
- Idempotent setup/teardown behavior for credentials and fixtures.
- Replayable incident/recovery contracts for repair workflows.

### Party-Mode Augmented Findings

- Treat interaction states as architecture artifacts even without UI files (Telegram intake, alerting, PR-repair handoff, approvals).
- Enforce explicit module separation between control-plane, execution, evidence, and policy domains.
- Introduce explicit run contracts (candidate, test-run, audit, rollback) and immutable IDs for reproducibility.
- Build credential/env operations as a dedicated domain service with strict allow-listing and policy checks.
- Add a failure schema contract for deterministic repair path replay.

## Starter Template Evaluation

### Primary Technology Domain

Backend/API + CLI-centric automation platform (TypeScript/Node.js) executed through GitHub Actions workflows.

### Starter Options Considered

#### Option A: `oclif` CLI starter
- Command-first scaffolding for a control-plane tool.
- Strong alignment with requested command surface (generate, test, repair, promote, rollback).
- Supports explicit domain boundary between CLI entrypoints and internal services.

#### Option B: GitHub Action TypeScript template
- Strong action-module bootstrap for action internals.
- Useful for action-specific implementation pieces, less suitable as full project foundation.

### Selected Starter: `oclif` control-plane scaffold

**Rationale**
- Fits workflow-command decomposition directly to PRD FR groups.
- Makes command lifecycle boundaries explicit for traceability and auditability.
- Keeps architecture evolution controlled by defining policy, execution, and evidence services as separate domains.

**Initialization command**

```bash
npx oclif generate n8n-testharness-cli --yes
```

**Architectural decisions contributed by starter
choice**
- Command-first project structure.
- Explicit command boundaries and argument parsing conventions.
- Easier mapping from product FRs to operational commands.

### Party-Mode Refinements Applied

- CLI is the command surface only; execution policy/risk/audit logic remains separate domains.
- Test/repair/deploy paths must flow through explicit service interfaces and approval-aware gates.
- Every command should emit structured run/audit records:
  - command intent
  - input snapshot reference
  - policy decision + actor
  - artifact IDs and outputs
  - deterministic exit status
- Interaction-state outputs are first-class contract points (Queued/Running/Pass/Block/Approved/Deployed).

### Follow-on Architecture Note

Use GitHub Action template patterns for action implementation modules where execution runners are action-specific, while `oclif` remains the control-plane orchestration entrypoint.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data store selection for candidate/test/audit state persistence.
- Audit and contract boundaries for command execution to support deterministic replay.
- Authentication and credential-handling model for integration tokens and runtime secrets.

**Important Decisions (Shape Architecture):**
- Database access patterns and migration strategy for long-lived artifact state.
- API/communication envelope and idempotency contract across CLI commands and runners.
- CI/CD boundary conditions for policy gates and artifact evidence collection.

**Deferred Decisions (Post-MVP):**
- Advanced scaling/caching architecture for high-volume parallel test execution.
- Dedicated frontend observability dashboard for run state visualization.
- Optional SSO/identity service integration for externally exposed control APIs.

### Data Architecture

- **Database choice:** SQLite selected for Step 4 critical decision.
- **Version context:** SQLite's current stable line is in the 3.52.x stream; implementation will pin to the repo-approved minor and document upgrade policy.
- **Approach:** Start with SQLite tables for canonical state (`runs`, `candidates`, `commands`, `artifacts`, `policy_decisions`, `audit_events`) with append-only audit rows and immutable transition IDs.
- **Validation strategy:** Strict schema constraints, startup schema checks, and state-machine validation before writes.
- **Migration approach:** Forward-only migration scripts executed via CLI command; migration history stored in versioned control.
- **Caching strategy:** No cross-process cache in MVP; short-lived in-memory read caching only for non-authoritative lookups.

### Authentication & Security

- **Authentication method:** GitHub-native trust model for orchestrator operations, with runtime tokens (no embedded credentials).
- **Authorization patterns:** Command-level role checks (`operator`, `approver`, `runner`) with policy gates before state transitions.
- **Security middleware:** Input schema validation, command guard middleware, and immutable audit emission on sensitive operations.
- **Encryption approach:** No secrets written to repository/state; secrets resolved from environment or secure secret managers.
- **API security strategy:** Signed input verification for callbacks and replay-resistant operation IDs.

### API & Communication Patterns

- **API design pattern:** Command contracts are explicit (`intent`, `payload`, `actor`, `result`, `artifacts`, `audit_ref`) with structured command IDs.
- **Documentation approach:** Operation contracts recorded in architecture and generated command docs.
- **Error handling standards:** Standard machine-readable terminal states (`Queued`, `Running`, `Blocked`, `Pass`, `Failed`, `Recovered`, `Deployed`) with deterministic remediation hints.
- **Rate limiting strategy:** Outbound integration throttling with bounded retry/backoff and jitter.
- **Communication between services:** Decoupled interface boundaries between CLI and execution modules; no shared mutable state outside contracts.

### Frontend Architecture (if applicable)

- No dedicated frontend in baseline. Interaction-state and approval visibility are provided through CLI output and artifact-based handoffs to Telegram/PR workflows.
- UI decisions are deferred until a separate product UI is required.

### Infrastructure & Deployment

- **Hosting strategy:** No long-lived control plane host in MVP; command execution via GitHub Actions/runner contexts.
- **CI/CD pipeline approach:** Deterministic sequence (`lint` → `unit` → policy gates → contract checks → evidence upload).
- **Environment configuration:** Environment boundary maps in versioned templates, with secret references resolved at runtime.
- **Monitoring and logging:** Structured logs plus SQLite-stored evidence and optional external log export.
- **Scaling strategy:** Controlled concurrency with serialized writers and SQLite WAL-enabled checkpoints; scale runner fan-out by job partitioning.

### Decision Impact Analysis

**Implementation Sequence:**
1. Build SQLite schema + migration runner and lock state-machine contract model.
2. Implement CLI command contracts and enforce actor-aware authorization.
3. Wire policy gates, audit emission, and deterministic state transitions.
4. Add runner interfaces for GitHub/n8n/OpenClaw actions with retry policies.
5. Add CI gates that validate state transitions and evidence integrity before promotion.

**Cross-Component Dependencies:**
- SQLite choice drives transaction boundaries, locking strategy, and state-machine implementation.
- Security decisions determine how every runner and command layer accesses credentials and handles artifacts.
- API contract decisions shape starter command boundaries and downstream workflow integration.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 6
- Naming and boundary convention mismatches between agents.
- Folder/command/test structure inconsistencies.
- API/CLI payload format divergence.
- Event naming/state transition inconsistencies.
- Retry/error semantics divergence.
- Test and artifact naming drift.

### Naming Patterns

**Database Naming Conventions**
- Tables use lower_snake_case plural nouns: `candidates`, `runs`, `artifacts`, `policy_decisions`, `audit_events`, `commands`.
- Primary keys use `id`.
- Foreign keys use `<entity>_id`.
- Indexes use `idx_<table>_<column>`.

**Code Naming Conventions**
- Internal TypeScript code uses `camelCase` (`resolveCandidateState`, `candidateId`, `nextAction`).
- Command names use kebab-case with domain prefix (`candidate:test`, `candidate:repair`, `candidate:promote`, `candidate:rollback`).
- Constants and state tokens are uppercase enums only when shared externally.
- Shared identifiers are deterministic with fixed prefixes (`run_`, `candidate_`, `artifact_`, `event_`) and ULID/UUID payloads.

**Format-Scope Rules**
- Persisted/shared contracts use `snake_case`.
- Internal domain objects may use `camelCase`.
- All date fields are ISO 8601 UTC.

### Structure Patterns

**Project Organization**
- `src/commands/` for `oclif` command surface.
- `src/domain/` for core state machine and business entities.
- `src/services/` for orchestration, policy, credential, and environment services.
- `src/adapters/` for GitHub, n8n, Telegram, OpenClaw integrations.
- `src/infra/` for persistence/migrations/config.
- `src/shared/` for reusable utilities and cross-cutting schemas.
- `src/types/` for all shared contract types and enums.
- `test/unit`, `test/integration`, `test/e2e` for test layers.
- `test/fixtures` and `test/golden` for stable test data.

**File and directory naming**
- Lowercase names, hyphen separation for file names unless framework requires otherwise.
- Avoid vague suffixes (`util`, `helper`) without context.

### Format Patterns

**API/Command Response Format**
All core responses use this envelope:

```json
{
  "status": "pass|fail|blocked|retryable",
  "state": "pending|running|blocked|approved|deployed|failed|recovered",
  "correlation_id": "run_...",
  "request_id": "req_...",
  "actor": "operator|approver|runner",
  "command": "candidate:test",
  "schema_version": "1",
  "timestamp": "2026-03-19T00:00:00Z",
  "artifact_refs": ["artifact_..."],
  "next_action": "review|repair|deploy|retry|abort"
}
```

**Error Format**
- Required fields: `status`, `code`, `message`, `request_id`, `timestamp`, `actor`, `correlation_id`.
- Required optional context for actionable errors: `retryable`, `retry_after_seconds`, `resolution`, `recovery_hint`.
- `error.code` must be stable machine-readable enum values.

### Communication Patterns

**Event Naming and Payload**
- Event names: `domain.action.result` (lowercase, dotted, snake_case), e.g., `candidate.state_changed`.
- Event payload includes: `event_id`, `occurred_at`, `actor`, `entity_id`, `from_state`, `to_state`, `context`, `policy_rule_id`, `policy_result`.
- State transitions are immutable; write every transition as a persisted audit record.

**State Management**
- No direct in-place state mutation outside transition handlers.
- One transition = one audit event + one deterministic resulting state.

### Process Patterns

**Error Handling**
- Never swallow errors at service boundaries.
- Every failure maps to explicit state transition and retry policy.
- Non-idempotent failures are never retried automatically.

**Retry Policy**
- Retry only idempotent operations with bounded attempts.
- Use exponential backoff + jitter.
- Include `retry_after_seconds` in terminal-facing error contracts.

**Loading and Progress**
- No generic progress text; use explicit state tokens and artifact references.

### Enforcement Guidelines

All AI Agents MUST:
- Use the shared contract types in `src/types` for every command I/O.
- Persist every state transition with `policy_rule_id`, `actor`, `policy_result`, `artifact_ref`, and `justification`.
- Keep contract fields and naming aligned with this section; report any required deviation in architecture notes before implementation.

### Pattern Examples

**Good Examples**
- Command naming: `candidate:test`.
- Response includes required envelope fields and `schema_version`.
- Event naming: `candidate.state_changed`.

**Anti-Patterns**
- Mixing `candidateId` and `candidate_id` in persisted/shared payloads.
- Missing transition audit entries for state updates.
- Inconsistent key casing across DB, contracts, and CLI output.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
n8n-testharness-cli/
├── .editorconfig
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierrc
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── smoke-test.yml
│   └── CODEOWNERS
├── docs/
│   ├── architecture/
│   │   ├── adr/
│   │   ├── decisions/
│   │   ├── governance/
│   │   └── runbooks/
│   ├── api/
│   │   └── contracts/
│   └── ops/
│       ├── incident-repair.md
│       └── onboarding.md
├── scripts/
│   ├── migrate.ts
│   ├── seed.ts
│   ├── validate-contracts.ts
│   └── validate-schema.ts
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── candidate/
│   │   │   ├── generate.ts
│   │   │   ├── test.ts
│   │   │   ├── repair.ts
│   │   │   ├── promote.ts
│   │   │   ├── rollback.ts
│   │   │   └── status.ts
│   │   ├── policy/
│   │   │   ├── evaluate.ts
│   │   │   └── audit.ts
│   │   ├── environment/
│   │   │   ├── bind.ts
│   │   │   └── unbind.ts
│   │   ├── system/
│   │   │   ├── init.ts
│   │   │   ├── migrate.ts
│   │   │   └── health.ts
│   │   ├── health.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── contract-validation.ts
│   │       ├── errors.ts
│   │       └── correlation.ts
│   ├── contracts/
│   │   ├── v1/
│   │   │   ├── command.ts
│   │   │   ├── event.ts
│   │   │   └── result.ts
│   │   └── index.ts
│   ├── domain/
│   │   ├── entities/
│   │   ├── models/
│   │   ├── state-machine/
│   │   │   ├── candidate-state.ts
│   │   │   └── transitions.ts
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── rules/
│   │   └── ports/
│   │       ├── repositories.ts
│   │       ├── adapters.ts
│   │       └── clock.ts
│   ├── services/
│   │   ├── candidate-service.ts
│   │   ├── run-service.ts
│   │   ├── policy-service.ts
│   │   ├── evidence-service.ts
│   │   ├── audit-service.ts
│   │   ├── credential-service.ts
│   │   └── lifecycle-service.ts
│   ├── adapters/
│   │   ├── github/
│   │   ├── n8n/
│   │   ├── telegram/
│   │   ├── openclaw/
│   │   └── action-runner/
│   ├── infra/
│   │   ├── persistence/
│   │   │   ├── sqlite/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 0001_initial_schema.sql
│   │   │   │   │   └── 0002_policy_tables.sql
│   │   │   │   └── schema.ts
│   │   │   └── sqlite-client.ts
│   │   ├── logging/
│   │   └── config.ts
│   ├── shared/
│   │   ├── contracts/
│   │   ├── errors/
│   │   ├── schemas/
│   │   ├── telemetry/
│   │   └── util/
│   └── types/
│       ├── command.ts
│       ├── event.ts
│       ├── run.ts
│       └── policy.ts
├── data/
│   ├── fixtures/
│   │   └── policy/
│   ├── golden/
│   └── sqlite/
│       ├── test.db
│       └── test.db-journal
├── test/
│   ├── contracts/
│   ├── unit/
│   │   ├── domain/
│   │   ├── services/
│   │   └── commands/
│   ├── integration/
│   │   ├── adapters/
│   │   └── persistence/
│   ├── e2e/
│   │   ├── candidate-flow.spec.ts
│   │   └── repair.spec.ts
│   └── support/
│       ├── fixtures/
│       └── mocks/
├── package.json
├── tsconfig.json
└── README.md
```

### Architectural Boundaries

#### API Boundaries
- CLI commands in `src/commands` accept/emit only shared contracts from `src/contracts` and `src/types`.
- Service orchestration in `src/services` is responsible for all state transitions and policy checks.
- Persistence is isolated to `src/infra/persistence` with repository implementations; `src/domain/repositories` and `src/domain/ports` define contracts.
- External system integrations are confined to `src/adapters`; no adapter-specific details are referenced directly by commands.
- Governance/contract changes require versioned updates in `src/contracts/v1` and migration alignment.

#### Component Boundaries
- Command modules are split by domain (`candidate`, `policy`, `environment`, `system`) with shared validation/auth guards in `src/commands/middleware`.
- Domain entities and state-machine transitions remain framework-agnostic inside `src/domain`.
- Service layer contains orchestration only, and is forbidden from directly importing adapter internals.
- Evidence and audit creation is centralized in `src/services/evidence-service.ts` and `src/services/audit-service.ts`.
- Shared abstractions live in `src/shared`; no duplicate business logic belongs there.

#### Service Boundaries
- `candidate-service` owns lifecycle orchestration and transition eligibility.
- `run-service` owns deterministic execution flow and result status mapping.
- `policy-service` owns rule evaluation, actor-based checks, and policy decision persistence.
- `lifecycle-service` owns repair and rollback planning/execution coordination.
- `credential-service` owns secret/reference validation and boundary enforcement.

#### Data Boundaries
- SQLite is the authoritative write store for core state (`runs`, `candidates`, `artifacts`, `policy_decisions`, `audit_events`, `commands`).
- Read models used by operations come from repository interfaces in `src/domain/ports`.
- Non-authoritative fixtures exist only in `test/` and `test/support/fixtures`.
- Contract and migration verification are mandatory checkpoints before writes in `scripts/validate-*`.

### Requirements to Structure Mapping

**Feature/Epic Mapping**
- Intake, candidate generation, and deterministic setup
  - `src/commands/candidate/generate.ts`
  - `src/domain/entities/candidate.ts`
  - `src/services/candidate-service.ts`
  - `test/unit/commands/candidate-generate.spec.ts`
- Policy and risk gating
  - `src/commands/policy/evaluate.ts`
  - `src/commands/policy/audit.ts`
  - `src/domain/rules/*`
  - `src/services/policy-service.ts`
  - `test/integration/policy/*`
- Test execution, contract validation, and status transitions
  - `src/contracts/*`
  - `src/commands/candidate/test.ts`
  - `src/commands/middleware/contract-validation.ts`
  - `src/services/run-service.ts`
  - `test/contracts/*`
- Repair, rollback, and incident recovery
  - `src/commands/candidate/repair.ts`
  - `src/commands/candidate/rollback.ts`
  - `src/services/lifecycle-service.ts`
  - `test/e2e/repair.spec.ts`
  - `test/contracts/*`
- Credentials and environment binding
  - `src/commands/environment/bind.ts`
  - `src/commands/environment/unbind.ts`
  - `src/services/credential-service.ts`
  - `test/unit/services/credential-service.spec.ts`
  - `docs/ops/onboarding.md`
- Audit, governance, and evidence
  - `src/services/audit-service.ts`
  - `src/services/evidence-service.ts`
  - `src/domain/entities/audit_event.ts`
  - `src/infra/persistence/sqlite/migrations/*`
  - `docs/architecture/governance/*`

**Cross-Cutting Concerns**
- Security and secret boundaries:
  - `src/services/credential-service.ts`
  - `src/commands/middleware/auth.ts`
  - `docs/ops/onboarding.md`
- Determinism and replay:
  - `src/domain/state-machine/*`
  - `src/infra/persistence/sqlite`
  - `scripts/validate-contracts.ts`
- Governance consistency:
  - `docs/architecture/governance/`
  - `data/fixtures/policy/`
  - `test/contracts/`

### Integration Points

#### Internal Communication
- Commands pass validated intent through middleware and typed contracts to services.
- Services perform transition requests through domain services and repository ports.
- All transitions emit an immutable audit event and artifact reference in a single flow.

#### External Integrations
- GitHub operations: `src/adapters/github`
- n8n operations: `src/adapters/n8n`
- Telegram handoffs: `src/adapters/telegram`
- OpenClaw execution: `src/adapters/openclaw`

#### Data Flow
Request → command middleware (`validation/auth/correlation`) → contract gate → policy/state evaluation (`services`) → repository update (`ports + sqlite`) → adapter execution (if allowed) → audit/evidence append → result envelope + run artifact refs.

### File Organization Patterns

#### Configuration Files
- Project/CI/config files remain at repository root (`package.json`, `tsconfig.json`, `.github/workflows`).
- Runtime config is versioned in `.env.example` and loaded through `src/infra/config.ts`.

#### Source Organization
- Domain logic is split into: `domain`, `services`, `adapters`, `contracts`, `shared`, `types`.
- Operational workflows and maintenance live in `commands/system` and `scripts`.

#### Test Organization
- Unit/integration/e2e are separated by intent and dependency depth.
- `test/contracts` validates envelopes and backward compatibility.
- `data/fixtures/policy` powers deterministic policy/repair replay testing.
- `test/support` contains shared adapters, mocks, and helpers.

#### Asset Organization
- No UI assets expected in baseline MVP.
- Runtime artifacts and run docs are organized under `docs/` and `data/golden`.

### Development Workflow Integration

#### Development Server Structure
- Local command execution via CLI entrypoints and middleware-driven local dev validation.
- Contract-first iteration with `test/contracts` as a hard stop before service changes.

#### Build Process Structure
- Static checks + domain/service tests + integration and contract gates before release.
- Migration checks in `scripts/migrate.ts` and `scripts/validate-schema.ts`.

#### Deployment Structure
- Packaged CLI artifacts produced by GitHub Actions release pipeline.
- No long-lived control-plane host in MVP; execution remains runner-based.

### Requirement-to-Structure Traceability
- PRD FRs for candidate lifecycle and reliability map primarily to `src/commands/candidate/*`, `src/domain/state-machine/*`, and `test/e2e/candidate-flow.spec.ts`.
- Policy/gating FRs map to `src/commands/policy/*`, `src/services/policy-service.ts`, and `test/contracts`.
- Incident repair FRs map to `src/commands/candidate/repair.ts`, `src/services/lifecycle-service.ts`, `data/fixtures/policy/*`.

### Contract Validation Gate
- Every command route must execute through `commands/middleware/contract-validation.ts` before any state transition.
- Only `v1` contract definitions in `src/contracts/v1` may be used by agents for command I/O and event payloads.
- Any contract shape change requires migration notes and a `docs/architecture/governance` update.

### Maintenance and Evolution Boundaries
- Domain logic changes are introduced in `src/domain/*` with compatibility layers in `src/contracts`.
- Infra persistence upgrades remain in `src/infra/persistence/sqlite/migrations` and `scripts/validate-schema.ts`.
- Adapter changes are contained to `src/adapters/*` and covered by `test/integration/adapters/*`.

## Architecture Validation Results

### Validation Summary
- Coherence: PASS
- Coverage: PASS
- Readiness: PASS

### Coherence Validation ✅ / ⚠️ / ❌

**Decision Compatibility:**  
Core technical choices align across layers: oclif control plane, command contracts, SQLite persistence, and service/domain boundaries are compatible and non-conflicting.

**Pattern Consistency:**  
Naming, format, and state-transition patterns are consistent with Step 5 rules and are mapped to enforceable locations in Step 6 structure.

**Structure Alignment:**  
Project structure directly supports required boundaries: commands → services → domain → adapters/infrastructure with contract and repository ports isolating dependencies.

### Requirements Coverage Validation ✅ / ⚠️ / ❌

**Epic/Feature Coverage:**  
Candidate lifecycle, policy gates, repair/rollback, credential/environment binding, and evidence/audit flows are all mapped to concrete directories and ownership points.

**Functional Requirements Coverage:**  
All FR categories from PRD context have architectural support paths and test locations.

**Non-Functional Requirements Coverage:**  
Security, reliability, auditability, rollback safety, and replayability are covered through defined boundaries, contract gates, and immutable state/audit rules.

### Implementation Readiness Validation ✅ / ⚠️ / ❌

**Decision Completeness:**  
Critical decisions and constraints are documented; unresolved ambiguity is limited to optional future scaling work.

**Structure Completeness:**  
Directory and file structure is complete for implementation, operations, tests, docs, and migration/validation support.

**Pattern Completeness:**  
Cross-agent consistency risks are constrained through enforced contracts, naming/version conventions, and explicit service/domain separation.

### Validation Matrix

| Check | Required for state mutation | Enforcement | Owner | Evidence |
|---|---|---|---|---|
| Contract compatibility | Yes | `commands/middleware` + CI contract tests | Dev + QA | `test/contracts/*`, `src/contracts/v1/*` |
| Migration history order | Yes | `scripts/validate-schema.ts`, migration runner | Architect + Dev | `src/infra/persistence/sqlite/migrations/*` |
| Schema integrity | Yes | repository boot-time checks + CI | Dev + QA | `src/infra/persistence/sqlite/schema.ts` |
| Evidence/audit hash integrity | Yes | audit/evidence services + e2e tests | QA + Analyst | `test/e2e/*`, `docs/ops/incident-repair.md` |
| Concurrency boundary (single-writer) | Yes | run-service/state-machine lock policy | Architect + Dev | `src/services/run-service.ts`, `src/domain/state-machine/*` |

### Validation Gate Outcomes (Mandatory)

- **SQLite schema + migration validation:** mandatory before stateful command completion
- **Contract compatibility validation:** mandatory before command acceptance in CI and local preflight
- **Evidence integrity validation:** mandatory for all critical transitions and policy-impacted commands
- **Stateful command preflight order:** `contract-check → migration-check → schema-check → evidence-check`
- **No stateful transition allowed without all required preflight checks passing.**

### Failure Semantics for Stateful Commands

If any required preflight check fails:

- command result: `status=fail`, `state=blocked`
- no state transition executes
- `next_action` set to one of `retry`, `abort`, `manual_review`
- `artifact_refs` must include check artifact IDs and failed check names

### Gap Analysis Results

- **Critical:** none identified
- **Important:** make write-concurrency boundary explicit (single-writer transaction strategy for shared boundary tables in SQLite-backed state transitions)
- **Minor:** add a short ADR for policy/governance fixture evolution and contract migration strategy (deferred to post-MVP if needed)

### Validation Ownership

- **Coherence Owner:** Winston (Architect)
- **Coverage Owner:** PM/Analyst peer review
- **Readiness Owner:** Amelia (Dev) + Quinn (QA)

### Architecture Completeness Checklist

- [x] Context, constraints, and cross-cutting concerns analyzed
- [x] Core decisions documented with versions
- [x] Consistency patterns defined and enforced
- [x] Complete project structure and boundaries defined
- [x] Requirements-to-structure mapping complete
- [x] Validation gates defined (`schema` + `contract` + `evidence integrity`)
- [x] Preflight ordering defined for all stateful commands

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION  
**Confidence Level:** high  
**Key Strengths:** strong control-plane boundaries, deterministic state transition model, structured evidence/audit chain, contract-first execution path  
**Areas for Future Enhancement:** explicit concurrency tuning and scaling model details for high-throughput execution bursts

### Implementation Handoff

- Enforce preflight validation gates (`contract` → `migration` → `schema` → `evidence`) before state mutation.
- Keep command layer contract-only at boundaries.
- Preserve immutable audit lineage for every transition.
- Implementation starts only when this Step 7 validation section is saved and `stepsCompleted: [1, 2, 3, 4, 5, 6, 7]` is recorded.
- Start implementation with candidate lifecycle core, then policy, then repair/rollback, then governance tooling.
