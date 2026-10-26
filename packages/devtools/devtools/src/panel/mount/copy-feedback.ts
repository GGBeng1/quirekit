import type { QuireDevtoolsPanelCopyState } from "../types";

/** Copy feedback controller used by the mounted panel. */
export interface QuireDevtoolsCopyFeedback {
  /** Current copy feedback state. */
  readonly state: QuireDevtoolsPanelCopyState | undefined;
  /**
   * Copies text and updates feedback state.
   *
   * @param text - Text to copy.
   */
  copy(text: string): Promise<void>;
  /** Clears pending timers. */
  destroy(): void;
}

/**
 * Creates a copy feedback controller.
 *
 * @param onChange - Callback invoked after feedback state changes.
 * @returns Copy feedback controller.
 */
export function createCopyFeedback(onChange: () => void): QuireDevtoolsCopyFeedback {
  let state: QuireDevtoolsPanelCopyState | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Clears any scheduled feedback reset.
   */
  function clearTimer(): void {
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    timer = undefined;
  }

  /**
   * Schedules feedback reset after a short delay.
   */
  function clearLater(): void {
    clearTimer();
    timer = setTimeout(() => {
      state = undefined;
      onChange();
    }, 1200);
  }

  /**
   * Copies text and updates feedback state.
   *
   * @param text - Text to copy.
   */
  async function copy(text: string): Promise<void> {
    try {
      await globalThis.navigator?.clipboard?.writeText(text);
      state = "copied";
    } catch {
      state = "failed";
    }

    onChange();
    clearLater();
  }

  return {
    get state() {
      return state;
    },
    copy,
    destroy: clearTimer
  };
}
