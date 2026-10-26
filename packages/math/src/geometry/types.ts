import type { MathCaret } from '../visual/types';

/** Rectangle in a consumer's scrollable surface, in CSS pixels. */
export interface MathSurfaceRect {
  /** Horizontal content offset. */
  readonly left: number;
  /** Vertical content offset. */
  readonly top: number;
  /** Logical width without decorations. */
  readonly width: number;
  /** Logical height without decorations. */
  readonly height: number;
}
/** A structural slot projected from one retained layout into surface coordinates. */
export interface MathSurfaceSlot {
  /** Stable structural identity. */
  readonly id: string;
  /** Slot content box. */
  readonly rect: MathSurfaceRect;
  /** Complete immediate children, in source order. */
  readonly children: readonly MathSurfaceRect[];
  /** Logical insertion boundaries. */
  readonly boundaries: readonly number[];
  /** Empty-slot caret center. */
  readonly emptyCenter?: number;
  /** Owning child for atomic cross-slot selection. */
  readonly parent?: MathCaret;
}
/** Explicit em-to-surface projection; DOM, canvas and SVG consumers choose its origin. */
export interface MathGeometryProjection {
  /** Graphic's left edge in surface content pixels. */
  readonly left: number;
  /** Graphic's top edge in surface content pixels. */
  readonly top: number;
  /** Horizontal CSS pixels per formula em. */
  readonly scaleX: number;
  /** Vertical CSS pixels per formula em; defaults to scaleX. */
  readonly scaleY?: number;
}
/** Custom cursor dimensions, independent of any stylesheet. */
export interface MathOverlayOptions {
  /** Minimum caret height in CSS pixels; defaults to 14. */
  readonly minCaretHeight?: number;
  /** Maximum caret height in CSS pixels; defaults to 40. */
  readonly maxCaretHeight?: number;
  /** Caret width in CSS pixels; defaults to 1. */
  readonly caretWidth?: number;
}
/** Numeric decorations; the consumer alone chooses how to paint them. */
export interface MathEditorOverlay {
  /** Current argument's box, if matching geometry is available. */
  readonly active?: MathSurfaceRect | undefined;
  /** Insertion cursor, if matching geometry is available. */
  readonly caret?: MathSurfaceRect | undefined;
  /** Complete selected child boxes. */
  readonly selected: readonly MathSurfaceRect[];
}
/** Size bounds for fitting a formula into its surface width. */
export interface MathFitOptions {
  /** Content width available to the formula, in CSS pixels. */
  readonly available: number;
  /** Preferred font size, which is also the largest used, in CSS pixels. */
  readonly base: number;
  /** Smallest font size before the surface scrolls; defaults to 12 and never exceeds `base`. */
  readonly minimum?: number;
}
