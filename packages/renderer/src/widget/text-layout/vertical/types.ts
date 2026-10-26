/** Baseline-relative vertical extents in layout coordinates. */
export interface TextLineExtents {
  /** Extent above the baseline. */
  readonly ascent: number;
  /** Extent below the baseline. */
  readonly descent: number;
}

/** Resolved baseline and advance, independent of overflowing glyph ink. */
export interface TextLineVerticalMetrics extends TextLineExtents {
  /** Block-axis advance to the next line. */
  readonly height: number;
}
