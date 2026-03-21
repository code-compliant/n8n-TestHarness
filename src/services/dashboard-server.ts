import express from 'express';
import { Server } from 'http';
import type Database from 'better-sqlite3';
import { LoopEventBus, type LoopEvent } from './loop-event-bus';

export interface DashboardServerConfig {
  port: number;
  loopId: string;
  token: string;
}

export class DashboardServer {
  private readonly app: express.Application;
  private readonly db: Database.Database;
  private readonly config: DashboardServerConfig;
  private readonly eventBus: LoopEventBus;
  private server?: Server;
  private sseClients: Set<express.Response> = new Set();
  private lastClientActivity: number = Date.now();
  private readonly keepAliveInterval: NodeJS.Timeout;
  private readonly inactivityCheckInterval: NodeJS.Timeout;

  constructor(db: Database.Database, config: DashboardServerConfig) {
    this.db = db;
    this.config = config;
    this.eventBus = LoopEventBus.getInstance();
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.subscribeToEvents();

    // Keep-alive for SSE connections every 30 seconds
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 30000);

    // Check for inactivity every minute
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivity();
    }, 60000);
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Dashboard server started on port ${this.config.port}`);
          console.log(`Dashboard URL: http://ralph.5.223.42.54.sslip.io?token=${this.config.token}`);
          resolve();
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      clearInterval(this.keepAliveInterval);
      clearInterval(this.inactivityCheckInterval);

      // Close all SSE connections
      this.sseClients.forEach(client => {
        try {
          client.end();
        } catch (error) {
          // Ignore errors when closing connections
        }
      });
      this.sseClients.clear();

      if (this.server) {
        this.server.close(() => {
          console.log('Dashboard server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private setupMiddleware(): void {
    this.app.use(express.json());

    // Token validation middleware
    this.app.use((req, res, next) => {
      const token = req.query.token as string;
      if (!token || token !== this.config.token) {
        return res.status(401).send('Unauthorized');
      }
      next();
    });

    // CORS headers for SSE
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Cache-Control');
      next();
    });
  }

  private setupRoutes(): void {
    // Serve the dashboard HTML
    this.app.get('/', (req, res) => {
      const html = this.generateDashboardHTML();
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // SSE endpoint for live updates
    this.app.get('/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      this.sseClients.add(res);
      this.lastClientActivity = Date.now();

      console.log(`SSE client connected, total clients: ${this.sseClients.size}`);

      // Send initial loop state
      this.sendLoopState(res);

      // Handle client disconnect
      req.on('close', () => {
        this.sseClients.delete(res);
        console.log(`SSE client disconnected, total clients: ${this.sseClients.size}`);
      });

      req.on('error', () => {
        this.sseClients.delete(res);
      });
    });

    // Abort endpoint
    this.app.post('/abort', (req, res) => {
      console.log(`Abort requested for loop ${this.config.loopId}`);

      try {
        this.recordAbortSignal();
        this.eventBus.emitLoopAborted({
          loopId: this.config.loopId,
          triggeredBy: 'dashboard'
        });

        res.json({ success: true, message: 'Abort signal sent' });
      } catch (error) {
        console.error('Failed to abort loop:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private subscribeToEvents(): void {
    this.eventBus.subscribeToEvents((event: LoopEvent) => {
      // Only send events for our loop
      const eventLoopId = (event.data as any)?.loopId;
      if (eventLoopId && eventLoopId !== this.config.loopId) {
        return;
      }

      this.broadcastEvent(event);
    });
  }

  private broadcastEvent(event: LoopEvent): void {
    const data = JSON.stringify(event);
    const message = `data: ${data}\n\n`;

    this.sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('Error sending SSE message:', error);
        this.sseClients.delete(client);
      }
    });
  }

  private sendKeepAlive(): void {
    const message = ': keepalive\n\n';
    this.sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        this.sseClients.delete(client);
      }
    });
  }

  private sendLoopState(client: express.Response): void {
    try {
      const loopState = this.getLoopState();
      const event = {
        type: 'loop_state',
        timestamp: new Date().toISOString(),
        data: loopState
      };

      client.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('Error sending initial loop state:', error);
    }
  }

  private getLoopState(): any {
    const stmt = this.db.prepare(`
      SELECT * FROM ralph_loops WHERE loopId = ?
    `);

    const loop = stmt.get(this.config.loopId);
    return loop || null;
  }

  private recordAbortSignal(): void {
    const stmt = this.db.prepare(`
      INSERT INTO ralph_loop_signals (signalId, loopId, signalType, triggeredBy, triggeredAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    const signalId = `signal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    stmt.run(signalId, this.config.loopId, 'abort', 'dashboard', new Date().toISOString());
  }

  private checkInactivity(): void {
    const now = Date.now();
    const inactivityThreshold = 60 * 60 * 1000; // 1 hour

    // Check if no clients and loop is complete
    if (this.sseClients.size === 0 && (now - this.lastClientActivity) > inactivityThreshold) {
      const loopState = this.getLoopState();
      if (loopState && ['PASS', 'EXHAUSTED', 'ABORTED', 'TIMEOUT'].includes(loopState.status)) {
        console.log(`Dashboard server self-terminating due to inactivity`);
        this.stop();
      }
    }
  }

  private generateDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ralph Loop Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #2563eb;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .status-running { background: #fbbf24; color: #92400e; }
        .status-pass { background: #10b981; color: white; }
        .status-fail { background: #ef4444; color: white; }
        .status-timeout { background: #6b7280; color: white; }
        .progress-section {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: #2563eb;
            transition: width 0.3s ease;
        }
        .iterations-section {
            padding: 20px;
        }
        .iteration {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #f9fafb;
        }
        .iteration.pass { border-color: #10b981; background: #ecfdf5; }
        .iteration.fail { border-color: #ef4444; background: #fef2f2; }
        .iteration.running { border-color: #fbbf24; background: #fffbeb; }
        .assertion {
            margin: 5px 0;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
        }
        .assertion.pass { background: #dcfce7; color: #166534; }
        .assertion.fail { background: #fecaca; color: #991b1b; }
        .assertion.warn { background: #fef3c7; color: #92400e; }
        .assertion.running { background: #e0e7ff; color: #3730a3; }
        .actions {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        .btn-danger:hover {
            background: #dc2626;
        }
        .btn-danger:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .countdown {
            color: #6b7280;
            font-style: italic;
            margin-top: 10px;
        }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔁 Ralph Loop</h1>
            <div>
                <span class="status-badge" id="status-badge">Loading...</span>
                <span id="timer" style="margin-left: 10px; font-size: 0.9rem;">⏱ --:--</span>
            </div>
        </div>

        <div class="progress-section">
            <div id="workflow-info">
                <strong>Workflow:</strong> <span id="workflow-slug">Loading...</span>
            </div>
            <div style="margin: 10px 0;">
                <strong>Iteration <span id="current-iteration">0</span> / <span id="max-iterations">5</span></strong>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
        </div>

        <div class="iterations-section">
            <h3>Iteration Results</h3>
            <div id="iterations-container">
                <!-- Iterations will be added here dynamically -->
            </div>
        </div>

        <div class="actions">
            <button class="btn btn-danger" id="abort-btn" onclick="abortLoop()">⏹ Abort Loop</button>
            <div class="countdown hidden" id="countdown">Loop complete — this window will close in <span id="countdown-timer">60</span> seconds</div>
        </div>
    </div>

    <script>
        let eventSource;
        let loopData = {};
        let iterations = {};

        function initDashboard() {
            const token = new URLSearchParams(window.location.search).get('token');
            if (!token) {
                document.body.innerHTML = '<div style="text-align:center;margin-top:100px;"><h1>Unauthorized</h1></div>';
                return;
            }

            // Connect to SSE endpoint
            eventSource = new EventSource('/events?token=' + token);

            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleLoopEvent(data);
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            eventSource.onerror = function(error) {
                console.error('SSE error:', error);
            };

            // Update timer every second
            setInterval(updateTimer, 1000);
        }

        function handleLoopEvent(event) {
            console.log('Loop event:', event);

            switch (event.type) {
                case 'loop_state':
                    loopData = event.data;
                    updateDashboard();
                    break;
                case 'loop_started':
                    loopData = event.data;
                    updateDashboard();
                    break;
                case 'iteration_started':
                    updateIteration(event.data.iterationNumber, 'running');
                    break;
                case 'assertion_result':
                    updateAssertion(event.data);
                    break;
                case 'iteration_complete':
                    updateIteration(event.data.iterationNumber, event.data.status, event.data);
                    break;
                case 'loop_complete':
                case 'loop_aborted':
                case 'loop_timeout':
                    loopData.status = event.data.status || event.type.replace('loop_', '').toUpperCase();
                    updateDashboard();
                    startCountdown();
                    break;
            }
        }

        function updateDashboard() {
            if (!loopData) return;

            document.getElementById('workflow-slug').textContent = loopData.workflowSlug || 'Unknown';
            document.getElementById('current-iteration').textContent = loopData.currentIteration || 0;
            document.getElementById('max-iterations').textContent = loopData.maxIterations || 5;

            const status = loopData.status || 'UNKNOWN';
            const statusBadge = document.getElementById('status-badge');
            statusBadge.textContent = status;
            statusBadge.className = 'status-badge status-' + status.toLowerCase();

            // Update progress bar
            const current = loopData.currentIteration || 0;
            const max = loopData.maxIterations || 5;
            const progress = (current / max) * 100;
            document.getElementById('progress-fill').style.width = progress + '%';

            // Disable abort button if loop is complete
            const isComplete = ['PASS', 'EXHAUSTED', 'ABORTED', 'TIMEOUT'].includes(status);
            document.getElementById('abort-btn').disabled = isComplete;
        }

        function updateIteration(iterationNumber, status, data) {
            const container = document.getElementById('iterations-container');
            const id = 'iteration-' + iterationNumber;
            let iterationEl = document.getElementById(id);

            if (!iterationEl) {
                iterationEl = document.createElement('div');
                iterationEl.id = id;
                iterationEl.className = 'iteration';
                container.appendChild(iterationEl);
            }

            let content = '<h4>Iteration ' + iterationNumber + ' — ';
            if (status === 'running') {
                content += 'In Progress</h4>';
                iterationEl.className = 'iteration running';
            } else if (status === 'PASS') {
                content += 'Passed (' + (data.passCount || 0) + '/' + ((data.passCount || 0) + (data.failCount || 0)) + ' assertions)</h4>';
                iterationEl.className = 'iteration pass';
            } else if (status === 'FAIL') {
                content += 'Failed (' + (data.passCount || 0) + '/' + ((data.passCount || 0) + (data.failCount || 0)) + ' assertions)</h4>';
                iterationEl.className = 'iteration fail';
            }

            content += '<div id="assertions-' + iterationNumber + '"></div>';
            iterationEl.innerHTML = content;
        }

        function updateAssertion(data) {
            const assertionsEl = document.getElementById('assertions-' + data.iterationNumber);
            if (!assertionsEl) return;

            const assertionEl = document.createElement('div');
            assertionEl.className = 'assertion ' + data.status.toLowerCase();

            const statusIcon = data.status === 'PASS' ? '✅' : data.status === 'FAIL' ? '❌' : '⚠️';
            assertionEl.innerHTML = statusIcon + ' ' + data.assertionType + ' — ' + data.message;

            assertionsEl.appendChild(assertionEl);
        }

        function updateTimer() {
            if (!loopData.startedAt) return;

            const start = new Date(loopData.startedAt);
            const now = new Date();
            const diff = Math.floor((now - start) / 1000);

            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);

            document.getElementById('timer').textContent =
                '⏱ ' + hours + 'h ' + minutes + 'm';
        }

        function abortLoop() {
            if (confirm('Are you sure you want to abort the Ralph Loop?')) {
                const token = new URLSearchParams(window.location.search).get('token');
                fetch('/abort?token=' + token, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('abort-btn').disabled = true;
                        document.getElementById('abort-btn').textContent = 'Abort Requested...';
                    } else {
                        alert('Failed to abort loop: ' + data.error);
                    }
                })
                .catch(error => {
                    alert('Error aborting loop: ' + error.message);
                });
            }
        }

        function startCountdown() {
            let seconds = 60;
            const countdownEl = document.getElementById('countdown');
            const timerEl = document.getElementById('countdown-timer');

            countdownEl.classList.remove('hidden');
            document.getElementById('abort-btn').style.display = 'none';

            const interval = setInterval(() => {
                seconds--;
                timerEl.textContent = seconds;

                if (seconds <= 0) {
                    clearInterval(interval);
                    window.close();
                }
            }, 1000);
        }

        // Initialize dashboard when page loads
        initDashboard();
    </script>
</body>
</html>`;
  }
}