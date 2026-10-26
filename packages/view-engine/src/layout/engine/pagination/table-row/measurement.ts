import { createQuireMeasuredRowLineSlices } from "@quirekit/layout/pagination";
import type { QuireTableRowFragment } from "../../table";
import {
  compareQuireTableCellRowLineSlices,
  type QuireTableCellRowLineSlice
} from "../table-cell";
import type { QuireTableRowMeasuredLineSlice } from "./types";

/**
 * Adapts View table-cell summaries into neutral measured-row line slices.
 *
 * View owns table source order and cell provenance. The Layout kernel owns row
 * boundary retention, overlapping-band coalescing, and range union.
 *
 * @param row - View table row whose visual lines are being measured.
 * @param lines - Cell-owned line summaries covering the row band.
 * @returns Table-row slices carrying the original cell provenance.
 */
export function createQuireTableRowMeasuredLineSlicesFromCellLineSlices(
  row: QuireTableRowFragment,
  lines: readonly QuireTableCellRowLineSlice[]
): readonly QuireTableRowMeasuredLineSlice[] {
  const sortedLines = [...lines].sort(compareQuireTableCellRowLineSlices);

  return createQuireMeasuredRowLineSlices(
    {
      range: row.range,
      top: row.rect.y,
      bottom: row.rect.y + row.rect.height
    },
    sortedLines
  ).map((slice) => ({
    range: slice.range,
    top: slice.top,
    bottom: slice.bottom,
    cellLineSlices: slice.lines
  }));
}

export type { QuireTableRowMeasuredLineSlice } from "./types";
