import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import type { QuireSourceFlowClip } from "../source-flow";
import { createQuireTableBodyCellSourceFlowSlice } from "./cell-slice";
import { filterQuireTableRowsCoveredByCell } from "../table/row-coverage";
import { createQuireSplitTablePartId } from "../table/part-ids";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Options for projecting normal table body cells into one page. */
export interface QuireTableBodyCellsPageProjectionOptions {
  /** Source table body cells in infinite-flow coordinates. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Page-owned body rows already projected into source-flow page space. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Page document range represented by the page fragment. */
  readonly pageRange: QuireDocumentRange;
  /** Source-flow band accepted by the page body. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page-body projection used to suffix split ids. */
  readonly projection: QuirePageBodyProjection;
}

/**
 * Projects normal table body cell fragments into one page band.
 *
 * @param options - Source cells, projected rows, page range, source-flow clip, and projection.
 * @returns Page-owned table body cell fragments.
 */
export function projectQuireTableBodyCellsToPage(
  options: QuireTableBodyCellsPageProjectionOptions
): readonly QuireTableCellFragment[] {
  return options.cells.flatMap((cell) => {
    const coveredRows = findQuireTableCellProjectedRows(cell, options.rows);

    return coveredRows.length === 0
      ? []
      : projectQuireTableCellFragment(
          cell,
          options.pageRange,
          options.flowClip,
          options.projection,
          coveredRows
        );
  });
}

/**
 * Projects one cell fragment when it belongs to a projected row.
 *
 * @param cell - Source cell fragment in flow coordinates.
 * @param pageRange - Document range owned by the page.
 * @param flowClip - Flow-space page bounds.
 * @param projection - Page-body projection being applied.
 * @param coveredRows - Page-local row fragments visually covered by the cell.
 * @returns Page-local cell fragment candidates.
 */
function projectQuireTableCellFragment(
  cell: QuireTableCellFragment,
  pageRange: QuireDocumentRange,
  flowClip: QuireSourceFlowClip,
  projection: QuirePageBodyProjection,
  coveredRows: readonly QuireTableRowFragment[]
): readonly QuireTableCellFragment[] {
  const slice = createQuireTableBodyCellSourceFlowSlice(
    cell,
    pageRange,
    flowClip,
    coveredRows
  );

  if (slice === null) {
    return [];
  }

  return [{
    ...cell,
    id: createQuireSplitTablePartId(
      cell.id,
      cell.range,
      pageRange,
      resolveQuireProjectionOccurrence(projection)
    ),
    range: slice.range,
    rect: slice.rect,
    contentRect: slice.contentRect,
    cellSourceFlowY: slice.cellSourceFlowY,
    cellSourceFlowHeight: slice.cellSourceFlowHeight,
    ...(slice.contentLayoutRect === undefined
      ? {}
      : { contentLayoutRect: slice.contentLayoutRect })
  }];
}

/**
 * Finds projected rows visually covered by one table cell.
 *
 * @param cell - Cell fragment to inspect.
 * @param rows - Page-local body row fragments.
 * @returns Body rows covered by the cell's grid rectangle.
 */
function findQuireTableCellProjectedRows(
  cell: QuireTableCellFragment,
  rows: readonly QuireTableRowFragment[]
): readonly QuireTableRowFragment[] {
  return filterQuireTableRowsCoveredByCell(cell, rows);
}
