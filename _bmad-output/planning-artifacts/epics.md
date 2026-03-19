---
project_name: n8n-TestHarness
status: complete
stepsCompleted:
  - step-01
  - step-02
  - step-03
  - step-04
source_artifacts:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/research/technical-n8n-mcp-servers-and-test-harnesses-research-2026-03-19.md
requirements_coverage_map: completed
epics_list: completed
---

# Requirements Inventory for Epic/Story Decomposition

## Functional Requirements (FR1–FR54 from PRD)

- FR1
- FR2
- FR3
- FR4
- FR5
- FR6
- FR7
- FR8
- FR9
- FR10
- FR11
- FR12
- FR13
- FR14
- FR15
- FR16
- FR17
- FR18
- FR19
- FR20
- FR21
- FR22
- FR23
- FR24
- FR25
- FR26
- FR27
- FR28
- FR29
- FR30
- FR31
- FR32
- FR33
- FR34
- FR35
- FR36
- FR37
- FR38
- FR39
- FR40
- FR41
- FR42
- FR43
- FR44
- FR45
- FR46
- FR47
- FR48
- FR49
- FR50
- FR51
- FR52
- FR53
- FR54

## Non-Functional Requirements (NFRs from PRD)

- NFR-Sec-1
- NFR-Sec-2
- NFR-Sec-3
- NFR-Sec-4
- NFR-Reli-1
- NFR-Reli-2
- NFR-Reli-3
- NFR-Reli-4
- NFR-Int-1
- NFR-Int-2
- NFR-Int-3
- NFR-Perf-1
- NFR-Perf-2

## Additional Requirements (Architecture + Research)

- Included architecture constraints and implementation decisions from `_bmad-output/planning-artifacts/architecture.md`.
- Included selected MCP/testing-harness research findings from `_bmad-output/planning-artifacts/research/technical-n8n-mcp-servers-and-test-harnesses-research-2026-03-19.md`.
- Storage decision included: SQLite persistence for harness data.
- No UX design document was found in planning artifacts; no UX-specific requirements were added.

## FR Coverage Map

FR1: Epic 1 - User can submit and classify workflow work requests.
FR2: Epic 1 - User can target a specific workflow for modification.
FR3: Epic 5 - User can request automated repair from incident context.
FR4: Epic 1 - System classifies request journey types.
FR5: Epic 1 - Required context is attached to each request.
FR6: Epic 1 - Request summary is produced before execution.
FR7: Epic 2 - System creates workflow candidate from request context.
FR8: Epic 2 - System regenerates upgraded workflow from existing workflow and intent.
FR9: Epic 2 - Execution-ready candidate diff is produced.
FR10: Epic 2 - Business logic placeholders are preserved in upgrades.
FR11: Epic 2 - Candidate package is created without mutating production state.
FR12: Epic 2 - Request changes map to affected workflow sections for traceability.
FR13: Epic 3 - Fixture-based validation runs for each candidate.
FR14: Epic 3 - Deterministic test pass runs in test environment.
FR15: Epic 3 - Machine-readable evidence is produced per validation run.
FR16: Epic 4 - Promotion is blocked when required checks fail.
FR17: Epic 3 - Reproducible rerun artifact is generated from candidate.
FR18: Epic 3 - Rollback candidate is generated when validation fails.
FR19: Epic 3 - Environment boundaries validated before deployment decisions.
FR20: Epic 3 - Test content artifacts are generated.
FR21: Epic 3 - Synthetic trigger/event simulation used when needed.
FR22: Epic 3 - Simulated outcomes map back to production-like intent.
FR23: Epic 3 - Test-safe substitutions are applied by contract.
FR24: Epic 4 - Candidate changes are risk-classified.
FR25: Epic 4 - Low-risk candidates auto-apply under policy gates.
FR26: Epic 4 - Medium/high-risk candidates require operator approval.
FR27: Epic 4 - Credential/test environment swaps happen through auditable deployment action.
FR28: Epic 4 - Unsafe credential/scope actions are prevented by policy.
FR29: Epic 4 - Immutable audit artifacts are created per candidate.
FR30: Epic 4 - Traceability from request to approver actions is preserved.
FR31: Epic 6 - Credentials only stored in n8n; env stores references.
FR32: Epic 6 - Test/production credential references are swapped safely.
FR33: Epic 6 - Env values for credentials remain reference/ID only.
FR34: Epic 5 - Runtime failure context is captured from production.
FR35: Epic 5 - Repair automatically initiated from incident context.
FR36: Epic 5 - Repair candidates follow same validation path.
FR37: Epic 5 - Manual recovery outcomes are distinguishable from automated repair.
FR38: Epic 5 - Repair cases are persisted for regression prevention.
FR39: Epic 6 - Missing/invalid bindings are validated before execution.
FR40: Epic 6 - Dedicated credential setup skill is triggered when missing.
FR41: Epic 6 - Setup skill uses env references/IDs to populate entries.
FR42: Epic 6 - Setup flow can seed test fixtures.
FR43: Epic 6 - Playwright fallback supported for setup when API is unavailable.
FR44: Epic 6 - Manual guided setup used after automation failure.
FR45: Epic 6 - All setup attempts and outcomes are audited.
FR46: Epic 7 - Candidate states visible in GitHub-native artifacts.
FR47: Epic 7 - Auditable change history for workflow transitions.
FR48: Epic 7 - Controlled rollback to known-good revision.
FR49: Epic 7 - Role-based deployment/approval actions.
FR50: Epic 7 - GitHub remains source of truth for artifacts and metadata.
FR51: Epic 8 - Reusable patterns and integration context are persisted.
FR52: Epic 8 - Prior patterns are suggested for new requests.
FR53: Epic 8 - Fixtures and test data are added from incident reviews.
FR54: Epic 8 - Knowledge growth improves output quality.

