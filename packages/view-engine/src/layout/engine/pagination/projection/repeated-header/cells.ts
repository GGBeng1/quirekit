import type {
  QuireTableCellFragment,
  QuireTableRowFragment
} from "../../../table";
import type { QuireRepeatedTableHeaderState } from "../../repeated-table-headers";
import {
  clipQuireRectToSourceFlowClip,
  type QuireSourceFlowClip
} from "../source-flow";
import {
  resolveQuireRepeatedHeaderSourceBand,
  translateQuireRepeatedHeaderRectY
} from "./geometry";
import { doesQuireTableCellCoverAnyRowIndex } from "../table/row-coverage";
import { createQuireRepeatedHeaderTablePartId } from "../table/part-ids";

/** Options for creating repeated table header cell fragments. */
export interface QuireRepeatedHeaderCellsOptions {
  /** Source table cell fragments in flow coordinates. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Source table row fragments in flow coordinates. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Repeated header state for the projected page. */
  readonly repeatedHeader: QuireRepeatedTableHeaderState | null;
  /** Flow-space band reserved for repeated header fragments. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page occurrence key: the page index, or page and column on multi-column pages. */
  readonly pageIndex: number | string;
}

/**
 * Creates repeated header cell fragments in flow coordinates for one page.
 *
 * @param options - Source cells, rows, repeated header state, flow clip, and page index.
 * @returns Repeated header cells clipped to the header band.
 */
export function createQuireRepeatedHeaderCells(
  options: QuireRepeatedHeaderCellsOptions
): readonly QuireTableCellFragment[] {
  const sourceBand = resolveQuireRepeatedHeaderSourceBand(
    options.repeatedHeader,
    options.rows
  );

  if (options.repeatedHeader === null || sourceBand === null) {
    return [];
  }

  const rowIndexes = new Set(options.repeatedHeader.rowIndexes);
  const deltaY = options.flowClip.top - sourceBand.top;

  return options.cells.flatMap((cell) => {
    if (!doesQuireTableCellCoverAnyRowIndex(cell, rowIndexes)) {
      return [];
    }

    const rect = clipQuireRectToSourceFlowClip(cell.rect, sourceBand);
    const contentRect = clipQuireRectToSourceFlowClip(cell.contentRect, sourceBand);
    const contentLayoutRect = cell.contentLayoutRect === undefined
      ? undefined
      : clipQuireRectToSourceFlowClip(cell.contentLayoutRect, sourceBand);

    if (
      rect === null ||
      contentRect === null ||
      contentLayoutRect === null
    ) {
      return [];
    }

    return [{
      ...cell,
      id: createQuireRepeatedHeaderTablePartId(cell.id, options.pageIndex),
      isRepeatedHeader: true,
      rect: translateQuireRepeatedHeaderRectY(rect, deltaY),
      contentRect: translateQuireRepeatedHeaderRectY(contentRect, deltaY),
      ...(contentLayoutRect === undefined
        ? {}
        : {
            contentLayoutRect: translateQuireRepeatedHeaderRectY(
              contentLayoutRect,
              deltaY
            )
          })
    }];
  });
}
