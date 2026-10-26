import type { Node as PMNode } from "@quirekit/pm";
import { getWordTableRowCellRanges } from "../grid/ranges";
import { createEmptyWordTableCellNode } from "../node/builder";
import { cloneRowWithAttrs } from "../node/clone";
import type { WordTableCommandNodeTypes } from "../shared/types";
import { createSplitCellsForRow } from "./cells";
import { getSplitCellKey } from "./key";

/** Options used to create rows inserted by a row-count split. */
interface CreateInsertedSplitRowsOptions {
  /** Source row being split. */
  readonly sourceRow: PMNode;
  /** Row/cell keys owned by the split semantic cell. */
  readonly affectedKeys: ReadonlySet<string>;
  /** Source row index. */
  readonly sourceRowIndex: number;
  /** Number of rows to insert. */
  readonly rowCount: number;
  /** Number of split cells to create in each inserted row. */
  readonly columnCount: number;
  /** Command node types used for empty cells. */
  readonly nodeTypes: WordTableCommandNodeTypes;
}

/**
 * Creates rows inserted below a single-row cell split.
 *
 * @param options - Inserted row creation options.
 * @returns Inserted rows.
 */
export function createInsertedSplitRows(
  options: CreateInsertedSplitRowsOptions
): readonly PMNode[] {
  return Array.from({ length: options.rowCount }, () => {
    const cells: PMNode[] = [];

    for (const range of getWordTableRowCellRanges(options.sourceRow)) {
      const key = getSplitCellKey(options.sourceRowIndex, range.cellIndex);

      if (options.affectedKeys.has(key)) {
        cells.push(...createSplitCellsForRow({
          sourceCell: range.cell,
          usesSourceContent: false,
          columnCount: options.columnCount,
          nodeTypes: options.nodeTypes,
        }));
        continue;
      }

      cells.push(createEmptyWordTableCellNode(options.nodeTypes, {
        colspan: range.columnSpan,
        gridSpan: range.columnSpan,
        rowspan: 1,
        vMerge: "continue",
      }));
    }

    return cloneRowWithAttrs(options.sourceRow, {}, cells);
  });
}
