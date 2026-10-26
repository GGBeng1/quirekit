import type { Node as PMNode } from "@quirekit/pm";
import { rangesIntersect } from "../../map";
import {
  getWordTableRangeKey,
  getWordTableRowCellRanges
} from "../derive/grid/ranges";
import {
  cloneCellWithAttrs,
  cloneRowWithAttrs,
  cloneTableWithRows
} from "../derive/node/clone";
import type { WordTableMalformedContinuationRepair } from "./types";

interface OpenVerticalMergeRange {
  /** First grid column occupied by the open range. */
  readonly startColumn: number;
  /** Number of grid columns occupied by the open range. */
  readonly columnSpan: number;
  /** Whether the open range started in a header row. */
  readonly isHeader: boolean;
  /** Explicit source cells already assigned to the open range. */
  readonly cells: Array<readonly [number, number]>;
}

/**
 * Normalizes malformed continuation cells with a user-authorized policy.
 *
 * Content-bearing, orphaned, range-mismatched, and header-crossing
 * continuations become independent cells instead of hiding their content.
 *
 * @param tableNode - Source table node.
 * @param strategy - Explicit continuation repair choice.
 * @returns Table with repaired continuation identity.
 */
export function repairMalformedVerticalMergeContinuations(
  tableNode: PMNode,
  strategy: Exclude<WordTableMalformedContinuationRepair, "reject">
): PMNode {
  const openRanges = new Map<string, OpenVerticalMergeRange>();
  const updates = new Map<string, "restart" | "continue" | null>();

  tableNode.children.forEach((row, rowIndex) => {
    getWordTableRowCellRanges(row).forEach((range, cellIndex) => {
      const key = getWordTableRangeKey(range.startColumn, range.columnSpan);
      const intersections = [...openRanges.entries()].filter(([, open]) =>
        rangesIntersect(open, range)
      );

      if (range.cell.attrs.vMerge === "continue") {
        const exact = openRanges.get(key);
        const canContinue = exact
          && exact.isHeader === (row.attrs.isHeader === true)
          && range.cell.textContent.trim().length === 0;

        if (canContinue) {
          exact.cells.push([rowIndex, cellIndex]);
          return;
        }

        clearAndCloseRanges(openRanges, intersections, updates);
        const nextMerge = intersections.length === 0 && strategy === "restart"
          ? "restart"
          : null;
        updates.set(getCellKey(rowIndex, cellIndex), nextMerge);
        if (nextMerge === "restart") {
          openRanges.set(key, {
            startColumn: range.startColumn,
            columnSpan: range.columnSpan,
            isHeader: row.attrs.isHeader === true,
            cells: [[rowIndex, cellIndex]]
          });
        }
        return;
      }

      closeRanges(openRanges, intersections);
      if (range.cell.attrs.vMerge === "restart") {
        openRanges.set(key, {
          startColumn: range.startColumn,
          columnSpan: range.columnSpan,
          isHeader: row.attrs.isHeader === true,
          cells: [[rowIndex, cellIndex]]
        });
      }
    });
  });

  const rows = tableNode.children.map((row, rowIndex) =>
    cloneRowWithAttrs(row, {}, row.children.map((cell, cellIndex) => {
      const update = updates.get(getCellKey(rowIndex, cellIndex));
      return update === undefined
        ? cell
        : cloneCellWithAttrs(cell, { rowspan: 1, vMerge: update });
    }))
  );

  return cloneTableWithRows(tableNode, {}, rows);
}

/**
 * Promotes orphan vertical merge continuations to restarts.
 *
 * @param tableNode - Source table node.
 * @returns Table node with orphan continuations promoted.
 */
export function promoteOrphanVerticalMergeContinuations(
  tableNode: PMNode
): PMNode {
  return repairMalformedVerticalMergeContinuations(tableNode, "restart");
}

/**
 * Removes intersecting ranges from the open-chain registry.
 *
 * @param openRanges - Mutable open-chain registry.
 * @param intersections - Intersecting entries to remove.
 */
function closeRanges(
  openRanges: Map<string, OpenVerticalMergeRange>,
  intersections: readonly (readonly [string, OpenVerticalMergeRange])[]
): void {
  for (const [key] of intersections) openRanges.delete(key);
}

/**
 * Clears every source marker in malformed open chains before closing them.
 *
 * @param openRanges - Mutable open-chain registry.
 * @param intersections - Malformed chains intersecting the current cell.
 * @param updates - Pending source-cell merge updates.
 */
function clearAndCloseRanges(
  openRanges: Map<string, OpenVerticalMergeRange>,
  intersections: readonly (readonly [string, OpenVerticalMergeRange])[],
  updates: Map<string, "restart" | "continue" | null>
): void {
  for (const [key, chain] of intersections) {
    for (const [rowIndex, cellIndex] of chain.cells) {
      updates.set(getCellKey(rowIndex, cellIndex), null);
    }
    openRanges.delete(key);
  }
}

/**
 * Creates one stable source-cell coordinate key.
 *
 * @param rowIndex - Source row index.
 * @param cellIndex - Source cell index.
 * @returns Stable coordinate key.
 */
function getCellKey(rowIndex: number, cellIndex: number): string {
  return `${rowIndex}:${cellIndex}`;
}
