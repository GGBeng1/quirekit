import type { EditorState } from "@quirekit/pm";

/** Character rewrite offered by the Word "Change Case" menu. */
export type TextCaseMode =
  | "sentence"
  | "lower"
  | "upper"
  | "capitalize"
  | "toggle"
  | "halfwidth"
  | "fullwidth";

/**
 * Host rule deciding whether the text in one range may be rewritten.
 *
 * @param state - Committed editor state.
 * @param from - Range start.
 * @param to - Range end.
 * @returns Whether the range may change.
 */
export type TextCaseChangeableCheck = (state: EditorState, from: number, to: number) => boolean;

/** Options for the change-case capability. */
export interface TextCaseOptions {
  /** Host rule for text that must keep its characters, such as field results. */
  readonly checkChangeable: TextCaseChangeableCheck | null;
}

/** Retained Shift+F3 cycle position. */
export interface TextCaseStorage {
  /** Document produced by the latest cycle step, or null. */
  lastCycleDocument: unknown;
  /** Mode applied by the latest cycle step. */
  lastCycleMode: TextCaseMode | null;
}

/** One character of a textblock with its rewrite eligibility. */
export interface TextCaseUnit {
  /** Source character (one code point). */
  readonly char: string;
  /** Document position of the character, or -1 for a word separator. */
  readonly pos: number;
  /** Whether the character is selected and may be rewritten. */
  readonly target: boolean;
}

/** Change-case command methods. */
export type TextCaseCommandMethods<ReturnType> = {
  /** Rewrites the selected characters (or the word at the caret) in one mode. */
  changeTextCase: (mode: TextCaseMode) => ReturnType;
  /** Advances the Shift+F3 cycle: lowercase, UPPERCASE, Capitalize Each Word. */
  cycleTextCase: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the change-case extension. */
    readonly textCase: TextCaseCommandMethods<ReturnType>;
  }
}
