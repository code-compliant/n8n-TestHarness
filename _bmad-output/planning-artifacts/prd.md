---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - C:/n8n-TestHarness/_bmad-output/planning-artifacts/product-brief-n8n-TestHarness-2026-03-19.md
  - C:/n8n-TestHarness/_bmad-output/planning-artifacts/research/technical-n8n-mcp-servers-and-test-harnesses-research-2026-03-19.md
documentCounts:
  productBriefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: developer_tool
  domain: general
  complexity: low
  projectContext: greenfield
referenceStrategy:
  externalReferences:
    - source: 'thomasansems/n8n'
      reuseRole: 'reference_patterns'
      rationale: 'API-driven workflow operation, credential handling, and environment orchestration patterns'
    - source: '12357851/n8n-workflow-automation-local-backup'
      reuseRole: 'reference_patterns'
      rationale: 'Audit logging, retries, idempotency, and review-queue patterns for non-silent failure handling'
      caution: 'Use as requirements/reference only; implementation provenance and operational safety should be validated before reuse'
workflowType: 'prd'
author: 'Chris'
date: '2026-03-19'
---

# Product Requirements Document - n8n-TestHarness

**Author:** Chris
**Date:** 2026-03-19

## Executive Summary

n8n-TestHarness is a GitHub-native developer tool that converts workflow requests into tested, reviewable, deployment-ready n8n automations for a solo-operator environment. It addresses the core gap in prompt-based workflow tooling: high iteration cost, inconsistent reliability, and weak production controls. The harness stores workflow definitions, tests, fixtures, and environment contracts in GitHub, validates changes against fixture-based test sets using test credentials, then promotes to production credentials only after explicit approval.

The system is designed for operational leverage, not broad platform features. For the first phase, it focuses on email triage reliability as the proof workflow family, then extends to adjacent business workflow families once the delivery pipeline is proven. The target outcome is deterministic output quality with minimal manual repair, lower token spend, and predictable deploy cycles.

### What Makes This Special

Most n8n tooling emphasizes workflow creation; this builds the delivery control plane around it: versioned artifacts in GitHub, deterministic validation, environment separation, and monitoring-driven repair workflows. It combines lightweight elicitation, test-first verification, and human approval gates so automation can move faster without sacrificing safety. Existing ClawHub n8n skill examples are treated as reusable pattern references (for API orchestration, idempotent behavior, and review/repair flow designs), not as the baseline implementation.

This makes the product especially effective for non-specialist operators who need dependable production-ready automation without running a permanent custom orchestration server for core control.

## Project Classification

- Project Type: `developer_tool`
- Domain: `general`
- Complexity: `low`
- Project Context: `greenfield`
- Deployment Model: GitHub-native operations via GitHub Actions with n8n as the runtime endpoint (managed test/production instance or ephemeral CI container); no dedicated always-on custom orchestration server required.

## Success Criteria

### User Success

- A solo operator can take a workflow request for email triage from Telegram and receive a generated or modified workflow package that is deployment-ready within 30 minutes, including test execution and approval-ready evidence.
- 80% of first-attempt generation/modification requests reach a deployment-ready state (tests passing, environment switch configured, ready for approval).
- Time-to-complete for a workflow fix (existing workflow) is under 30 minutes from fix request to tested redeploy candidate.
- The operator can review generated changes and test evidence without digging through raw logs or JSON-only output.
- The first post-deploy manual intervention is limited to approval and exception handling, not repetitive workflow debugging.

### Business Success

- By month 3, at least three critical workflow families are automated, starting with email triage and then quote/project setup expansion.
- Manual email triage workload is reduced by 80%.
- Average quote preparation/support task time is reduced from approximately 30 minutes to approximately 2 minutes.
- Project administration and duplicate-entry work in downstream systems is reduced by 90%.
- Week-level automation yield reaches approximately 20 hours saved by month 3.
- The workflow generation process shifts from ad-hoc prompting to a repeatable, predictable pipeline with reduced retry cost.

### Technical Success

