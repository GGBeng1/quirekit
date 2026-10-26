import type { Selection } from "@quirekit/pm";
import type { QuireTableCellSelection } from "../../document-profile/types";
import type { QuireLayoutNode } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireSelectionRangeGeometry } from "../types";

/** Options used to map a table cell selection to canvas selection geometry. */
export interface QuireTableSelectionGeometryOptions {
  /** Layout snapshot whose table fragments should be searched. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Structural table cell selection to map. */
  readonly selection: Selection & QuireTableCellSelection;
}

/**
 * Builds selection range rectangles for a structural table cell selection.
 *
 * @param options - Layout snapshot and table cell selection to map.
 * @returns Selection range geometries for matched cell fragments.
 */
export function buildQuireTableSelectionRangeGeometries(options: QuireTableSelectionGeometryOptions): readonly QuireSelectionRangeGeometry[] {
  const selectedCellIds = new Set(options.selection.cells.map((cell) => cell.id));
  const range = { from: options.selection.from, to: options.selection.to };
  const ranges: QuireSelectionRangeGeometry[] = [];

  for (const node of findTableLayoutNodes(options.snapshot.root.children ?? [])) {
    if (node.table?.tableRange.from !== options.selection.tablePos) continue;
    for (const cell of node.table.cells) {
      if (selectedCellIds.has(cell.semanticCellId)) ranges.push({ range, rect: cell.rect, measurementPolicy: "preserve" });
    }
  }

  return ranges;
}

/**
 * Finds table layout nodes in document order.
 *
 * @param nodes - Layout nodes to inspect.
 * @returns Table layout nodes contained in the supplied subtree.
 */
function findTableLayoutNodes(nodes: readonly QuireLayoutNode[]): readonly QuireLayoutNode[] {
  const tableNodes: QuireLayoutNode[] = [];

  for (const node of nodes) {
    if (node.table) tableNodes.push(node);
    else tableNodes.push(...findTableLayoutNodes(node.children ?? []));
  }

  return tableNodes;
}
