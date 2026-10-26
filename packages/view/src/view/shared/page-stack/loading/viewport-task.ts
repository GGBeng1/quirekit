/** Coalesces native viewport work after the browser can paint retained paper. */
export class PageStackViewportTask {
  private frame: number | undefined;
  private task: number | undefined;
  private cancelIdle: (() => void) | undefined;

  /**
   * Binds scheduling to the mounted document's browser.
   * @param window - Browser scheduling owner, absent in static environments.
   * @param run - Prepares visible content or one neighbour; absent mode means synchronous fallback.
   */
  constructor(private readonly window: Window | null, private readonly run: (prefetch?: boolean) => boolean) {}

  /** Queues at most one task; subsequent notifications keep the same paint opportunity. */
  request(): void {
    this.cancelIdle?.();
    this.cancelIdle = undefined;
    const window = this.window;
    if (typeof window?.requestAnimationFrame !== "function" || typeof window.setTimeout !== "function") {
      this.run();
      return;
    }
    if (this.frame !== undefined || this.task !== undefined) return;
    // Cross a complete frame before preparing content. A timer in the first RAF
    // can run before newly exposed compositor tiles have been rasterized.
    this.frame = window.requestAnimationFrame(() => {
      this.frame = window.requestAnimationFrame(() => {
        this.frame = undefined;
        this.task = window.setTimeout(() => {
          this.task = undefined;
          if (this.run(false)) this.scheduleIdle();
        }, 0);
      });
    });
  }

  /** Gives scrolling a quiet interval, then admits at most one new page per idle turn. */
  private scheduleIdle(): void {
    const window = this.window;
    if (window === null) return;
    let active = true;
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      /**
       * Runs one atomic page preparation; insufficient idle time keeps the page queued.
       * @param deadline - Browser budget, absent for the timer fallback.
       */
      const prepare = (deadline?: IdleDeadline): void => {
        if (!active) return;
        active = false;
        this.cancelIdle = undefined;
        if ((deadline !== undefined && deadline.timeRemaining() < 8) || this.run(true)) {
          this.scheduleIdle();
        }
      };
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(prepare);
      } else {
        prepare();
      }
    }, 80);
    this.cancelIdle = () => {
      active = false;
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
    };
  }

  /** Cancels queued work when geometry, explicit interaction, or teardown takes ownership. */
  cancel(): void {
    this.cancelIdle?.();
    this.cancelIdle = undefined;
    if (this.frame !== undefined) this.window?.cancelAnimationFrame(this.frame);
    if (this.task !== undefined) this.window?.clearTimeout(this.task);
    this.frame = undefined;
    this.task = undefined;
  }
}
