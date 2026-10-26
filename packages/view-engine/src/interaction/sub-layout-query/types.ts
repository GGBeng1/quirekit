import type { QuireSubLayoutQueryProducts } from "../../layout";
import type { QuirePositionHitTestResult } from "../types";

/** Geometry selected by a hit strategy before target metadata is attached. */
export type QuireSubLayoutPositionGeometry = Pick<
  QuirePositionHitTestResult, "position" | "rect" | "queryOwner" | "viewRegion"
>;

/** Input anchor exposed through one sub-layout query product set. */
export type QuireSubLayoutInputAnchor =
  QuireSubLayoutQueryProducts["inputAnchors"][number];

/** Nearest retained sub-layout caret and its owning query products. */
export interface QuireNearestSubLayoutCaretMatch {
  /** Query products that own the selected caret stop. */
  readonly products: QuireSubLayoutQueryProducts;
  /** Caret stop closest to the queried point. */
  readonly stop: QuireSubLayoutCaretStop;
}

/** Retained sub-layout hit target with the query products that own it. */
export interface QuireSubLayoutHitTargetMatch {
  /** Query products that own the matched hit target and its caret stops. */
  readonly products: QuireSubLayoutQueryProducts;
  /** Best retained hit target for the tested canvas point. */
  readonly target: QuireSubLayoutHitTarget;
}

/** Caret stop exposed through one sub-layout query product set. */
export type QuireSubLayoutCaretStop =
  QuireSubLayoutQueryProducts["caretStops"][number];

/** Selection rectangle exposed through one sub-layout query product set. */
export type QuireSubLayoutSelectionRect =
  QuireSubLayoutQueryProducts["selectionRects"][number];

/** Hit target exposed through one sub-layout query product set. */
export type QuireSubLayoutHitTarget =
  QuireSubLayoutQueryProducts["hitTargets"][number];

/** Text geometry associations belonging to one immutable query-product set. */
export interface QuireSubLayoutTextGeometryIndex {
  /** Exact line fragment owning each Run-sized caret rectangle. */
  readonly rectanglesByStop: ReadonlyMap<QuireSubLayoutCaretStop, QuireSubLayoutSelectionRect>;
  /** All caret occurrences for each text fragment, preserving source bias. */
  readonly stopsByRectangle: ReadonlyMap<QuireSubLayoutSelectionRect, readonly QuireSubLayoutCaretStop[]>;
}
