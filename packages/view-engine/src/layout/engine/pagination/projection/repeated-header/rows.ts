import type { QuireTableRowFragment } from "../../../table";
import type { QuireRepeatedTableHeaderState } from "../../repeated-table-headers";
import type { QuireSourceFlowClip } from "../source-flow";
import { createQuireRepeatedHeaderTablePartId } from "../table/part-ids";

/** Options for creating repeated table header row fragments. */
export interface QuireRepeatedHeaderRowsOptions {
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
 * Creates repeated header row fragments in flow coordinates for one page.
 *
 * @param options - Source rows, repeated header state, page flow clip, and page index.
 * @returns Repeated header rows, or an empty list when the page has no repeated header.
 */
export function createQuireRepeatedHeaderRows(
  options: QuireRepeatedHeaderRowsOptions
): readonly QuireTableRowFragment[] {
  if (options.repeatedHeader === null) {
    return [];
  }

  const rowsByIndex = new Map(options.rows.map((row) => [row.rowIndex, row]));
  let y = options.flowClip.top;

  return options.repeatedHeader.rowIndexes.flatMap((rowIndex) => {
    const row = rowsByIndex.get(rowIndex);

    if (row === undefined) {
      return [];
    }

    const repeated: QuireTableRowFragment = {
      ...row,
      id: createQuireRepeatedHeaderTablePartId(row.id, options.pageIndex),
      isRepeatedHeader: true,
      rect: {
        ...row.rect,
        y
      }
    };

    y += row.rect.height;

    return [repeated];
  });
}
