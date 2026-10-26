/** Caret blink half-period, tuned to feel like a native text caret. */
export const caretBlinkIntervalMs = 530;

/**
 * Interval that flips a caret between its shown and hidden phases. Carets never
 * blink with an infinite CSS animation: it keeps the page rendering every frame,
 * so WebKit cannot mark layer backing stores purgeable while the editor is focused.
 */
export class CaretBlinkTimer {
  private handle: ReturnType<typeof setInterval> | null = null;

  /**
   * Whether a blink interval is currently scheduled.
   *
   * @returns True while the timer is running.
   */
  get running(): boolean {
    return this.handle !== null;
  }

  /**
   * Restarts the blink interval so the next phase flip is a full period away.
   *
   * @param toggle - Called on every tick to flip the caret phase.
   */
  start(toggle: () => void): void {
    this.stop();
    this.handle = setInterval(toggle, caretBlinkIntervalMs);
  }

  /** Cancels the blink interval if one is running. */
  stop(): void {
    clearInterval(this.handle ?? undefined);
    this.handle = null;
  }
}