- All generated/updated workflows must pass fixture-based validation in a dedicated test environment before approval.
- Test and production credentials are strictly separated in the delivery flow with auditable switching only at approved deploy boundaries.
- GitHub remains the source of truth for workflows, tests, fixtures, prompts/skill outputs, and policy docs.
- Deployment is reproducible from PR/state artifacts; no undocumented manual mutation to critical workflow files after approval.
- Runtime failure events in n8n must generate telemetry/hooks sufficient to open a repair path in Telegram/OpenClaw with traceable context.
- OpenClaw-triggered corrective actions are approval-aware: no silent production mutation.

### Measurable Outcomes

- Mean Time to Deploy (from approved candidate to active deployment): ≤ 10 minutes.
- Test pass rate for CI-run workflow validation: ≥ 90% in stable operation after initial tuning period.
- First-pass deployment readiness of generated workflow requests: ≥ 80%.
- Production incident rate caused by harness-generated workflow regression: less than 2 major incidents per month.
- 100% of production changes include test evidence and environment-switch evidence in PR notes.

These measurable outcomes are the quality gate thresholds for scope choices and all capability definitions that follow.

## Product Scope

### MVP - Minimum Viable Product

- GitHub-native harness flow for Telegram intake → generate/modify workflow → fixture test validation → approval → deploy.
- Email triage workflow family as first complete path.
- Test/prod environment separation and credential routing.
- Basic closed-loop repair entry (failure event → Telegram alert with context).

### Growth Features (Post-MVP)

- Additional workflow families (quote generation, quote acceptance, project setup).
- Expanded pattern/knowledge base and reusable workflow templates.
- More sophisticated multi-workflow test orchestration and richer quality gates.
- Deeper analytics on fix/repair turnaround and test stability trends.

### Vision (Future)

- A durable internal automation operations layer for the business with broader app coverage, stronger observability, and lower-touch approval policies for low-risk fixes.
- Minimal but high-confidence autonomous repair workflows under explicit safety constraints.
- Stronger self-service capability while retaining solo-operator final control.

## User Journeys

### Journey 1: Chris (Primary User) — First-Time Email Triage Setup (Success Path)

- Opening scene: Chris has a repeated email triage burden and describes a specific behavior change request in Telegram.
- Rising action: He submits a concise request and the harness converts it into a workflow candidate using OpenClaw plus project knowledge. The system shows a proposed workflow summary, test scope, and expected impact before execution.
- Climax: The harness runs fixture tests in the test credential environment, all critical checks pass, and Chris receives a deploy-ready candidate with clear artifact links.
- Resolution: He approves and triggers deploy from GitHub Actions. Production credentials are swapped only at approval boundary, and he returns to operations with reduced manual work.

### Journey 2: Chris (Primary User) — Existing Workflow Fix (Automated Recovery)

- Opening scene: A production workflow breaks under real traffic.
- Rising action: n8n emits a failure event; a Telegram alert is posted. The alert automatically triggers the configured OpenClaw repair workflow prepared in Journey 1. That workflow pulls failing context, regenerates a corrected workflow variant, and runs the same GitHub-native test flow in test credentials.
- Climax: The fix is validated automatically against fixtures and checks. If tests pass, the system creates a signed repair artifact/PR and marks it as pre-approved for execution policy.
- Resolution: For safe cases, the harness can auto-fix and auto-push the retry candidate through the same deployment path; for higher-risk changes, it surfaces the candidate for operator approval before production credential activation.

### Journey 3: Operations Persona (Admin/Ops Observer) — Monitoring and Governance

- Opening scene: An operations checkpoint is needed before release cycles.
- Rising action: The admin checks the PR with workflow artifacts, test evidence, and environment-switch proof in one place.
- Climax: They validate that only expected credentials and scopes were used and that policy gates passed.
- Resolution: The admin provides a final deployment sign-off and can trace every change to source documents and test evidence.

### Journey 4: Support/Troubleshooting Persona — Recovery and Re-deploy

- Opening scene: A client-facing automation fails under edge traffic not covered by existing fixtures.
- Rising action: The failure is captured via workflow telemetry, relayed to Telegram/OpenClaw, and converted into a reproducible issue context.
- Climax: The team reviews captured payloads/fixtures and reruns the scenario with updated fixtures, then regenerates a hardened version.
- Resolution: New test cases are added alongside the fix so recurrence is caught in CI, and deployment resumes after validation.

