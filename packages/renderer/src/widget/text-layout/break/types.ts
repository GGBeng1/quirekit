/** Layout-unit role produced by the baseline line-break policy. */
export type QuireTextBreakKind = "word" | "space" | "grapheme" | "hardBreak";

/** Wrap strategy; `none` keeps explicit breaks but does not add soft line breaks. */
export type QuireTextWrapMode = "word" | "anywhere" | "none";

/** Durable line-break metadata attached to one classified segment or unit. */
export interface QuireTextBreakMetadata {
  /** Whether a line may break immediately after this segment or unit. */
  readonly breakAfter: boolean;
  /** Whether this segment glues adjacent text into one non-breaking group. */
  readonly nonBreakingGlue: boolean;
  /** Optional marker to paint when a discretionary break is later accepted. */
  readonly breakMarker?: string | undefined;
}

/** Classification result for one grapheme segment. */
export interface QuireTextBreakInfo extends QuireTextBreakMetadata {
  /** Layout-unit role used by the line breaker. */
  readonly kind: QuireTextBreakKind;
}

/**
 * Strategy object that classifies grapheme segments for line breaking.
 *
 * It is pure text logic — no fonts, geometry, or document positions — so the
 * renderer can own line breaking while staying editor-agnostic. A caller may
 * supply its own policy to tailor punctuation or locale rules.
 */
export interface QuireTextBreaker {
  /** Human-readable policy name for diagnostics and tests. */
  readonly name: string;
  /**
   * Classifies one grapheme segment.
   *
   * @param segment - Grapheme segment to classify.
   * @returns Segment role and durable break metadata.
   */
  readonly describe: (segment: string) => QuireTextBreakInfo;
  /**
   * Merges segment metadata into one unit's metadata value.
   *
   * @param segments - Segment metadata values that form one unit.
   * @returns Metadata describing the combined unit's break behavior.
   */
  readonly merge: (
    segments: readonly QuireTextBreakMetadata[]
  ) => QuireTextBreakMetadata;
}