## Epic List

### Epic 1: Request Intake and Workflow Journey Routing
Users can submit workflow change requests and route them into the correct journey with complete context before any execution starts.
**FRs covered:** FR1, FR2, FR4, FR5, FR6
**Precondition note:** Can ship standalone for request capture and routing. Production deployment safety is outside this epic.

### Epic 2: Candidate Generation and Change Packaging
Users can generate upgrade or repair candidates, create diffs, and package them for review without touching production.
**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12
**Precondition note:** Can ship standalone with read-only candidate artifacts. Full validation/deployment paths require Epics 3, 4, 6.

### Epic 3: Deterministic Validation and Testing Engine
Users get consistent, reproducible validation that proves readiness before deployment using fixtures and synthetic-safe substitutes.
**FRs covered:** FR13, FR14, FR15, FR17, FR18, FR19, FR20, FR21, FR22, FR23
**Precondition note:** Can ship standalone for deterministic validation and evidence production.
**Implementation note:** Include a deterministic failure taxonomy (failure class, reproducibility class, retryability) to support FR16, FR29, FR30.

### Epic 4: Policy, Risk Gating, and Promotion Controls
The system enforces risk-aware promotion decisions with auditable policy checks and prevention of unsafe transitions.
**FRs covered:** FR16, FR24, FR25, FR26, FR27, FR28, FR29, FR30
**Precondition note:** Requires production-boundary controls from Epic 6 and validation evidence shape from Epic 3 for true end-to-end enforcement.

### Epic 5: Incident-Driven Repair and Recovery
The system turns real-world failures into recoverable repair candidates and stores repair outcomes for future prevention.
**FRs covered:** FR3, FR34, FR35, FR36, FR37, FR38
**Precondition note:** Standalone for incident triage and case creation; deploy-safe repair cycles require Epic 6 and Epic 4.

### Epic 6: Credential and Environment Setup Automation
Operators can safely bootstrap and rotate test/production credentials while preventing secret leakage.
**FRs covered:** FR31, FR32, FR33, FR39, FR40, FR41, FR42, FR43, FR44, FR45
**Precondition note:** Production deployment readiness prerequisite. This epic should be established before any production credential swap automation.

### Epic 7: Governance, Approvals, and Operational Transparency
Operators can see and control every candidate decision, and roll back safely using auditable GitHub-native artifacts.
**FRs covered:** FR46, FR47, FR48, FR49, FR50
**Precondition note:** Can ship as operational observability independently. Promotion enforcement is strongest with Epics 4 and 6 in place.

### Epic 8: Reusable Knowledge and Pattern Growth
The harness continuously improves by storing and reusing patterns, fixtures, and incident learnings.
**FRs covered:** FR51, FR52, FR53, FR54
**Precondition note:** Produces value progressively as previous epics generate reusable context and incident outcomes.

## Current Epic Dependency Summary