### Journey 5: Developer/Integrator (Future Expansion) — Knowledge Contribution

- Opening scene: Chris adds a new app integration pattern (for example, Notion, Google Apps, Telegram).
- Rising action: The integration steps and constraints are encoded as reusable harness knowledge and test fixtures.
- Climax: The next workflow generation request reuses this knowledge automatically, reducing prompt ambiguity and manual correction.
- Resolution: The harness produces more consistent outputs, and integration quality improves without extra operator effort.

### Journey 6: Chris (Primary User) — Existing Workflow Improvement (Working Workflow Upgrade)

- Opening scene: A workflow is stable in production, and Chris wants a planned enhancement (for example, filtering or mapping changes).
- Rising action: He prompts OpenClaw with the workflow identifier and upgrade intent. The system loads the existing workflow, applies the requested change using the same Journey 1 workflow pipeline, and produces an upgraded version in test context.
- Climax: The modified workflow passes fixture and regression checks, with diffs and expected behavior shown before release.
- Resolution: Chris approves deployment (or auto-approves safe policy classes), and the system promotes via the same GitHub-native deploy path while keeping production credentials isolated until authorization is complete.

## Journey Requirements Summary

- Request intake must be clear, structured, and traceable from user intent through artifact output.
- Every journey must produce auditable evidence before production credential activation.
- Repair and upgrade journeys require fast reproduction support through captured context, fixtures, and test reruns.
- Governance journeys require explicit visibility into credentials, gates, and test outcomes.
- Expansion journeys must treat reusable knowledge as first-class artifacts in the repository, not ad hoc notes.

These journey outcomes are now translated into the capability contract below.

## Functional Requirements

### Workflow Intake and Context Capture

- This section is the binding capability contract for downstream design, architecture, and implementation work.

- FR1: Chris can submit a new workflow request via Telegram using natural language.
- FR2: Chris can submit a request to modify a specific existing n8n workflow by identifier.
- FR3: Chris can request automated repair for a failing workflow from a failure context.
- FR4: The system can classify each request into journey types (new workflow, repair, upgrade, test, rollback).
- FR5: The system can attach required context (workflow, failure payload, fixtures, policy) to each request.
- FR6: The system can provide a concise request summary before execution starts.

### Workflow Generation and Evolution

- FR7: The system can generate a workflow candidate from request context.
- FR8: The system can regenerate an upgraded workflow from an existing workflow and explicit upgrade intent.
- FR9: The system can produce an execution-ready diff for operator review.
- FR10: The system can preserve required business logic placeholders in upgraded workflows.
- FR11: The system can create a candidate package without mutating production state.
- FR12: The system can map requested changes to affected workflow sections for traceability.

### Testing, Validation, and Evidence

- FR13: The system can run fixture-based validation for every candidate in test.
- FR14: The system can run a deterministic test pass in a designated test environment.
- FR15: The system can produce machine-readable evidence for each validation run.
- FR16: The system can block promotion when required checks fail.
- FR17: The system can generate a reproducible test rerun artifact from any candidate.
- FR18: The system can generate a rollback candidate when validation fails.
- FR19: The system can verify environment boundaries before deployment decisions.
- FR20: The system can generate test content artifacts (including synthetic email-like payloads) for workflow behavior validation.
- FR21: The system can execute validation using simulated triggers/events when real inbound email generation is unavailable.
- FR22: The system can map simulated-trigger test outcomes back to the same expected workflow intent used for production-like behavior.
- FR23: The system applies test-safe trigger/node substitutions through a standard workflow operation contract.
  - It must capture an immutable baseline snapshot of workflow structure, node graph, trigger types, credential binding keys, and environment assumptions before any substitution.
  - It must apply reversible substitutions for deterministic test execution only.
  - It must restore workflow state from snapshot after test execution unless a separate approved deployment action intentionally persists a production-bound change set.

### Policy, Risk, and Deployment Control

