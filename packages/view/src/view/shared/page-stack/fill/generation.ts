import type {
  QuirePageStackFillCancel,
  QuirePageStackFillScheduler
} from "./types";

/** Owns abort and cancellation for one scheduled page-stack fill generation. */
export class PageStackFillWorkGeneration {
  private abortController = new AbortController();
  private bridgeCancel: QuirePageStackFillCancel | undefined;
  private passCancel: QuirePageStackFillCancel | undefined;
  private delayCancel: QuirePageStackFillCancel | undefined;

  /** @returns Signal identifying the current scheduled generation. */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Schedules the initial paint bridge when none is pending.
   *
   * @param scheduler - Backend-selected scheduling capabilities.
   * @param callback - Callback receiving the captured generation signal.
   */
  scheduleBridge(
    scheduler: QuirePageStackFillScheduler,
    callback: (signal: AbortSignal) => void
  ): void {
    if (this.bridgeCancel !== undefined) {
      return;
    }

    const signal = this.signal;
    this.bridgeCancel = scheduler.scheduleBridge(() => {
      this.bridgeCancel = undefined;
      callback(signal);
    });
  }

  /**
   * Schedules one backend pass when none is pending.
   *
   * @param scheduler - Backend-selected scheduling capabilities.
   * @param callback - Callback receiving the captured generation signal.
   */
  schedulePass(
    scheduler: QuirePageStackFillScheduler,
    callback: (signal: AbortSignal) => void
  ): void {
    if (this.passCancel !== undefined) {
      return;
    }

    const signal = this.signal;
    this.passCancel = scheduler.schedulePass(() => {
      this.passCancel = undefined;
      callback(signal);
    });
  }

  /**
   * Replaces the pending cooldown with one callback for the current generation.
   *
   * @param scheduler - Backend-selected scheduling capabilities.
   * @param callback - Callback receiving the captured generation signal.
   * @param delayMs - Interaction cooldown in milliseconds.
   */
  scheduleDelay(
    scheduler: QuirePageStackFillScheduler,
    callback: (signal: AbortSignal) => void,
    delayMs: number
  ): void {
    this.cancelDelay();
    const signal = this.signal;
    this.delayCancel = scheduler.scheduleDelay(() => {
      this.delayCancel = undefined;
      callback(signal);
    }, delayMs);
  }

  /** Aborts the generation and cancels every queued callback it owns. */
  invalidate(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
    this.bridgeCancel?.();
    this.passCancel?.();
    this.cancelDelay();
    this.bridgeCancel = undefined;
    this.passCancel = undefined;
  }

  /** Cancels the pending interaction cooldown. */
  private cancelDelay(): void {
    this.delayCancel?.();
    this.delayCancel = undefined;
  }
}
