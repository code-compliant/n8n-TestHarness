import { spawn, ChildProcess } from 'child_process';
import type Database from 'better-sqlite3';
import type { DashboardServerConfig } from './dashboard-server';

export interface DashboardLaunchOptions {
  loopId: string;
  token: string;
  port?: number;
}

export class DashboardLauncher {
  private readonly db: Database.Database;
  private dashboardProcesses: Map<string, ChildProcess> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
  }

  async launchDashboard(options: DashboardLaunchOptions): Promise<string> {
    const config: DashboardServerConfig = {
      port: options.port || 18942,
      loopId: options.loopId,
      token: options.token
    };

    console.log(`Launching dashboard for loop ${options.loopId} on port ${config.port}`);

    try {
      // In a real implementation, this would spawn the dashboard server as a separate process
      // For this implementation, we'll simulate the process management
      const dashboardProcess = this.spawnDashboardProcess(config);

      this.dashboardProcesses.set(options.loopId, dashboardProcess);

      const dashboardUrl = `http://ralph.5.223.42.54.sslip.io?token=${options.token}`;
      console.log(`Dashboard launched: ${dashboardUrl}`);

      return dashboardUrl;
    } catch (error) {
      console.error(`Failed to launch dashboard for loop ${options.loopId}:`, error);
      throw new Error(`Dashboard launch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async killDashboard(loopId: string): Promise<void> {
    const process = this.dashboardProcesses.get(loopId);

    if (process) {
      console.log(`Killing dashboard process for loop ${loopId}`);

      try {
        // Send SIGTERM for graceful shutdown
        process.kill('SIGTERM');

        // Wait for graceful shutdown, force kill after 10 seconds
        setTimeout(() => {
          if (!process.killed) {
            console.log(`Force killing dashboard process for loop ${loopId}`);
            process.kill('SIGKILL');
          }
        }, 10000);

        this.dashboardProcesses.delete(loopId);
        console.log(`Dashboard process for loop ${loopId} terminated`);
      } catch (error) {
        console.error(`Error killing dashboard process for loop ${loopId}:`, error);
      }
    } else {
      console.log(`No dashboard process found for loop ${loopId}`);
    }
  }

  private spawnDashboardProcess(config: DashboardServerConfig): ChildProcess {
    // In a real implementation, this would spawn a separate Node.js process
    // that runs the dashboard server. For this simulation, we'll create a mock process.

    const scriptPath = this.getDashboardServerScriptPath();
    const env = {
      ...process.env,
      DASHBOARD_PORT: config.port.toString(),
      DASHBOARD_LOOP_ID: config.loopId,
      DASHBOARD_TOKEN: config.token,
      DASHBOARD_DB_PATH: this.getDatabasePath()
    };

    console.log(`Spawning dashboard server script: ${scriptPath}`);
    console.log(`Environment:`, {
      DASHBOARD_PORT: env.DASHBOARD_PORT,
      DASHBOARD_LOOP_ID: env.DASHBOARD_LOOP_ID,
      DASHBOARD_TOKEN: '[REDACTED]'
    });

    // This would normally spawn: node dashboard-server-script.js
    // For now, we'll create a mock process
    const mockProcess = spawn('echo', ['Dashboard server mock process'], { env });

    mockProcess.stdout?.on('data', (data) => {
      console.log(`Dashboard[${config.loopId}]: ${data}`);
    });

    mockProcess.stderr?.on('data', (data) => {
      console.error(`Dashboard[${config.loopId}] error: ${data}`);
    });

    mockProcess.on('close', (code) => {
      console.log(`Dashboard process for loop ${config.loopId} exited with code ${code}`);
      this.dashboardProcesses.delete(config.loopId);
    });

    mockProcess.on('error', (error) => {
      console.error(`Dashboard process error for loop ${config.loopId}:`, error);
      this.dashboardProcesses.delete(config.loopId);
    });

    return mockProcess;
  }

  private getDashboardServerScriptPath(): string {
    // In a real implementation, this would be the path to a standalone dashboard server script
    return 'src/scripts/dashboard-server.js';
  }

  private getDatabasePath(): string {
    // Return the path to the SQLite database file
    // In a real implementation, this would be configurable
    return 'harness.db';
  }

  isDashboardRunning(loopId: string): boolean {
    const process = this.dashboardProcesses.get(loopId);
    return process !== undefined && !process.killed;
  }

  getRunningDashboards(): string[] {
    return Array.from(this.dashboardProcesses.keys());
  }

  async killAllDashboards(): Promise<void> {
    const loopIds = Array.from(this.dashboardProcesses.keys());

    await Promise.all(
      loopIds.map(loopId => this.killDashboard(loopId))
    );

    console.log('All dashboard processes terminated');
  }
}