# Story 3.11: Ralph Dashboard

Status: ready

## Story

As a platform operator,
I want a live web dashboard served when the Ralph Loop runs,
so that I can monitor iteration progress and abort the loop from a browser without relying solely on Telegram messages.

## Acceptance Criteria

1. Given the Ralph Loop starts, when the dashboard process launches on the Hetzner server, then a Telegram message is sent containing a token-protected dashboard URL.
2. Given the dashboard URL is opened in a browser, when the page loads, then it shows: workflow name, current iteration (N/5), progress bar, per-iteration results (pass/fail per assertion), and current loop status.
3. Given the loop advances to the next iteration, when the dashboard is open, then the UI updates in real-time via SSE without requiring a page refresh.
4. Given the Abort button is tapped in the dashboard, when the request is received, then the abort signal is written to SQLite (Story 3.7), a confirmation is shown in the UI, and a Telegram message confirms the abort was triggered.
5. Given the loop completes (any halt status), when the dashboard detects completion, then it shows the final status, a link to the ralph-report file, and a "Loop complete — this window will close in 60 seconds" countdown.
6. Given the loop has been inactive for 3 hours (Story 3.7 timeout fires), when the dashboard receives the halt event, then it shows "Timed out — no activity for 3 hours" and the same countdown.
7. Given the dashboard process is running, when no SSE client has been connected for 60 minutes AND the loop is complete, then the process self-terminates.
8. Given the dashboard URL is accessed without a valid token, when the request is received, then it returns HTTP 401 with no content.

## Dashboard UI Layout

```
┌─────────────────────────────────────────────────────┐
│  🔁 Ralph Loop                          ⏱ 2h 14m   │
│  Workflow: email-triage v2.3            idle timeout │
├─────────────────────────────────────────────────────┤
│  Iteration 2 / 5    ████████░░░░░░░░░░░  Running... │
├─────────────────────────────────────────────────────┤
│  ✅ Iteration 1 — Failed (2/4 assertions passed)    │
│  ├ ✅ error_handler_check              passed        │
│  ├ ✅ schema_match                    passed        │
│  ├ ❌ classification_check            billing ≠ {urgent,routine,delegate,ignore} │
│  └ ❌ perspective_check               WRONG (client voice detected)              │
│  Fix applied: injected role context + fixed tag allowlist                        │
├─────────────────────────────────────────────────────┤
│  ⏳ Iteration 2 — In Progress                        │
│  ├ ✅ error_handler_check              passed        │
│  ├ ⏳ schema_match                    running...     │
├─────────────────────────────────────────────────────┤
│                              [⏹ Abort Loop]          │
└─────────────────────────────────────────────────────┘
```

## Technical Design

- **Server:** Express.js process, spawned on Hetzner (5.223.42.54) by the Ralph Loop orchestrator at loop start
- **Port:** `18942` (fixed, dedicated to Ralph Dashboard — not exposed externally directly)
- **Nginx proxy:** `ralph.5.223.42.54.sslip.io` → `localhost:18942`, HTTPS via sslip.io cert
- **Auth:** Single-use 32-char hex token in query string (`?token=<token>`); token stored in `ralph_loops.dashboardToken`; validated on every request
- **Live updates:** SSE endpoint `/events?token=<token>` — streams `LoopEvent` JSON objects
- **Abort endpoint:** `POST /abort?token=<token>` — writes to `ralph_loop_signals` table
- **Self-termination:** process exits when `status` is terminal AND no SSE client connected for 60min; also exits on `SIGTERM` from orchestrator
- **Frontend:** Single HTML file with vanilla JS + SSE client — no build step, no framework

## LoopEvent SSE Schema

```typescript
type LoopEventType =
  | 'loop_started'
  | 'iteration_started'
  | 'assertion_result'
  | 'iteration_complete'
  | 'loop_complete'
  | 'loop_aborted'
  | 'loop_timeout';

interface LoopEvent {
  type: LoopEventType;
  timestamp: string;
  data: unknown; // typed per event
}
```

## Nginx Config (to add to Hetzner)

```nginx
server {
  listen 443 ssl;
  server_name ralph.5.223.42.54.sslip.io;
  location / {
    proxy_pass http://localhost:18942;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    proxy_buffering off;     # required for SSE
    proxy_cache off;
    chunked_transfer_encoding on;
  }
}
```

## Implementation Summary

- `DashboardServer`: Express app, SSE broadcaster, abort endpoint, token middleware, self-termination logic
- `DashboardLauncher`: spawns `DashboardServer` as a child process from the loop orchestrator; passes loop ID and token via env vars
- `LoopEventBus`: in-process event emitter that the orchestrator fires on state transitions; `DashboardServer` subscribes and broadcasts to SSE clients
- Frontend: `src/dashboard/index.html` — single file, SSE client, renders iteration cards, abort button
- Nginx config snippet: `src/dashboard/nginx-ralph.conf` (applied manually or via deploy script)

## Files

- `src/services/dashboard-server.ts`
- `src/services/dashboard-launcher.ts`
- `src/services/loop-event-bus.ts`
- `src/dashboard/index.html`
- `src/dashboard/nginx-ralph.conf`
- `test/unit/services/dashboard-server.spec.ts`

## Dev Notes

FR coverage: FR15, FR46, FR47
Nginx must be configured on Hetzner before first use — add step to `README.md` deploy checklist.
Dashboard process must be killed by orchestrator on loop halt even if self-termination hasn't fired yet (belt and suspenders).
Token is single-loop-lifetime only — a new token is generated for every Ralph Loop run.
SSE keep-alive: send `: keepalive\n\n` comment every 30s to prevent proxy timeouts.

## Change Log

- 2026-03-21: Story authored — Ralph Loop epic.
