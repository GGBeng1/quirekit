import type { ProofingMeta } from "../plugin/types";

/**
 * Holds the session's own updates while the user is editing.
 *
 * Results that arrive mid-typing would repaint underlines between keystrokes;
 * they are queued until the document has been quiet for the debounce period
 * and then applied together in one transaction.
 */
export class ProofingDispatchGate {
  private readonly queue: ProofingMeta[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastEditAt = Number.NEGATIVE_INFINITY;

  /**
   * @param quietMs - Quiet period after the last edit.
   * @param flush - Applies queued updates in order.
   */
  constructor(private readonly quietMs: number, private readonly flush: (metas: readonly ProofingMeta[]) => void) {}

  /**
   * Whether updates are waiting, which means plugin state lags behind the session.
   *
   * @returns Whether the queue is non-empty.
   */
  get pending(): boolean {
    return this.queue.length > 0;
  }

  /** Records a document edit, postponing queued updates. */
  noteEdit(): void {
    this.lastEditAt = Date.now();
    if (this.queue.length > 0) this.arm();
  }

  /**
   * Applies an update now when the user is idle, otherwise after the quiet period.
   *
   * @param meta - Session update.
   */
  push(meta: ProofingMeta): void {
    this.queue.push(meta);
    if (Date.now() - this.lastEditAt >= this.quietMs) this.release();
    else this.arm();
  }

  /** Drops queued updates and stops the timer. */
  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.queue.length = 0;
  }

  /** Waits out the rest of the quiet period. */
  private arm(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    const remaining = Math.max(0, this.quietMs - (Date.now() - this.lastEditAt));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.release();
    }, remaining);
  }

  /** Applies every queued update. */
  private release(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const metas = this.queue.splice(0);
    if (metas.length > 0) this.flush(metas);
  }
}