- FR24: The system can classify candidate changes into low-, medium-, and high-risk classes.
- FR25: The system can auto-apply only low-risk candidates under policy gates.
- FR26: The system can require operator approval for medium- and high-risk candidates.
- FR27: The system can swap credentials from test context to production context only through an auditable, policy-enforced deployment action.
- FR28: The system can prevent unsafe actions that alter production credentials or scopes outside policy.
- FR29: The system can create immutable audit artifacts for each candidate, including intent, inputs, diffs, checks, and decisions.
- FR30: The system can provide traceability from candidate to source request and approver actions.
- FR31: The system can verify that credential values are stored only in n8n, while environment `.env` files store only credential references and selectors.
- FR32: The system can rotate deployment target between test and production by swapping credential references in environment configuration without exposing secret values.
- FR33: The system can enforce that `.env` values for credentials are repository-safe references or IDs only, with no raw credential secret material.

### Recovery and Incident Closure

- FR34: The system can capture runtime failure context from production executions.
- FR35: The system can automatically initiate repair from incident context.
- FR36: The system can route repair candidates through the same validation path as new/upgrade candidates.
- FR37: The system can distinguish manual recovery from automated repair outcomes.
- FR38: The system can persist repair cases for fixture growth and future regression prevention.

### Credential and Test Environment Setup

- FR39: The system can detect missing/invalid credential bindings for the selected environment (test for validation; production for deployment) before execution.
- FR40: The system can trigger a dedicated credential-setup skill to bootstrap missing test credentials in n8n.
  - Credential bootstrap is environment-scoped to test by default.
  - Environment-switch hooks for production binding are only added during approved deployment actions with an explicit env-switch plan.
- FR41: The credential-setup skill can populate n8n credential entries from `.env` references/IDs when available.
- FR42: The credential-setup skill can also seed test environments with required fixture data when configured.
- FR43: The system can perform credential setup and seeding via browser automation (for example, Playwright) when API automation is not available.
- FR44: The system can request operator-guided manual setup when automation-based setup fails.
- FR45: The system can record all setup attempts, fallback actions, and final outcomes in the audit artifact.

### Governance and Operations

- FR46: The operator can view candidate state (pending, testing, approved, blocked, deployed) in GitHub-native artifacts.
- FR47: The system can provide an auditable change history of workflow transitions.
- FR48: The system can perform controlled rollback from current deployed state to known-good revision.
- FR49: The system can provide role-based approver actions for each deployment decision.
- FR50: The system can keep all artifacts and metadata in GitHub as source-of-truth.

### Knowledge and Improvement Management

- FR51: The system can store reusable workflow patterns and integration context in-repo.
- FR52: The system can suggest reuse of prior patterns for new requests.
- FR53: The system can add fixtures and test data from incident reviews.
- FR54: The system can improve request-to-output quality through reusable knowledge growth.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

- **MVP approach:** Delivery-plane-first.
- **Positioning:** A GitHub-native automation control plane that proves repeatable, auditable, low-risk workflow changes before production promotion.
- **MVP philosophy:** ship the smallest stable automation stack that demonstrates value in one operator workflow and one reliable recovery workflow.
- **Resource baseline:** solo operator + one small helper agent.

### MVP Feature Set (Phase 1)

- **Core user journeys supported:** Journeys 1, 2, 3, 4, and 6.
- **Must-have capabilities:**
  - `repair-workflow` and `upgrade-workflow` pipelines share a single GitHub Action path.
  - Automated failure telemetry routed to Telegram, including reproducible `repair-context` payloads.
  - Auto-fix policy gates that only permit low-risk candidate application without manual approval.
  - Deterministic fixture-based validation before any production credential activation.
  - Structured audit artifact for every candidate (`workflow-audit.json`) with inputs, diffs, checks, and policy reason.
  - Explicit test/production environment contracts and enforced switching boundaries.
- **MVP acceptance boundaries:** no dedicated self-hosted control servers; GitHub Actions is the execution orchestrator.

### Post-MVP Features (Phase 2)

- Add workflow family templates and richer knowledge graph contributions.
- Expand auto-fix policy for additional safe node and expression edits.
- Improve recovery workflows with improved context summarization and root-cause tagging.
- Introduce operator dashboards for run history and repair trend tracking.
- Add richer review workflows for multi-workflow dependency visibility.

