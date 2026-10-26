/** Neutral metric properties supplied in inheritance order by a document adapter. */
export interface QuireTextMetricStyle {
  /** Explicit participation in the container's character grid; absence inherits. */
  readonly characterGrid?: boolean | undefined;
  /** Signed CSS px/pt spacing, independent of glyph-width scaling. */
  readonly letterSpacing?: string | undefined;
  /** Vertical baseline displacement relative to the final font size. */
  readonly baselineShiftEm?: number | undefined;
  /** Positive finite horizontal glyph-width ratio. */
  readonly horizontalScale?: number | undefined;
}

/** Resolved metrics before a script-specific font is selected. */
export interface QuireResolvedTextMetricStyle {
  /** Last explicit character-grid participation override. */
  readonly characterGrid?: boolean | undefined;
  /** Signed spacing in CSS pixels; omitted when no valid value was declared. */
  readonly letterSpacing?: number | undefined;
  /** Last valid em displacement, including explicit zero to reset inheritance. */
  readonly baselineShiftEm?: number | undefined;
  /** Last valid horizontal ratio, including explicit one to reset inheritance. */
  readonly horizontalScale?: number | undefined;
}