- Epic 6 is the production safety prerequisite for production deployment actions in Epic 4.
- Epic 3 is required for deterministic production-style promotion behavior in Epic 4.
- Incident-to-repair flows in Epic 5 become production-capable when combined with Epics 2, 3, 4, and 6.

## Epic 1: Request Intake and Workflow Journey Routing
As a platform operator, I can submit and classify workflow work requests and produce an execution-ready context package before any candidate is generated.

### Story 1.1: Capture Telegram request and classify journey type
As a platform operator,
I want request intake to accept natural-language input and classify journey type,
So that requests consistently enter the correct automation path.

**FR coverage:** FR1, FR4

**Acceptance Criteria:**

**Given** a Telegram request is received  
**When** intake parsing runs  
**Then** the system classifies the request into one of: new, modify, repair, upgrade, test, rollback  
**And** returns journey confidence with route metadata.

**Given** the classifier confidence is low  
**When** intent cannot be resolved safely  
**Then** the operator is asked clarifying questions  
**And** no candidate generation starts.

### Story 1.2: Attach workflow target and required context
As a platform operator,
I want request intake to collect a workflow reference and required operational context,
So that candidate generation is deterministic.

**FR coverage:** FR2, FR5

**Acceptance Criteria:**

**Given** a request is workflow-targeted  
**When** target ID and context are missing  
**Then** validation fails with explicit correction guidance  
**And** the request remains editable.

**Given** context is supplied  
**When** request is persisted  
**Then** it stores workflow identifiers, failure payload, fixtures, and policy tags  
**And** the payload remains immutable until resolution.

### Story 1.3: Render pre-execution request summary
As a platform operator,
I want a concise request summary before execution begins,
So that I can verify intent and boundaries early.

**FR coverage:** FR6

**Acceptance Criteria:**

**Given** a request passes validation  
**When** summary rendering occurs  
**Then** the summary includes request intent, targets, risk hints, and next expected output  
**And** execution is blocked until the summary artifact is visible for review.

## Epic 2: Candidate Generation and Change Packaging
As a platform operator, I can generate versioned workflow candidates and review diffs without touching production.

### Story 2.1: Generate candidate workflow from request context
As a platform operator,
I want the system to create a workflow candidate from request context,
So that manual workflow editing is minimized.

**FR coverage:** FR7

**Acceptance Criteria:**

**Given** a validated request exists  
**When** candidate generation runs  
**Then** a candidate workflow artifact is produced with deterministic identifiers  
**And** there is zero production-state mutation.

### Story 2.2: Regenerate upgrades with placeholder preservation
As a platform operator,
I want upgrade generation to preserve business logic placeholders,
So that environment-sensitive logic remains safe.

**FR coverage:** FR8, FR10

**Acceptance Criteria:**

**Given** an upgrade request includes placeholders  
**When** regeneration runs  
**Then** placeholders remain structurally intact  
**And** changed sections are mapped to workflow nodes.

### Story 2.3: Create execution-ready diff and section traceability
As a platform operator,
I want a candidate diff and section mapping,
So that review and approval are precise.

**FR coverage:** FR9, FR11, FR12

**Acceptance Criteria:**

**Given** candidate generation completes  
**When** diff packaging executes  
**Then** the diff is stored with section-level impact mapping  
**And** package state remains review-only until explicit deployment action.

## Epic 3: Deterministic Validation and Testing Engine
As a platform operator, I can validate every candidate deterministically before promotion.

### Story 3.1: Run fixture-based validation for every candidate
As a platform operator,
I want each candidate validated against structured fixtures,
So that baseline behavior is consistently checked.

**FR coverage:** FR13, FR20

**Acceptance Criteria:**

**Given** a candidate is ready for testing  
**When** fixture validation starts  
**Then** all required fixtures are loaded and executed  
**And** missing fixture inputs produce a hard fail.

### Story 3.2: Run deterministic test pass and synthetic trigger substitutions
As a platform operator,
I want deterministic test execution with synthetic trigger alternatives,
So that workflows can be validated even without native inbound generation.

**FR coverage:** FR14, FR21, FR22, FR23

**Acceptance Criteria:**

**Given** direct trigger generation is unavailable  
**When** simulation mode is enabled  
**Then** standardized synthetic events execute via test-safe substitutions  
**And** results map to the same intended workflow contract.

### Story 3.3: Emit reproducible evidence and rerun artifacts
As a platform operator,
I want machine-readable evidence and replay bundle per test run,
So that any issue can be reproduced and shared.

