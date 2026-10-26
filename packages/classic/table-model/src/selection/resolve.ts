import {
  SelectionRange,
  type Node as PMNode
} from "@quirekit/pm";
import {
  createWordTableMap,
  type WordTableGridRect,
  type WordTableSemanticCellRef
} from "../map";
import type {
  ResolvedWordTableSelection,
  WordTableSelectionCreateOptions
} from "./types";

/**
 * Resolves table and cell positions into a Word table selection snapshot.
 *
 * @param doc - Source ProseMirror document.
 * @param options - Table and cell positions to select.
 * @returns Resolved table selection data.
 */
export function resolveWordTableSelection(
  doc: PMNode,
  options: WordTableSelectionCreateOptions
): ResolvedWordTableSelection {
  const tableNode = readWordTableNode(doc, options.tablePos);
  const map = createWordTableMap(tableNode);
  const rect = resolveExpandedRect(
    map.rectBetween(options.anchorCellPos, options.headCellPos),
    map.expandRectToMergedCells
  );
  const cells = map.cellsInRect(rect);

  return {
    tablePos: options.tablePos,
    anchorCellPos: options.anchorCellPos,
    headCellPos: options.headCellPos,
    mode: options.mode ?? "cell",
    rect,
    cells,
    $anchor: doc.resolve(options.tablePos + options.anchorCellPos),
    $head: doc.resolve(options.tablePos + options.headCellPos),
    ranges: createCellRanges(doc, options.tablePos, cells)
  };
}

/**
 * Reads the table node at an absolute ProseMirror position.
 *
 * @param doc - Source document.
 * @param tablePos - Absolute position before the table node.
 * @returns Table node at the requested position.
 */
function readWordTableNode(doc: PMNode, tablePos: number): PMNode {
  const tableNode = doc.nodeAt(tablePos);

  if (!tableNode || tableNode.type.name !== "wordTable") {
    throw new RangeError("Word table selection requires a wordTable node");
  }

  return tableNode;
}

/**
 * Expands a raw table-map rect to include intersected merged cells.
 *
 * @param rect - Raw rect from the table map.
 * @param expand - Rect expansion callback.
 * @returns Expanded Word table grid rect.
 */
function resolveExpandedRect(
  rect: WordTableGridRect | null,
  expand: (rect: WordTableGridRect) => WordTableGridRect
): WordTableGridRect {
  if (!rect) {
    throw new RangeError("Word table selection requires valid cell positions");
  }

  return expand(rect);
}

/**
 * Creates ProseMirror ranges for the selected semantic cells.
 *
 * @param doc - Source document.
 * @param tablePos - Absolute position before the selected table.
 * @param cells - Semantic cells selected by the table grid rect.
 * @returns ProseMirror ranges that cover selected cell nodes.
 */
function createCellRanges(
  doc: PMNode,
  tablePos: number,
  cells: readonly WordTableSemanticCellRef[]
): readonly SelectionRange[] {
  return cells.map((cell) => {
    const from = tablePos + cell.originCellPos;
    const cellNode = doc.nodeAt(from);

    if (!cellNode || cellNode.type.name !== "wordTableCell") {
      throw new RangeError("Word table selection requires selectable cells");
    }

    return new SelectionRange(
      doc.resolve(from),
      doc.resolve(from + cellNode.nodeSize)
    );
  });
}
