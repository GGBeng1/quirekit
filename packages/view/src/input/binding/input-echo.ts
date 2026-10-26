const inputEchoDedupeWindowMs = 100;

/** Recently handled text insertion that may still echo through a following input event. */
interface PendingInputEcho {
  /** Text that was already applied to the editor. */
  readonly text: string;
  /** Timestamp when the text was applied. */
  readonly timestamp: number;
}

/** Tracks recently handled text to suppress duplicate native input echo events. */
export class QuirePendingInputEchoTracker {
  private pendingInputEcho: PendingInputEcho | null = null;

  /**
   * Remembers text that may be reported again by a following native input event.
   *
   * @param text - Text that was just applied through beforeinput or compositionend.
   */
  remember(text: string | null | undefined): void {
    if (!text || text.length === 0) {
      return;
    }

    this.pendingInputEcho = {
      text,
      timestamp: Date.now()
    };
  }

  /**
   * Consumes an input event that only echoes text already handled by another event.
   *
   * @param text - Current input proxy value reported by the browser input event.
   * @returns Whether the input event should be ignored as an echo.
   */
  consume(text: string): boolean {
    const pendingInputEcho = this.pendingInputEcho;

    if (!pendingInputEcho) {
      return false;
    }

    this.pendingInputEcho = null;

    if (Date.now() - pendingInputEcho.timestamp > inputEchoDedupeWindowMs) {
      return false;
    }

    return pendingInputEcho.text === text;
  }

  /** Clears any pending echo entry. */
  clear(): void {
    this.pendingInputEcho = null;
  }
}
