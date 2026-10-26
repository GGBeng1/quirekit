import type { QuireImeEngineState } from "./state";

/** Runtime services shared by IME event handlers. */
export interface QuireImeEngineRuntime {
  /** Mutable IME engine state. */
  readonly state: QuireImeEngineState;
  /** Duplicate browser commit suppression window in milliseconds. */
  readonly dedupeWindowMs: number;
  /** Keydown guard window after a composition commit in milliseconds. */
  readonly postCompositionKeyGuardMs: number;
  /**
   * Reads the current timestamp.
   *
   * @returns Current timestamp in milliseconds.
   */
  now(): number;
}
