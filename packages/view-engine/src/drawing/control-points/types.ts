import type { QuirePoint } from "@quirekit/renderer";

/** Semantic identity of a shape-specific control point. */
export type QuireDrawingControlReference =
  | { readonly kind: "endpoint"; readonly end: "start" | "end" }
  | { readonly kind: "adjustment"; readonly index: number };

/** A shape-specific point before the frame's rotation is applied. */
export interface QuireDrawingControlPoint {
  /** Stable semantic identity used by capture and commit. */
  readonly reference: QuireDrawingControlReference;
  /** Local position after horizontal/vertical reflection. */
  readonly position: QuirePoint;
}