### Expansion Features (Phase 3)

- Broader app/domain onboarding with additional connector ecosystems.
- Advanced policy modes (team-based approvals, multi-repo policy inheritance).
- Higher-risk automated remediation once reliability evidence passes defined thresholds.
- Additional quality-of-life tooling for migration and rollback governance.

### Scoping Decision Framework

- **Scope tradeoff (keep now vs defer):**
  - In-scope now: automated recovery and upgrade for n8n workflows with safe/unsafe change classification.
  - Deferred: speculative autonomous optimizers, large ecosystem UI additions, and broad multi-tenant policy tooling.
- **Risk-based decision rule:**
  - Low-risk classes may auto-apply after passing all gates.
  - Medium-risk classes require PR + operator approval.
  - High-risk classes always require manual authorization and explicit changelog review.

### Risk-Based Scoping

- **Technical risk:** inaccurate auto-fix suggestions in non-deterministic workflows.
  - Mitigation: confidence thresholds, JSON schema + dry-run checks, and fixture replay in test credentials.
- **Market risk:** low operator trust in autonomous change.
  - Mitigation: visible audit artifacts, deterministic run IDs, and easy rollback.
- **Resource risk:** solo-operator overload from too many safety gates.
  - Mitigation: tighten policy by default and add capabilities in small increments after reliability signals improve.

## Innovation & Novel Patterns

The capability contract and NFRs are designed to maintain this product focus and avoid drift into unsupported feature work.

### Detected Innovation Areas

- GitHub-native deterministic workflow delivery loop. Workflow intent from Telegram becomes versioned GitHub artifacts, runs through fixture validation, and only then enters gated promotion.
- Reusable control-plane pattern for repair and upgrade reuse. Failure repair and planned upgrades use one tested path: clone current workflow, patch via OpenClaw, run test flow, and promote with policy.
- Policy-driven automation with safe autonomy. Automation can be proactive (auto-repair on failure) while still enforcing policy boundaries around high-risk changes.
- Environment contract as a first-class requirement. Test/production credential switching is an explicit artifact and deployment gate, not operational convention.
- Knowledge-accumulating assistant integration. In-repo pattern/fixture/context assets make prompts more deterministic and less error-prone over time.

### Market Context & Competitive Landscape

- Existing tools cover parts of the problem: MCP wrappers and prompt-to-workflow generation, or backup/repair support.
- The gap is the missing end-to-end bridge between generation, deterministic testability, auditability, and controlled production promotion.
- The product edge is delivery semantics: evidence-first, GitHub-native, environment-separated operations, not raw workflow synthesis alone.
- Many alternatives still break the production path into disconnected steps and do not enforce a single verified request-to-deploy control loop.

### Validation Approach

- Validate as outcomes, not features: first-pass readiness, MTTR for fixes, and time-to-deploy for Journey 1/2/6.
- A/B test policy bands: low-risk auto-fix path versus manual-approval path.
- Only expand auto-apply boundaries once repair and upgrade fixtures are stable under CI and repeated regression checks.
- Keep change classes explicit in policy (safe, conditional, restricted), with explicit gates before production promotion.

### Risk Mitigation

- Failure risk: auto-generated fixes could introduce defects.  
  Mitigation: test gates, policy matrix, rollback, and kill-switch.
- Scope drift risk: automation becomes overly proactive beyond intended boundaries.  
  Mitigation: change class taxonomy and explicit approval requirements.
- Context-loss risk: poor failure context yields repeated bad fixes.  
  Mitigation: structured failure payload capture, traceable ticket/PR linkage, and fixture refresh workflow.
- Credential risk: test and production credentials mixing.  
  Mitigation: environment-contract checks, diff checks, and audit logs as mandatory PR checks.

## Developer Tool Specific Requirements

### Project-Type Overview

n8n-TestHarness is a developer tool that operationalizes AI-assisted workflow authoring into a controlled delivery system. Its core value is not a UI but a reproducible, testable pipeline that converts user requests into version-controlled, validated n8n workflow changes.