**FR coverage:** FR15, FR17, FR18, FR19

**Acceptance Criteria:**

**Given** test execution finishes  
**When** evidence packaging runs  
**Then** outputs include outcomes, timings, diff-to-input mapping, and rerun script  
**And** rerun with same inputs yields the same result class.

### Story 3.4: Persist failure taxonomy for promotion decisions
As a platform operator,
I want every failed validation classified in a stable taxonomy,
So that policy gates apply consistently.

**FR coverage:** FR16

**Acceptance Criteria:**

**Given** validation reports failures  
**When** fail classification executes  
**Then** each failure is tagged with deterministic class and retryability  
**And** policy gates consume that classification consistently.

**NFR coverage:** NFR-Reli-1, NFR-Reli-4, NFR-Perf-1

## Epic 4: Policy, Risk Gating, and Promotion Controls
As a platform operator, I can apply policy-based risk controls before promotion.

### Story 4.1: Classify candidates into risk bands
As a platform operator,
I want each candidate scored by risk category,
So that automation and human review are balanced.

**FR coverage:** FR24

**Acceptance Criteria:**

**Given** validation evidence is available  
**When** risk classification runs  
**Then** candidate is assigned low/medium/high with rationale  
**And** classification is immutable for the decision period.

### Story 4.2: Auto-apply and approval-gate behaviors
As a platform operator,
I want low-risk candidates auto-apply and higher-risk candidates require approval,
So that throughput and safety are balanced.

**FR coverage:** FR25, FR26

**Acceptance Criteria:**

**Given** candidate risk is low and all checks pass  
**When** policy evaluation executes  
**Then** the candidate is auto-approved for deployment transition  
**And** medium/high candidates stay in operator-review state.

### Story 4.3: Enforce credential swap and safe promotions
As a platform operator,
I want promotion actions to include credential swap via policy-approved actions,
So that environment bindings change only under control.

**FR coverage:** FR27, FR28

**Acceptance Criteria:**

**Given** promotion action is requested  
**When** candidate crosses environment boundary  
**Then** credential operations happen through audited deployment action  
**And** unsafe scope or binding transitions are rejected.

### Story 4.4: Create immutable audit chain and traceability
As a platform operator,
I want approvals and transitions to be immutable and traceable,
So that governance is non-repudiable.

**FR coverage:** FR29, FR30

**Acceptance Criteria:**

**Given** any state transition occurs  
**When** transition is persisted  
**Then** immutable audit record includes actor, timestamp, policy and input artifacts  
**And** all links to request, candidate, and approver actions are preserved.

**NFR coverage:** NFR-Sec-3, NFR-Reli-2

## Epic 5: Incident-Driven Repair and Recovery
As an operator, I can convert incidents into tracked repair candidates using the same governed pipeline.

### Story 5.1: Capture and normalize incident context
As an operator,
I want runtime failure context captured in a canonical structure,
So that repair candidates start from complete evidence.

**FR coverage:** FR34, FR3

**Acceptance Criteria:**

**Given** production execution fails with incident metadata  
**When** capture runs  
**Then** workflow id, error context, payload, and run snapshot are stored  
**And** repair request artifact is created.

### Story 5.2: Automatically initiate repair and route through validation
As an operator,
I want repair candidates auto-created from incidents and validated via standard checks,
So that response time is reduced.

**FR coverage:** FR35, FR36

**Acceptance Criteria:**

**Given** incident case is generated  
**When** repair initiation runs  
**Then** a repair candidate follows the same validation workflow as other candidates  
**And** evidence artifacts are linked to the original incident.

### Story 5.3: Distinguish manual and automated recovery outcomes
As an operator,
I want manual and automated outcomes distinguished in records,
So that post-incident analysis is accurate.

**FR coverage:** FR37, FR38

**Acceptance Criteria:**

**Given** a repair workflow finishes  
**When** outcome is recorded  
**Then** outcome records whether repair was manual or automated  
**And** retained case data is available for fixture reuse.

## Epic 6: Credential and Environment Setup Automation
As an operator, I can guarantee credentials and environment bindings are safe and complete before execution.

### Story 6.1: Detect missing or invalid credential bindings
As an operator,
I want environment checks to reject invalid credential bindings before execution,
So that unsafe runs are prevented.

**FR coverage:** FR31, FR33, FR39

**Acceptance Criteria:**

