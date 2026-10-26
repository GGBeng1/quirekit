import type { CSSProperties } from 'vue';

/** Independent formula editing decoration layer. */
export interface FormulaOverlayProps {
  /** Active structural slot identity. */
  readonly slot: string;
  /** Active slot rectangle, absent when unfocused. */
  readonly active?: CSSProperties | undefined;
  /** Text insertion rectangle, absent when unfocused. */
  readonly caret?: CSSProperties | undefined;
  /** Complete selected child rectangles. */
  readonly selected: readonly CSSProperties[];
  /** Restarts blink when an accepted selection changes. */
  readonly version: string;
  /** Temporary composition text, never persisted. */
  readonly preedit: string;
  /** Whether IME currently owns the input. */
  readonly composing: boolean;
}
