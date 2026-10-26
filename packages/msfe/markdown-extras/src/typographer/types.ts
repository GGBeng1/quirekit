/** Optional source-neutral text presentation; the default Markdown dialect stays unchanged. */
export interface TypographerOptions {
  /** Copyright/trademark, punctuation runs and typographic dashes. */
  readonly replacements: boolean;
  /** Paired straight quotes and prose apostrophes. */
  readonly smartQuotes: boolean;
  /** Opening/closing double quote, then opening/closing single quote. */
  readonly quotes: readonly [string, string, string, string];
  /** Maximum UTF-16 units inspected per visible inline block; larger blocks retain source. */
  readonly maxBlockLength: number;
}

/** Ephemeral plain-text gap in the already accepted Markdown tree. */
export interface TypographyRun {
  /** Canonical source position. */
  readonly from: number;
  /** Exact source text, never normalized in the persistent document. */
  readonly text: string;
  /** Existing semantic inline nesting level. */
  readonly depth: number;
}

/** One non-newline replacement mapped directly to source. */
export interface TypographyEdit {
  /** Inclusive source start. */
  readonly from: number;
  /** Exclusive source end. */
  readonly to: number;
  /** Literal display text. */
  readonly text: string;
}

/** Actual computation counts for the current accepted syntax tree. */
export interface TypographerWork {
  /** Plain-text block matching passes, excluding cache hits. */
  readonly blocks: number;
  /** Canonical UTF-16 units read for matching. */
  readonly textUnits: number;
}
