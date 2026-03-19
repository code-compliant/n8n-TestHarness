---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-03-19
author: Chris
---

# Product Brief: n8n-TestHarness

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

n8n-TestHarness is a GitHub-native, test-driven automation harness for building, validating, deploying, and maintaining n8n workflows with OpenClaw. It is designed first for a solo operator who wants to automate real business processes without burning excessive tokens, relying on fragile back-and-forth prompting, or manually managing workflow quality in production.

The product combines prompt-based workflow generation with deterministic engineering controls: reusable workflow knowledge, application-specific context, fixture-based testing, credential-aware environment management, deployment gates, runtime monitoring, and closed-loop repair. Instead of treating OpenClaw as the product, the harness makes OpenClaw one component inside a controlled automation delivery system.

The initial workflow focus includes inbound email triage, quote generation from emails and drawings, and quote acceptance flows that create downstream project records and notifications. Over time, the system becomes a reusable skill and knowledge layer for proven n8n patterns, supported by MCP servers, open source tooling, and operational feedback from real workflow failures.

---

## Core Vision

### Problem Statement

Building n8n workflows manually is slow and hard to scale. Using OpenClaw directly to generate them is costly, inconsistent, and error-prone because it lacks enough context about the operator's applications, workflow conventions, testing requirements, and deployment model. The result is too much manual work, too much prompt iteration, and too little confidence that workflows will work reliably once deployed.

### Problem Impact

If this problem remains unsolved, critical business processes continue to depend on manual effort rather than automation. Time is lost building and testing workflows by hand, token spend rises through repeated prompt retries, and production automation remains unreliable because workflows are not backed by a repeatable test and deployment discipline. This blocks the compounding value of automation across the business.

### Why Existing Solutions Fall Short

Current approaches fall short because they focus on workflow generation rather than workflow operations. Raw OpenClaw prompting can produce partial workflows, but it does not provide deterministic validation, fixture-based test execution, enforced test gates before merge or deploy, structured separation between test and production credentials, or a GitHub-centered lifecycle for changes and repairs. Existing n8n templates and ad hoc scripting also fail to create a closed loop between monitoring, diagnosis, approval, and redeployment.

### Proposed Solution

n8n-TestHarness will provide a controlled pipeline for creating and operating n8n workflows. OpenClaw will generate or modify workflows using a curated knowledge base of the user's applications, proven n8n patterns, and architecture rules. Every workflow will be stored in GitHub alongside test fixtures, assertions, environment configuration, monitoring definitions, prompts or skill artifacts, and reusable pattern knowledge.

Before deployment, the harness will validate workflow structure, run fixture-based test executions, assert expected outputs, and require tests to pass before merge or deploy. Testing and production will share the same n8n instance where appropriate, but use separate credentials so workflows can be validated safely before switching to production accounts at release time.

In production, monitoring hooks will detect runtime failures and report them through Telegram. OpenClaw will use that signal to diagnose issues, patch workflows in GitHub, and wait for approval before applying most fixes, while still allowing automatic redeployment of clearly low-risk corrections. The end state is a mostly one-click workflow delivery system that preserves human oversight while automating the rest of the lifecycle.

### Key Differentiators

The core differentiator is closed-loop monitoring and repair: failures are not just detected, they trigger a structured path to diagnosis, patching, approval, and redeployment.

A second differentiator is GitHub-native workflow governance. Workflows, tests, fixtures, environment definitions, and knowledge assets all live in version control as the source of truth.

A third differentiator is deterministic delivery for n8n. Workflow generation is constrained by test-first validation, credential-aware environment switching, and deploy gates instead of depending on prompt quality alone.

A fourth differentiator is domain-aware workflow generation. The harness is designed around the actual applications in use on day one, including Telegram, GitHub, Google Apps, and Notion, and can expand through MCP-backed research and proven workflow libraries over time.

## Target Users

### Primary Users

The primary user is a solo operator persona: a busy managing director with deep domain expertise and limited coding experience who needs business automation without becoming a software engineer.

#### Persona: Chris, Managing Director and Structural Engineer

Chris runs a small engineering business with a team of three. He is responsible for high-value technical work, business operations, client delivery, and company direction. He does not identify as an automation engineer and does not want to spend his time manually building workflows, troubleshooting prompt failures, or managing brittle automation systems.

