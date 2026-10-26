/** Options used to measure one horizontal Unicode text run. */
export interface OFDTextMeasureOptions {
  /** Font size in millimetres. */
  readonly size: number;
  /** Additional spacing after every code point except the last, in millimetres. */
  readonly letterSpacing?: number;
}

/** Measured fixed-layout geometry for one horizontal Unicode text run. */
export interface OFDTextMeasurement {
  /** Per-code-point horizontal advances in millimetres. */
  readonly advances: readonly number[];
  /** Total horizontal span in millimetres. */
  readonly width: number;
  /** Font ascent above the baseline in millimetres. */
  readonly ascent: number;
  /** Font descent below the baseline in millimetres. */
  readonly descent: number;
}

/** Options used to create one explicitly positioned horizontal `TextCode`. */
export interface OFDTextCodeLayoutOptions extends OFDTextMeasureOptions {
  /** Initial local X coordinate in millimetres. */
  readonly x: number;
  /** Initial local Y coordinate in millimetres. */
  readonly y: number;
}
