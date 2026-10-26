import {
  intersectQuireDocumentRanges,
  unionQuireDocumentRanges
} from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import {
  createQuireTableCellSliceIdentity,
  type QuireTableCellSliceIdentity
} from "../../../table/sub-layout";
import {
  clipQuireRectToSourceFlowClip,
  intersectQuireSourceFlowClips,
  type QuireSourceFlowClip
} from "../source-flow";
import { createQuireTableRowsFlowClip } from "../table/row-coverage";

/** Source-flow slice accepted for one body cell before page translation. */
export interface QuireTableBodyCellSourceFlowSlice
  extends QuireTableCellSliceIdentity {
  /** Document range represented by the page-local cell slice. */
  readonly range: QuireDocumentRange;
  /** Source-flow band covered by this cell slice and its projected rows. */
  readonly flowClip: QuireSourceFlowClip;
  /** Full source-flow cell rectangle clipped to the accepted row band. */
  readonly rect: QuireTableCellFragment["rect"];
  /** Source-flow content rectangle clipped to the accepted row band. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
  /** Optional source-flow content layout rectangle clipped to the accepted row band. */
  readonly contentLayoutRect?: QuireTableCellFragment["contentLayoutRect"];
  /** Source-flow band covered by the accepted editable cell content. */
  readonly contentFlowClip: QuireSourceFlowClip;
  /** Cell-local content flow top accepted by this slice. */
  readonly cellSourceFlowY: number;
  /** Cell-local content flow height accepted by this slice. */
  readonly cellSourceFlowHeight: number;
}

/**
 * Creates the source-flow cell slice accepted by a page body projection.
 *
 * This is the pre-translation counterpart to the page-local cell slice summary:
 * it binds document range, covered-row band, visual cell rectangle, and content
 * rectangle while everything is still in source-flow coordinates.
 *
 * @param cell - Source body cell in infinite-flow coordinates.
 * @param pageRange - Document range owned by the page.
 * @param flowClip - Source-flow band accepted by the page body.
 * @param coveredRows - Projected body rows visually covered by the cell.
 * @returns Accepted source-flow cell slice, or null when the page owns none.
 */
export function createQuireTableBodyCellSourceFlowSlice(
  cell: QuireTableCellFragment,
  pageRange: QuireDocumentRange,
  flowClip: QuireSourceFlowClip,
  coveredRows: readonly QuireTableRowFragment[]
): QuireTableBodyCellSourceFlowSlice | null {
  const range = intersectQuireDocumentRanges(cell.range, pageRange) ??
    unionQuireDocumentRanges(coveredRows.map((row) => row.range));
  const cellClip = intersectQuireSourceFlowClips(
    flowClip,
    createQuireTableRowsFlowClip(coveredRows)
  );
  const rect = cellClip === null
    ? null
    : clipQuireRectToSourceFlowClip(cell.rect, cellClip);
  const contentRect = cellClip === null
    ? null
    : cell.contentRect.height === 0 && rect !== null
      // A zero-height content band still owns a visible cell frame and border.
      ? { ...cell.contentRect, y: Math.max(rect.y, Math.min(cell.contentRect.y, rect.y + rect.height)) }
      : clipQuireRectToSourceFlowClip(cell.contentRect, cellClip);
  const contentLayoutRect = cell.contentLayoutRect === undefined
    ? undefined
    : cellClip === null
      ? null
      : clipQuireRectToSourceFlowClip(cell.contentLayoutRect, cellClip);

  if (
    range === null ||
    cellClip === null ||
    rect === null ||
    contentRect === null ||
    contentLayoutRect === null
  ) {
    return null;
  }

  return {
    ...createQuireTableCellSliceIdentity(cell),
    range,
    flowClip: cellClip,
    rect,
    contentRect,
    ...(contentLayoutRect === undefined ? {} : { contentLayoutRect }),
    contentFlowClip: {
      top: contentRect.y,
      bottom: contentRect.y + contentRect.height
    },
    cellSourceFlowY: Math.max(0, contentRect.y - cell.contentRect.y),
    cellSourceFlowHeight: contentRect.height
  };
}
