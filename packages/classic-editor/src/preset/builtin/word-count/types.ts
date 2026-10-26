/** Mergeable counting facts of one node's serialized plain text. */
export interface ClassicWordCountSummary {
  /** Non-whitespace code points, the Chinese counting unit. */
  readonly characters: number;
  /** Maximal runs of non-whitespace code points, the word counting unit. */
  readonly runs: number;
  /** Whether the serialized text is empty, so it neither joins nor separates neighbors. */
  readonly empty: boolean;
  /** Whether the text starts with a non-whitespace code point. */
  readonly leadingWord: boolean;
  /** Whether the text ends with a non-whitespace code point. */
  readonly trailingWord: boolean;
}