**Given** a candidate is evaluated for execution  
**When** bindings are missing or invalid  
**Then** execution halts with targeted remediation guidance  
**And** no secret material is read into logs/artifacts.

### Story 6.2: Trigger setup skill and populate references
As an operator,
I want missing bindings to trigger setup automation using references and IDs,
So that test environments are consistently prepared.

**FR coverage:** FR40, FR41

**Acceptance Criteria:**

**Given** setup is required for missing test bindings  
**When** setup starts  
**Then** credential entries are populated from `.env` references  
**And** results are captured in an auditable setup record.

### Story 6.3: Seed fixtures and execute browser fallback
As an operator,
I want setup to seed fixtures and continue with browser fallback when APIs are unavailable,
So that the harness stays resilient.

**FR coverage:** FR42, FR43, FR44

**Acceptance Criteria:**

**Given** API credential setup fails or is unavailable  
**When** fallback flow activates  
**Then** Playwright setup path executes first  
**And** manual guided setup path is offered before deployment continues.

### Story 6.4: Record setup outcomes for audit and evidence
As an operator,
I want all setup attempts, fallbacks, and outcomes to be auditable,
So that environment operations are traceable.

**FR coverage:** FR45

**Acceptance Criteria:**

**Given** any setup attempt occurs  
**When** execution completes or fails  
**Then** an audit event records action sequence, actor, environment, and final status  
**And** evidence is linked to candidate lifecycle.

### Story 6.5: Support safe environment credential rotation actions
As an operator,
I want credential references to swap between test and production using auditable actions,
So that scope changes are reversible and controlled.

**FR coverage:** FR32

**Acceptance Criteria:**

**Given** a deployment requires environment rotation  
**When** swap action runs  
**Then** references update without exposing secret values  
**And** rollback references are preserved.

## Epic 7: Governance, Approvals, and Operational Transparency
As a team lead, I can monitor every candidate transition and execute safe rollback actions.

### Story 7.1: Publish and surface candidate state artifacts
As a team lead,
I want lifecycle states and history in GitHub-native artifacts,
So that all decisions are visible and reviewable.

**FR coverage:** FR46, FR50

**Acceptance Criteria:**

**Given** a candidate state changes  
**When** event persists  
**Then** artifacts include state timeline and linked evidence  
**And** source-of-truth remains repository-based.

### Story 7.2: Enforce role-based deployment action controls
As a team lead,
I want role-based controls on deployment actions,
So that only approved operators can execute critical transitions.

**FR coverage:** FR49

**Acceptance Criteria:**

**Given** a deployment or rollback is requested  
**When** action authorization is evaluated  
**Then** unauthorized roles are denied with clear reason  
**And** all attempts are logged.

### Story 7.3: Support controlled rollback from current to known-good state
As a lead operator,
I want rollback functionality to known-good revisions,
So that production stability is quickly restored.

**FR coverage:** FR47, FR48

**Acceptance Criteria:**

**Given** rollback criteria is triggered  
**When** rollback executes  
**Then** system restores the designated known-good revision  
**And** resulting state transitions are recorded immutably.

**NFR coverage:** NFR-Sec-4, NFR-Reli-3

## Epic 8: Reusable Knowledge and Pattern Growth
As a maintainer, I can capture and reuse patterns to improve future candidates and test quality.

### Story 8.1: Persist reusable patterns and integration context
As a maintainer,
I want successful workflow patterns and context stored in-repo,
So that future generation benefits from prior work.

**FR coverage:** FR51

**Acceptance Criteria:**

**Given** a candidate completes successfully  
**When** post-processing runs  
**Then** reusable pattern metadata is stored in repository  
**And** integration context is searchable.

### Story 8.2: Suggest reuse during request and generation
As a platform operator,
I want prior reusable patterns to be recommended while creating candidates,
So that quality improves over time.

**FR coverage:** FR52

**Acceptance Criteria:**

**Given** intake has enough context  
**When** candidate generation starts  
**Then** matching patterns are surfaced for operator opt-in  
**And** applied pattern choice is captured in artifact lineage.

### Story 8.3: Improve outputs from incident reviews and fixtures growth
As a maintainer,
I want incident reviews and fixture additions to feed back into harness intelligence,
So that future candidates are higher quality.

**FR coverage:** FR53, FR54

**Acceptance Criteria:**

**Given** review notes or manual feedback are submitted  
**When** growth job runs  
**Then** fixture sets and quality hints are updated  
**And** future candidate scoring reflects those updates.