### Technical Architecture Considerations

- Primary implementation language is TypeScript/Node.js, aligned with the ecosystem researched and n8n MCP tooling.
- The harness control plane runs on GitHub Actions orchestration with n8n as the managed execution environment.
- Core automation capabilities are exposed as explicit actions/commands (generate, test, repair, promote, rollback, sync-knowledge).
- Repository-first artifact model: workflows, fixtures, test policies, and environment contracts are committed and reviewed together.
- Safe automation defaults: approval-aware promotion, explicit environment switching checks, and test-gated deployment paths.

### Language Matrix

- Primary runtime: TypeScript/Node.js
- Secondary adapters: optional script helpers in Python/PowerShell only when integration constraints require it.
- Tooling and API clients: n8n REST/CLI, MCP interfaces, GitHub Actions, fixture runner tooling.

### Installation Methods

- GitHub-hosted execution path:
  - Repository-level GitHub Actions workflows handle generation, testing, and deploy.
  - No separate end-user installer required for primary operator workflow.
- Local developer setup:
  - Standard Node.js dependency installation for local debugging.
  - Optional local CLI for dry-run validation and fixture checks.
- Deployment path:
  - GitHub merge gates or manual dispatch, with risk-based controls.

### API Surface

- `generate-workflow`: create or modify a workflow from Telegram request + workflow context.
- `upgrade-workflow`: apply planned improvements to an existing stable workflow.
- `repair-workflow`: generate candidate fixes from failure context.
- `test-workflow`: run fixture-based validation in test environment.
- `promote-workflow`: switch validated change from test credentials to production credentials.
- `rollback-workflow`: restore prior workflow revision on regression.
- `sync-knowledge`: update reusable pattern knowledge, fixtures, and policy files.

### Code Examples

- Each action must include executable input/output examples and expected exit conditions.
- Example Telegram prompts for:
  - New workflow creation
  - Existing workflow upgrade
  - Automated failure repair
- Include one successful and one failed validation scenario with fixture results and expected operator handling.

### Migration Guide

- Phase 1: Introduce the tool for email triage to replace manual prompt-to-workflow and manual deploy.
- Phase 2: Migrate existing stable workflows into GitHub-tracked assets with environment-separated credentials.
- Phase 3: Move repair and improvement operations to the standardized request/repair/upgrade flows.
- Exit criteria per phase: fixture stability, PR approval latency, and deployment predictability.

## Non-Functional Requirements

### Security

- NFR-Sec-1: The system must never write secret credential values to source files, PR diffs, artifacts, or logs.
- NFR-Sec-2: Actual workflow credentials must be stored only in the n8n credential store, while `.env` contains only credential reference IDs.
- NFR-Sec-3: Any credential swap action must include auditable evidence of actor, timestamp, environment target, and revision.
- NFR-Sec-4: Deployment actions that change environment bindings must only execute after explicit approval and policy check.

### Reliability

- NFR-Reli-1: Every test candidate must complete a reproducible validation cycle before promotion, producing deterministic outcomes for unchanged inputs.
- NFR-Reli-2: If validation, test-seeding, or deployment fails, promotion must stop and remain in a safe rollbackable state.
- NFR-Reli-3: Setup flows for credentials and test data must be idempotent for the same input set.
- NFR-Reli-4: Trigger substitution and environment-binding operations must be reversible using stored snapshots, and production state must only change through approved deploy transitions.

### Integration

- NFR-Int-1: The system must maintain reliable connections with GitHub, n8n, Telegram, and OpenClaw through bounded retry and explicit transient/permanent failure handling.
- NFR-Int-2: The credential setup flow must use API/SDK automation where available and supported, with browser automation as fallback when needed.
- NFR-Int-3: When a candidate uses synthetic triggers due to unavailable inbound email generation, behavior outcomes must map to a normalized trigger contract for comparability.

### Performance

- NFR-Perf-1: The system shall complete a typical end-to-end validation cycle for a standard candidate in ≤ 45 minutes from dispatch.
- NFR-Perf-2: Incident-triggered repair invocation shall produce actionable candidate evidence within 5 minutes and shall not block unrelated pipeline runs.
