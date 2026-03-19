# n8n-TestHarness

Developer-focused test harness for intake capture and journey classification workflows used by n8n operations tooling.

## What this repo contains

- Domain model and schema normalization for incoming requests
- Journey classification (`new`, `repair`, `test`) with confidence scoring
- Deterministic idempotent request IDs
- SQLite persistence adapter with idempotent upsert behavior
- CLI command surface for candidate intake capture
- Shared telemetry request summary for downstream routing
- Unit tests for schema, service, and telemetry behavior

## Quick start

```bash
npm install
npm run build
npm test
```

## Architecture

- `src/commands/*`: CLI entrypoints and thin orchestration
- `src/domain/*`: domain models and shared language for request data
- `src/services/*`: business logic (normalization, classification, routing, summary shaping)
- `src/infra/*`: persistence adapters and repository implementations
- `src/shared/*`: reusable schemas, telemetry helpers, and integration contracts
- `test/*`: unit tests for critical behavior
- SQLite database files should stay outside version control (`/data/sqlite/*.db*`)

## Environment and secrets

This repository intentionally excludes local credentials and runtime data from version control via `.gitignore`.

## GitHub repo target

Remote origin for this project is expected to be:

- `https://github.com/code-compliant/n8n-TestHarness`

