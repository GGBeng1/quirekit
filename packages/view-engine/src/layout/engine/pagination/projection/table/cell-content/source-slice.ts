import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableCellFragment } from "../../../../table";
import {
  createQuireTableCellSliceIdentity,
  type QuireTableCellSliceIdentity
} from "../../../../table/sub-layout";
import type { QuireSourceFlowClip } from "../../source-flow";

/** Source-flow table-cell slice before final page translation. */
export interface QuireTableCellSourceFlowSliceSummary
  extends QuireTableCellSliceIdentity {
  /** Editable source range represented by the cell fragment. */
  readonly range: QuireTableCellFragment["range"];
  /** Source-flow visual rectangle for the full cell framework. */
  readonly sourceVisualRect: QuireRect;
  /** Source-flow content rectangle accepted by this cell slice. */
  readonly sourceContentRect: QuireRect;
  /** Optional source-flow content layout rectangle accepted by this cell slice. */
  readonly sourceContentLayoutRect?: QuireRect | undefined;
  /** Source-flow vertical band for the full cell framework. */
  readonly visualFlowClip: QuireSourceFlowClip;
  /** Source-flow vertical band for child content. */
  readonly contentFlowClip: QuireSourceFlowClip;
}

/**
 * Summarizes a source-flow table-cell slice before final page translation.
 *
 * Body row, cell, and hit-target projection all start in source-flow space.
 * Naming this slice keeps interaction fallbacks tied to the same accepted cell
 * band that paint will later translate into page-local coordinates.
 *
 * @param cell - Source-flow table-cell fragment accepted by one page body.
 * @returns Source-flow table-cell slice summary.
 */
export function summarizeQuireTableCellSourceFlowSlice(
  cell: QuireTableCellFragment
): QuireTableCellSourceFlowSliceSummary {
  return {
    ...createQuireTableCellSliceIdentity(cell),
    range: cell.range,
    sourceVisualRect: cell.rect,
    sourceContentRect: cell.contentRect,
    ...(cell.contentLayoutRect === undefined
      ? {}
      : { sourceContentLayoutRect: cell.contentLayoutRect }),
    visualFlowClip: createQuireSourceFlowClipFromRect(cell.rect),
    contentFlowClip: createQuireSourceFlowClipFromRect(cell.contentRect)
  };
}

/**
 * Creates a source-flow clip from one rectangle's vertical span.
 *
 * @param rect - Source-flow rectangle.
 * @returns Vertical source-flow clip for the rectangle.
 */
function createQuireSourceFlowClipFromRect(rect: QuireRect): QuireSourceFlowClip {
  return {
    top: rect.y,
    bottom: rect.y + rect.height
  };
}
