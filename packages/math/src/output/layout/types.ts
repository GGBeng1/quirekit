import type { MathCaret } from '../../visual/types';

/** Rectangle in formula-local em units, with a top-left origin. */
export interface MathLayoutRect {
  /** Horizontal offset from the formula origin. */
  readonly left: number;
  /** Vertical offset from the formula origin. */
  readonly top: number;
  /** Logical width, independent of glyph ink. */
  readonly width: number;
  /** Logical height, independent of glyph ink. */
  readonly height: number;
}
/** Syntax-safe editing geometry produced by the same layout as the graphic. */
export interface MathSlotGeometry {
  /** Structural identity shared with the editing model. */
  readonly id: string;
  /** Complete argument box. */
  readonly rect: MathLayoutRect;
  /** Immediate complete child boxes, in source order. */
  readonly children: readonly MathLayoutRect[];
  /** Logical insertion positions, including zero-ink boundaries. */
  readonly boundaries: readonly number[];
  /** Center of the placeholder for an empty argument. */
  readonly emptyCenter?: number;
  /** Owning complete child in the enclosing argument. */
  readonly parent?: MathCaret;
}
/** Immutable renderer output, usable without a mounted browser document. */
export interface MathFormulaLayout {
  /** Standalone SVG using em dimensions and inherited currentColor. */
  readonly svg: string;
  /** Width in formula-local em units. */
  readonly width: number;
  /** Height in formula-local em units. */
  readonly height: number;
  /** Baseline offset from the top edge, in em units. */
  readonly baseline: number;
  /** Editing geometry; empty for presentation-only output. */
  readonly slots: readonly MathSlotGeometry[];
}
