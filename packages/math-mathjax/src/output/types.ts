/** Explicit dimensions and color for a portable presentation-only SVG image. */
export interface MathSvgExportOptions {
  /** Pixels per em; must be positive and finite. */
  readonly fontSize: number;
  /** Resolved presentation color; defaults to black. */
  readonly color?: string;
}
