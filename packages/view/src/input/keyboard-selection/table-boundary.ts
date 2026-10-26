import {
  TextSelection,
  type Node as PMNode,
  type ResolvedPos
} from "@quirekit/pm";
import { quireNeutralDocumentProfile, type QuireTableModelProfile } from "@quirekit/view-engine";
import type { QuireKeyboardSelectionTransactionOptions } from "./types";

/** Table-local context for a collapsed text selection inside a cell. */
interface TableBoundaryContext {
  /** Source table node containing the selection. */
  readonly tableNode: PMNode;
  /** Absolute document position before the source table node. */
  readonly tablePos: number;
}

/** Editable boundary positions inside a table. */
interface TableEditableStops {
  /** Absolute positions that can receive a caret at the start of editable content. */
  readonly starts: readonly number[];
  /** Absolute positions that can receive a caret at the end of editable content. */
  readonly ends: readonly number[];
}

/**
 * Resolves a table-cell boundary for plain horizontal caret movement.
 *
 * @param options - State and resolver options.
 * @param direction - Negative moves left, positive moves right.
 * @returns Document position at the next editable table stop, or null.
 */
export function resolveTableHorizontalBoundaryPosition(
  options: QuireKeyboardSelectionTransactionOptions,
  direction: -1 | 1
): number | null {
  const { selection, doc } = options.state;

  if (
    !(selection instanceof TextSelection) ||
    !selection.empty ||
    !selection.$head.parent.isTextblock ||
    !isTextblockBoundary(selection.$head, direction)
  ) {
    return null;
  }

  const tableModel = options.tableModel ?? quireNeutralDocumentProfile.tableModel;
  const context = resolveTableBoundaryContext(selection.$head, tableModel);

  if (!context) {
    return null;
  }

  const stops = collectTableEditableStops(context.tableNode, context.tablePos, tableModel);

  return direction < 0
    ? findPreviousEditableEnd(stops, selection.head)
    : findNextEditableStart(stops, doc.content.size, selection.head);
}

/**
 * Reports whether a collapsed text selection is at the relevant textblock edge.
 *
 * @param $position - Resolved caret position.
 * @param direction - Negative checks the start, positive checks the end.
 * @returns True when movement should cross a structural cell boundary.
 */
function isTextblockBoundary($position: ResolvedPos, direction: -1 | 1): boolean {
  return direction < 0
    ? $position.parentOffset === 0
    : $position.parentOffset === $position.parent.content.size;
}

/**
 * Resolves the containing table and cell positions for a caret.
 *
 * @param $position - Resolved caret position.
 * @param tableModel - Table model naming table and cell node types.
 * @returns Table boundary context, or null outside a table cell.
 */
function resolveTableBoundaryContext(
  $position: ResolvedPos,
  tableModel: QuireTableModelProfile
): TableBoundaryContext | null {
  const tableDepth = findAncestorDepth($position, tableModel.tableNodeType);
  const cellDepth = findAncestorDepth($position, tableModel.cellNodeType);

  if (tableDepth === null || cellDepth === null || cellDepth <= tableDepth) {
    return null;
  }

  return {
    tableNode: $position.node(tableDepth),
    tablePos: $position.before(tableDepth)
  };
}

/**
 * Finds the nearest ancestor depth of one node type.
 *
 * @param $position - Resolved caret position.
 * @param nodeType - Node type to find, or null when the table model has none.
 * @returns Ancestor depth, or null when absent.
 */
function findAncestorDepth($position: ResolvedPos, nodeType: string | null): number | null {
  for (let depth = $position.depth; nodeType !== null && depth >= 0; depth -= 1) {
    if ($position.node(depth).type.name === nodeType) return depth;
  }
  return null;
}

/**
 * Collects logical editable caret stops from a table subtree.
 *
 * @param tableNode - Table node to scan.
 * @param tablePos - Absolute position before the table node.
 * @param tableModel - Table model identifying continuation cells.
 * @returns Editable start and end positions in document order.
 */
function collectTableEditableStops(
  tableNode: PMNode,
  tablePos: number,
  tableModel: QuireTableModelProfile
): TableEditableStops {
  const starts: number[] = [];
  const ends: number[] = [];

  tableNode.descendants((node, relativePosition) => {
    if (node.type.name === tableModel.cellNodeType && tableModel.isContinuationCell(node)) {
      return false;
    }

    if (node.isTextblock) {
      const textblockStart = tablePos + 1 + relativePosition + 1;

      starts.push(textblockStart);
      ends.push(textblockStart + node.content.size);
    }

    if (node.isText) {
      const textStart = tablePos + 1 + relativePosition;

      starts.push(textStart);
      ends.push(textStart + (node.text?.length ?? 0));
    }

    return true;
  });

  return {
    starts: uniqueSortedPositions(starts),
    ends: uniqueSortedPositions(ends)
  };
}

/**
 * Returns sorted positions without duplicates.
 *
 * @param positions - Positions to normalize.
 * @returns Sorted unique positions.
 */
function uniqueSortedPositions(positions: readonly number[]): readonly number[] {
  return [...new Set(positions)].sort((left, right) => left - right);
}

/**
 * Finds the nearest editable end before the current caret.
 *
 * @param stops - Table editable stops.
 * @param position - Current caret position.
 * @returns Previous editable end, or null.
 */
function findPreviousEditableEnd(
  stops: TableEditableStops,
  position: number
): number | null {
  for (let index = stops.ends.length - 1; index >= 0; index -= 1) {
    const stop = stops.ends[index];

    if (stop !== undefined && stop < position) {
      return stop;
    }
  }

  return null;
}

/**
 * Finds the nearest editable start after the current caret.
 *
 * @param stops - Table editable stops.
 * @param docSize - Maximum valid document content position.
 * @param position - Current caret position.
 * @returns Next editable start, or null.
 */
function findNextEditableStart(
  stops: TableEditableStops,
  docSize: number,
  position: number
): number | null {
  for (const stop of stops.starts) {
    if (stop > position && stop <= docSize) {
      return stop;
    }
  }

  return null;
}
