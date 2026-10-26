/** Options used to create a reusable IME input engine. */
export interface QuireImeInputEngineOptions {
  /** Milliseconds during which duplicate browser composition commits are suppressed. */
  readonly dedupeWindowMs?: number;
  /** Milliseconds during which post-composition editing keys are guarded. */
  readonly postCompositionKeyGuardMs?: number;
  /** Clock used for deterministic tests and browser event ordering checks. */
  readonly now?: () => number;
}

/** Composition event shape consumed by the reusable IME input engine. */
export interface QuireImeCompositionEvent {
  /** Composition text reported by the browser event. */
  readonly data?: string | null;
  /** Current value of the input host when event data is missing or stale. */
  readonly inputValue?: string | null;
}

/** Beforeinput event shape consumed by the reusable IME input engine. */
export interface QuireImeBeforeInputEvent {
  /** Input Events inputType value describing the requested edit. */
  readonly inputType: string;
  /** Text data associated with the browser input event. */
  readonly data?: string | null;
  /** Whether the browser reports the input as part of IME composition. */
  readonly isComposing?: boolean;
  /** Current value of the input host when event data is missing or stale. */
  readonly inputValue?: string | null;
}

/** Input event shape consumed by the reusable IME input engine. */
export interface QuireImeInputEvent {
  /** Input Events inputType value when the browser exposes it on the input event. */
  readonly inputType?: string | null;
  /** Text data associated with the browser input event when available. */
  readonly data?: string | null;
  /** Whether the browser reports the input as part of IME composition. */
  readonly isComposing?: boolean;
  /** Current value of the input host after the browser input event. */
  readonly inputValue?: string | null;
}

/** Keyboard event shape consumed by the reusable IME input engine. */
export interface QuireImeKeyboardEvent {
  /** KeyboardEvent key value. */
  readonly key: string;
  /** Legacy keyCode value used to detect IME processing keys. */
  readonly keyCode?: number;
  /** Whether the browser reports the key as part of IME composition. */
  readonly isComposing?: boolean;
}

/** Result returned by reusable IME input engine handlers. */
export interface QuireImeEventResult {
  /** Whether the IME engine consumed the event before normal editing logic. */
  readonly handledByIme: boolean;
  /** Whether the caller should prevent the browser's native input edit. */
  readonly preventDefault: boolean;
  /** Whether the caller should clear the input host value after handling. */
  readonly clearInput: boolean;
  /** Whether the caller should preserve the input host value for active composition. */
  readonly preserveInput: boolean;
  /** Finalized text that should be inserted into the editor document. */
  readonly commitText?: string | undefined;
  /** Current visible preedit text that should be rendered by the host surface. */
  readonly preeditText: string;
  /** Whether the engine is currently inside a composition session. */
  readonly isComposing: boolean;
  /** Whether the consumed event duplicated a recently committed composition. */
  readonly duplicateCommit?: boolean | undefined;
}