His day is fragmented across client communication, quoting, project coordination, and operational decisions. Automation fits into his workflow as a leverage tool: it should reduce manual work, not create a second job in systems maintenance.

Chris is motivated by speed, reliability, and control. He wants to describe what he needs in plain language, have the system turn that into a working n8n workflow, validate it safely, and deploy it with minimal friction.

Today, he experiences the problem through manual workflow creation, manual testing, and unreliable attempts to generate workflows with OpenClaw. The practical impact is time loss, slow automation progress, and inconsistent results. The emotional impact is frustration from burning tokens and energy without getting dependable business automation in return.

Success for Chris looks like a system that can take a request through a lightweight elicitation process, generate or modify the right workflow, test it against test credentials, and deploy it confidently to production. His ideal reaction is: "This did exactly what I asked, safely, and without me having to fight the tooling."

### Secondary Users

The secondary users are indirect beneficiaries rather than direct operators of the harness.

#### Internal Team Members

Chris's two employees benefit when workflows reliably handle operational tasks such as email triage, quoting support, project setup, and internal notifications. They do not interact directly with the harness or OpenClaw, but their work becomes more organized and less dependent on manual handoffs.

#### Clients

Clients benefit through faster responses, more consistent quoting processes, clearer project setup, and fewer missed operational steps. They are not product users in the software sense, but they experience the downstream value of better automation.

#### Approval and Oversight Role

There is one approval authority in the system: Chris. He acts as the human reviewer for generated workflows, quote-related outputs, and workflow fixes before higher-risk changes move into production. This keeps the product aligned with a solo-operator control model rather than a team-based governance model.

### User Journey

#### Discovery

Chris identifies a repetitive business process, a broken workflow, or an opportunity to improve an existing automation. This usually starts from real operational pain: too much manual handling of emails, quote creation, project initiation, or workflow maintenance.

#### Onboarding

Chris interacts with the system through Telegram. He prompts OpenClaw with what he wants to create, fix, or improve in an n8n workflow. Because raw prompting alone is often ambiguous, the ideal experience includes lightweight elicitation to clarify intent before changes are generated.

#### Core Usage

For a new workflow, the system interprets the request, generates the n8n workflow, tests it using test credentials, validates outputs, and prepares it for deployment.

For an existing workflow, the system first clones the current workflow, replaces production credentials with test credentials, applies the requested fix or enhancement, runs tests, and prepares the updated version for deployment.

In both cases, GitHub acts as the source of truth for workflows, tests, fixtures, and related automation assets.

#### Success Moment

The "aha" moment is when Chris can describe a workflow need in plain language and receive a tested, deployment-ready result with minimal back-and-forth. The strongest success moment is not just generation, but seeing the system safely swap from test credentials to production credentials and deploy with confidence.

#### Long-Term Routine

Over time, the harness becomes Chris's standard operating layer for automation work. Instead of manually building and testing workflows or repeatedly wrestling with nondeterministic prompts, he uses a repeatable flow: describe the need, refine through elicitation, review the result, approve deployment, and rely on monitoring and repair to keep workflows healthy after release.

## Success Metrics

Success for n8n-TestHarness is measured by whether it turns workflow automation into a fast, dependable, low-friction operating capability for a solo business operator.

From the user perspective, the product succeeds when a new workflow can move from prompt to deployed state in under 30 minutes, and an existing workflow fix can also be tested and redeployed in under 30 minutes. The product should produce deployment-ready workflows on the first full attempt at least 80% of the time, with tests passing and outputs matching expectations before release.

The product also succeeds when it removes meaningful manual business work. The target outcomes are to reduce manual email triage by 80%, reduce quote preparation time from approximately 30 minutes to 2 minutes, and reduce project setup administration and duplicate entry across systems by 90%.

A further success criterion is prompt efficiency. OpenClaw usage should be reduced to setup, orchestration, and targeted prompts where needed, rather than repeated full-agent prompt loops for routine workflow construction and maintenance. In practice, this means moving from expensive iterative prompting toward deterministic automation supported by reusable knowledge, tests, and controlled deployment steps.

Operationally, "mostly one-click deployment" means that once tests pass, the operator can trigger deployment with a single explicit deploy command, without needing to manually rework workflow definitions, credentials, or environment setup.

