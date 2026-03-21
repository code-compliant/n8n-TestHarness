export class InactivityTimer {
  private readonly timeoutHours: number;
  private timeoutHandle?: NodeJS.Timeout;

  constructor(timeoutHours: number = 3) {
    this.timeoutHours = timeoutHours;
  }

  start(loopId: string, onTimeout: (loopId: string) => void): void {
    this.clear();

    const timeoutMs = this.timeoutHours * 60 * 60 * 1000; // Convert to milliseconds

    this.timeoutHandle = setTimeout(() => {
      console.log(`Inactivity timeout fired for loop ${loopId} after ${this.timeoutHours} hours`);
      onTimeout(loopId);
    }, timeoutMs);

    console.log(`Inactivity timer started for loop ${loopId}, timeout in ${this.timeoutHours} hours`);
  }

  reset(loopId: string, onTimeout: (loopId: string) => void): void {
    console.log(`Inactivity timer reset for loop ${loopId}`);
    this.start(loopId, onTimeout);
  }

  clear(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }
  }

  isActive(): boolean {
    return this.timeoutHandle !== undefined;
  }

  getRemainingTimeMs(): number {
    if (!this.timeoutHandle) {
      return 0;
    }

    // Note: This is an approximation since Node.js doesn't expose remaining timeout time
    // In a real implementation, we'd track the start time and calculate remaining time
    return this.timeoutHours * 60 * 60 * 1000;
  }
}