import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableCellFragment } from "../../../../table";
import {
  createQuireFlowRectFromProjectedRect,
  type QuireSourceFlowClip
} from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";

/** Source-flow geometry used to project children inside one table-cell fragment. */
export interface QuireTableCellContentSourceClip {
  /** Vertical source-flow band represented by the page-local cell content window. */
  readonly flowClip: QuireSourceFlowClip;
  /** Full source-flow rectangle represented by the page-local cell content window. */
  readonly rectClip: QuireRect;
}

/**
 * Creates source-flow clipping geometry from a projected table-cell content rect.
 *
 * Table-cell children are laid out in their source container, while the owning
 * cell fragment is already page-local. This helper names the boundary between
 * those spaces so nested layout, hit testing, and future PDF serialization can
 * share the same cell content window.
 *
 * @param cell - Projected table-cell fragment that owns the content window.
 * @param projection - Page-body projection that produced the cell fragment.
 * @returns Source-flow clipping geometry for child projection.
 */
export function createQuireTableCellContentSourceClip(
  cell: QuireTableCellFragment,
  projection: QuirePageBodyProjection
): QuireTableCellContentSourceClip {
  const rectClip = createQuireFlowRectFromProjectedRect(
    cell.contentRect,
    projection
  );
  // The projected content rect already encodes the cell-local source-flow top.
  const sourceFlowHeight = cell.cellSourceFlowHeight ?? rectClip.height;
  const sourceFlowRect = {
    ...rectClip,
    height: sourceFlowHeight
  };

  return {
    flowClip: {
      top: sourceFlowRect.y,
      bottom: sourceFlowRect.y + sourceFlowRect.height
    },
    rectClip: sourceFlowRect
  };
}
