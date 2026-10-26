import { intersectQuireDocumentRanges } from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTableRowFragment } from "../../../table";
import {
  clipQuireRectToSourceFlowClip,
  hasQuireMeasuredSourceFlowClip,
  type QuireSourceFlowClip
} from "../source-flow";
import { createQuireSplitTablePartId } from "../table/part-ids";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Options for projecting normal table body rows into one page. */
export interface QuireTableBodyRowsPageProjectionOptions {
  /** Source table body rows in infinite-flow coordinates. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Page document range represented by the page fragment. */
  readonly pageRange: QuireDocumentRange;
  /** Source-flow band accepted by the page body. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page-body projection used to suffix split ids. */
  readonly projection: QuirePageBodyProjection;
}

/**
 * Projects normal table body row fragments into one page band.
 *
 * @param options - Source rows, page range, source-flow clip, and projection.
 * @returns Page-owned table body row fragments.
 */
export function projectQuireTableBodyRowsToPage(
  options: QuireTableBodyRowsPageProjectionOptions
): readonly QuireTableRowFragment[] {
  return options.rows.flatMap((row) =>
    projectQuireTableRowFragment(
      row,
      options.pageRange,
      options.flowClip,
      options.projection
    )
  );
}

/**
 * Projects one row fragment when it intersects a page range.
 *
 * @param row - Source row fragment in flow coordinates.
 * @param pageRange - Document range owned by the page.
 * @param flowClip - Flow-space page bounds.
 * @param projection - Page-body projection being applied.
 * @returns Page-local row fragment candidates.
 */
function projectQuireTableRowFragment(
  row: QuireTableRowFragment,
  pageRange: QuireDocumentRange,
  flowClip: QuireSourceFlowClip,
  projection: QuirePageBodyProjection
): readonly QuireTableRowFragment[] {
  const rect = clipQuireRectToSourceFlowClip(row.rect, flowClip);
  const range = intersectQuireDocumentRanges(row.range, pageRange) ??
    (rect !== null && hasQuireMeasuredSourceFlowClip(projection) ? row.range : null);

  if (range === null || rect === null) {
    return [];
  }

  return [{
    ...row,
    id: createQuireSplitTablePartId(
      row.id,
      row.range,
      pageRange,
      resolveQuireProjectionOccurrence(projection)
    ),
    range,
    rect
  }];
}
