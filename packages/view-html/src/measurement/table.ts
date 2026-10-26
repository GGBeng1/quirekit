import type { Node as PMNode } from "@quirekit/pm";
import type { QuireTableCellSelectionHit, QuireTableMap, QuireTableModelProfile } from "@quirekit/view-engine";
import type { HtmlDomMeasurementProvider } from "./types";

const tableMaps = new WeakMap<PMNode, QuireTableMap>();

/**
 * Attaches canonical table-cell identity to an already resolved DOM text hit.
 * @param doc - Canonical document owning the hit position.
 * @param tableModel - Table model owning table node types and grid maps.
 * @param provider - DOM authority for the cell's continuous-flow box.
 * @param pos - Resolved model position inside a cell.
 * @param origin - Content surface origin in client coordinates.
 * @returns Existing table semantics with browser geometry, or undefined outside a table.
 */
export function resolveHtmlTableCellHit(
  doc: PMNode,
  tableModel: QuireTableModelProfile,
  provider: HtmlDomMeasurementProvider,
  pos: number,
  origin: { readonly left: number; readonly top: number }
): QuireTableCellSelectionHit | undefined {
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name !== tableModel.cellNodeType) continue;
    const tableDepth = depth - 2;
    if (tableDepth < 1 || $pos.node(tableDepth).type.name !== tableModel.tableNodeType) continue;
    const table = $pos.node(tableDepth);
    const tablePos = $pos.before(tableDepth);
    let map = tableMaps.get(table);
    if (!map) { map = tableModel.map(table); tableMaps.set(table, map); }
    const cell = tableModel.semanticCellAt(map, $pos.before(depth) - tablePos);
    if (!cell) return undefined;
    const cellPos = tablePos + cell.originCellPos;
    const rect = provider.nodeSelectionRect(cellPos);
    const node = doc.nodeAt(cellPos)!;
    return {
      tableId: `${tableModel.tableNodeType}-${tablePos}`,
      tablePos,
      semanticCellId: cell.id,
      originCellPos: cell.originCellPos,
      range: { from: cellPos, to: cellPos + node.nodeSize },
      rect: { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.right - rect.left, height: rect.bottom - rect.top }
    };
  }
  return undefined;
}
