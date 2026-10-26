import type {
  QuireImeBeforeInputEvent,
  QuireImeCompositionEvent,
  QuireImeEventResult,
  QuireImeInputEngineOptions,
  QuireImeInputEvent,
  QuireImeKeyboardEvent
} from "../types";
import {
  handleQuireImeCompositionEnd,
  handleQuireImeCompositionStart,
  handleQuireImeCompositionUpdate
} from "./composition-handlers";
import {
  defaultDedupeWindowMs,
  defaultPostCompositionKeyGuardMs
} from "./constants";
import {
  handleQuireImeBeforeInput,
  handleQuireImeBlur,
  handleQuireImeInput,
  handleQuireImeKeyDown
} from "./input-handlers";
import type { QuireImeEngineRuntime } from "./runtime";
import {
  createQuireImeEngineState,
  type QuireImeEngineState
} from "./state";

/** Tracks IME composition across browser event ordering differences. */
export class QuireImeInputEngine {
  private readonly dedupeWindowMs: number;
  private readonly postCompositionKeyGuardMs: number;
  private readonly now: () => number;
  private readonly state: QuireImeEngineState;

  /**
   * Creates an IME input engine.
   *
   * @param options - Engine timing and clock options.
   */
  constructor(options: QuireImeInputEngineOptions = {}) {
    this.dedupeWindowMs = options.dedupeWindowMs ?? defaultDedupeWindowMs;
    this.postCompositionKeyGuardMs =
      options.postCompositionKeyGuardMs ?? defaultPostCompositionKeyGuardMs;
    this.now = options.now ?? Date.now;
    this.state = createQuireImeEngineState();
  }

  /**
   * Starts a browser composition session without mutating the document.
   *
   * @param event - Browser composition start payload.
   * @returns IME state update for the host surface.
   */
  handleCompositionStart(event: QuireImeCompositionEvent = {}): QuireImeEventResult {
    return handleQuireImeCompositionStart(this.getRuntime(), event);
  }

  /**
   * Updates the visible preedit text for an active composition session.
   *
   * @param event - Browser composition update payload.
   * @returns IME state update for the host surface.
   */
  handleCompositionUpdate(event: QuireImeCompositionEvent): QuireImeEventResult {
    return handleQuireImeCompositionUpdate(this.getRuntime(), event);
  }

  /**
   * Finalizes the current composition session and returns text to commit once.
   *
   * @param event - Browser composition end payload.
   * @returns IME commit result for the host surface.
   */
  handleCompositionEnd(event: QuireImeCompositionEvent): QuireImeEventResult {
    return handleQuireImeCompositionEnd(this.getRuntime(), event);
  }

  /**
   * Handles a browser beforeinput event before normal editor mutation logic.
   *
   * @param event - Browser beforeinput payload.
   * @returns IME handling result for the host surface.
   */
  handleBeforeInput(event: QuireImeBeforeInputEvent): QuireImeEventResult {
    return handleQuireImeBeforeInput(this.getRuntime(), event);
  }

  /**
   * Handles keyboard events that belong to active or recently ended IME sessions.
   *
   * @param event - Browser keyboard payload.
   * @returns IME handling result for the host surface.
   */
  handleKeyDown(event: QuireImeKeyboardEvent): QuireImeEventResult {
    return handleQuireImeKeyDown(this.getRuntime(), event);
  }

  /**
   * Handles browser input events after the input host value has changed.
   *
   * @param event - Browser input payload.
   * @returns IME handling result for the host surface.
   */
  handleInput(event: QuireImeInputEvent): QuireImeEventResult {
    return handleQuireImeInput(this.getRuntime(), event);
  }

  /**
   * Clears transient IME state when the input host loses focus.
   *
   * @returns IME reset result for the host surface.
   */
  handleBlur(): QuireImeEventResult {
    return handleQuireImeBlur(this.getRuntime());
  }

  /**
   * Creates the runtime view passed to event handlers.
   *
   * @returns Runtime services for one handler invocation.
   */
  private getRuntime(): QuireImeEngineRuntime {
    return {
      state: this.state,
      dedupeWindowMs: this.dedupeWindowMs,
      postCompositionKeyGuardMs: this.postCompositionKeyGuardMs,
      now: this.now
    };
  }
}

/**
 * Creates a reusable IME input engine for canvas, SVG, or DOM-backed surfaces.
 *
 * @param options - Engine timing and clock options.
 * @returns A new IME input engine.
 */
export function createQuireImeInputEngine(
  options?: QuireImeInputEngineOptions
): QuireImeInputEngine {
  return new QuireImeInputEngine(options);
}
