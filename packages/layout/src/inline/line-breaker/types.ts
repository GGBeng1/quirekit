/** Layout-unit role produced by the baseline line-break policy. */
export type QuireLineBreakUnitKind = "word" | "space" | "grapheme" | "hardBreak";

/** Line-break metadata attached to one measured layout unit. */
export interface QuireLineBreakMetadata {
  /** Whether a line may break immediately after this unit. */
  readonly breakAfter: boolean;
  /** Whether this unit glues adjacent text into one non-breaking group. */
  readonly nonBreakingGlue: boolean;
  /** Optional marker to paint when a discretionary break is later accepted. */
  readonly breakMarker?: string | undefined;
}

/** Classification result for one grapheme segment. */
export interface QuireLineBreakSegmentInfo extends QuireLineBreakMetadata {
  /** Layout-unit role used by the baseline inline breaker. */
  readonly kind: QuireLineBreakUnitKind;
}

/** Strategy object used to classify line-breaking segments for inline layout. */
export interface QuireLineBreakerPolicy {
  /** Human-readable policy name for diagnostics and tests. */
  readonly name: string;
  /**
   * Describes one grapheme segment.
   *
   * @param segment - Grapheme segment to classify.
   * @returns Segment role and durable break metadata.
   */
  readonly describeSegment: (segment: string) => QuireLineBreakSegmentInfo;
  /**
   * Merges segment metadata into one measured layout unit metadata value.
   *
   * @param segments - Segment metadata values that form one measured layout unit.
   * @returns Metadata that describes the break behavior of the combined unit.
   */
  readonly mergeMetadata: (
    segments: readonly QuireLineBreakMetadata[]
  ) => QuireLineBreakMetadata;
  /**
   * Checks whether a grapheme segment is an explicit hard line break.
   *
   * @param segment - Grapheme segment to inspect.
   * @returns Whether the segment should force a new visual line.
   */
  readonly isHardBreakSegment: (segment: string) => boolean;
}
