/**
 * Debounce timer that still fires within a longest wait while calls keep arriving.
 */
export class ProofingTimer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private waitingSince: number | null = null;

  /**
   * @param maxWaitMs - Longest delay since the first pending call.
   * @param fire - Callback run when the timer elapses.
   */
  constructor(private readonly maxWaitMs: number, private readonly fire: () => void) {}

  /**
   * Whether a callback is pending.
   *
   * @returns Whether the timer is armed.
   */
  get armed(): boolean {
    return this.timer !== null;
  }

  /**
   * Re-arms the timer, never beyond the longest wait.
   *
   * @param delay - Requested delay.
   */
  arm(delay: number): void {
    const now = Date.now();
    this.waitingSince ??= now;
    const remaining = Math.max(0, this.maxWaitMs - (now - this.waitingSince));
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.waitingSince = null;
      this.fire();
    }, Math.min(delay, remaining));
  }

  /** Cancels a pending callback. */
  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.waitingSince = null;
  }
}