### Business Objectives

Within 3 months, the product should automate at least three critical business workflows, improve response speed to inbound work, establish Notion as a reliable single source of truth for downstream project information, and save approximately 20 hours of work per week. At that point, the system should be creating meaningful leverage across a three-person business by amplifying throughput rather than adding coordination overhead.

Within 12 months, the product should free enough operational time and attention that the primary user can focus more energy on higher-value business acceleration projects rather than workflow building, manual triage, and process administration.

### Key Performance Indicators

- Time from prompt to deployed new workflow: under 30 minutes
- Time from fix request to tested redeploy for existing workflow: under 30 minutes
- First-attempt deployment readiness rate: at least 80%
- Reduction in manual email triage workload: 80%
- Reduction in quote preparation time: from 30 minutes to 2 minutes
- Reduction in project setup and duplicate-entry admin workload: 90%
- Weekly time saved through automation: 20 hours
- Number of critical workflows automated within first 3 months: at least 3
- Deployment interaction model: one deploy command after successful tests
- Prompt efficiency target: OpenClaw used primarily for setup and targeted prompt tasks rather than repeated end-to-end workflow prompting

## MVP Scope

### Core Features

The MVP of n8n-TestHarness is a working internal harness that can generate, test, and deploy one real workflow family end to end: email triage.

The MVP must support a Telegram-based prompt interface where the operator can ask OpenClaw to create or modify an n8n workflow for email triage. The system should support lightweight elicitation when the request is ambiguous so that the generated workflow aligns more closely with the intended business process.

The MVP must include GitHub-based storage and versioning for workflows and related harness assets, so the system has a durable source of truth from the start.

The MVP must support separate test and production credentials within the same n8n instance. For new or modified workflows, the harness should use test credentials during validation, then switch to production credentials only when deployment is explicitly approved.

The MVP must run fixture-based tests against the generated workflow and confirm that the workflow behaves correctly before deployment. Once tests pass, the operator should be able to trigger deployment with a single deploy command.

The MVP must include a reusable knowledge base of proven workflow patterns relevant to the initial app stack and use case, so OpenClaw is not operating from raw prompts alone. This knowledge layer should focus first on n8n architecture, email triage patterns, and the day-one application context.

The MVP should be packaged as an OpenClaw skill so it can be invoked in a structured, repeatable way rather than rebuilt from scratch for every request.

The MVP also includes a basic closed-loop repair entry point using native n8n error handling. When a workflow throws an error, n8n should trigger an error workflow that sends a Telegram message to OpenClaw with enough context to review the failure and prepare a fix path.

### Out of Scope for MVP

The MVP does not need to support every workflow family immediately. Quote generation and quote acceptance or project setup workflows are outside the first release and should follow only after the harness proves itself on email triage.

The MVP does not need to become a general-purpose external platform, multi-tenant product, or broad market offering. This is an internal tool built for one operator and one business environment.

The MVP does not need deep autonomous repair and silent production mutation. While failure reporting and fix preparation are in scope, fully automatic self-directed changes without approval are out of scope for the first release.

The MVP does not need broad research automation across many MCP servers and open source ecosystems at launch. Initial knowledge can be curated manually and expanded later.

### MVP Success Criteria

The MVP is successful if the harness can produce at least one real, production-ready email triage workflow from a business request, test it with test credentials and fixtures, and deploy it with a single deploy command.

It is also successful if the generated workflow is stored and managed through GitHub, if the harness can distinguish test from production credentials correctly, and if native n8n error handling can surface workflow failures back to OpenClaw through Telegram for review.

The decision to continue building beyond MVP should be based on proving that this end-to-end harness flow works reliably in a real business scenario, not just on generating workflow definitions in isolation.

### Future Vision

Beyond MVP, n8n-TestHarness evolves into stable internal automation infrastructure for the business. Once the email triage path is proven, the same harness can be extended to other high-value workflow families such as quote generation and quote acceptance or project setup.

Over time, the system can deepen its reusable knowledge base, support more proven workflow patterns, improve repair automation, and reduce the amount of manual oversight required while still preserving operator control. The long-term goal is not market expansion, but dependable internal leverage: a repeatable system for turning business process needs into tested, monitored, deployment-ready automations.
