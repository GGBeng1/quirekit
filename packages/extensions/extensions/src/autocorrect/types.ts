/** One replacement typed text turns into. */
export interface AutoCorrectEntry {
  /** Text as typed, matched without regard to ASCII letter case. */
  readonly from: string;
  /** Replacement text. */
  readonly to: string;
}

/** The person's AutoCorrect choices. */
export interface AutoCorrectSettings {
  /** Replace text as you type from the replacement table. */
  readonly replaceText: boolean;
  /** Capitalize the first letter of sentences. */
  readonly capitalizeSentences: boolean;
  /** Replacement table. */
  readonly entries: readonly AutoCorrectEntry[];
}

/** Host persistence for AutoCorrect settings. */
export interface AutoCorrectSettingsStore {
  /** @returns Saved settings, or null to use the defaults. */
  load(): AutoCorrectSettings | null;
  /** @param settings - Settings to keep. */
  save(settings: AutoCorrectSettings): void;
}

/** Options of the AutoCorrect extension. */
export interface AutoCorrectOptions {
  /** Settings used when the store has none. */
  readonly defaults: AutoCorrectSettings;
  /** Abbreviations after which the next word is not capitalized, such as "e.g.". */
  readonly firstLetterExceptions: readonly string[];
  /** Optional persistence. */
  readonly store: AutoCorrectSettingsStore | null;
}

/** Editor-local AutoCorrect state. */
export interface AutoCorrectStorage {
  /** Current settings. */
  settings: AutoCorrectSettings;
}

/** A correction found at the caret. */
export interface AutoCorrectMatch {
  /** Characters before the caret, including the typed text, that the correction replaces. */
  readonly length: number;
  /** Text that replaces them. */
  readonly replacement: string;
}
