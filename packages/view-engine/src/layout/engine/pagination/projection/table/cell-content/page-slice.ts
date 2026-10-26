import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableCellFragment } from "../../../../table";
import {
  createQuireTableCellSliceIdentity,
  type QuireTableCellSliceIdentity
} from "../../../../table/sub-layout";
import { createQuireFlowRectFromProjectedRect } from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";
import { createQuireTableCellContentSourceClip } from "./clip";

/** Page-local table-cell slice exposed as a recursive pagination bridge. */
export interface QuireTableCellPageSliceSummary
  extends QuireTableCellSliceIdentity {
  /** Editable source range represented by the cell fragment. */
  readonly range: QuireTableCellFragment["range"];
  /** Page-local visual clipping rectangle for the full cell framework. */
  readonly visualClip: QuireRect;
  /** Page-local content clipping rectangle used by child flow and editing. */
  readonly contentClip: QuireRect;
  /** Source-flow visual rectangle for the full cell framework. */
  readonly sourceVisualRect: QuireRect;
  /** Source-flow content rectangle accepted by this page-local slice. */
  readonly sourceContentRect: QuireRect;
  /** Source-flow top accepted by this page-local cell content slice. */
  readonly contentSourceFlowY: number;
  /** Source-flow height accepted by this page-local cell content slice. */
  readonly contentSourceFlowHeight: number;
}

/**
 * Summarizes the complete page-local slice owned by one table-cell fragment.
 *
 * This adapter deliberately exposes both the parent-owned visual rectangle and
 * the child-owned content rectangle. Keeping them in one summary prevents paint,
 * recursive child projection, and future interaction geometry from deriving
 * separate page-local clips for the same cell continuation.
 *
 * @param cell - Projected table-cell fragment that owns the page-local slice.
 * @param projection - Page-body projection that produced the cell fragment.
 * @returns Page-local table-cell slice summary.
 */
export function summarizeQuireTableCellPageSlice(
  cell: QuireTableCellFragment,
  projection: QuirePageBodyProjection
): QuireTableCellPageSliceSummary {
  const sourceClip = createQuireTableCellContentSourceClip(cell, projection);

  return {
    ...createQuireTableCellSliceIdentity(cell),
    range: cell.range,
    visualClip: cell.rect,
    contentClip: cell.contentRect,
    sourceVisualRect: createQuireFlowRectFromProjectedRect(cell.rect, projection),
    sourceContentRect: sourceClip.rectClip,
    contentSourceFlowY: sourceClip.flowClip.top,
    contentSourceFlowHeight: sourceClip.flowClip.bottom - sourceClip.flowClip.top
  };
}
