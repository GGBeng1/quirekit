import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap, type WordTableGridRect } from "../../map";
import { pasteWordTableMatrixIntoTable } from "../../commands/matrix/transform";
import { readExplicitCellNode } from "../slice";
import type { TablePasteBodyEdit, TablePastePlan } from "./types";

/**
 * Validates every destination before producing any transaction steps.
 * @param target - Original table.
 * @param source - Complete source table.
 * @param rect - Selection whose top-left anchors the source extent.
 * @returns Body edits, an expanded table, or rejection.
 */
export function planTablePaste(target: PMNode, source: PMNode, rect: WordTableGridRect): TablePastePlan {
  const targetMap = createWordTableMap(target);
  const sourceMap = createWordTableMap(source);
  if (targetMap.diagnostics.length || sourceMap.diagnostics.length) return { reason: "invalid-table" };
  if (sourceMap.slots.some(slot => slot.kind !== "cell")) return { reason: "unsupported-source-grid" };
  const sourceExplicit = new Map(sourceMap.explicitCells.map(cell => [cell.id, cell]));
  const edits: TablePasteBodyEdit[] = [];
  // Match origins and both spans, never just row-major cell counts.
  for (const sourceCell of sourceMap.semanticCells) {
    const row = rect.startRow + sourceCell.rect.startRow;
    const column = rect.startColumn + sourceCell.rect.startColumn;
    const destination = targetMap.cellAt(row, column);
    const explicit = sourceExplicit.get(sourceCell.originExplicitCellId)!;
    if (!destination || destination.rect.startRow !== row || destination.rect.startColumn !== column
      || destination.rect.rowSpan !== sourceCell.rect.rowSpan || destination.rect.columnSpan !== sourceCell.rect.columnSpan) break;
    const targetNode = target.nodeAt(destination.originCellPos - 1)!;
    edits.push({ cellPos: destination.originCellPos, size: targetNode.content.size,
      content: readExplicitCellNode(source, explicit).content });
  }
  if (edits.length === sourceMap.semanticCells.length) return { table: target, edits };
  // Reuse the canonical expansion transform, including its merged-target guard.
  if (sourceMap.semanticCells.some(cell => cell.rect.rowSpan !== 1 || cell.rect.columnSpan !== 1)) {
    return { reason: "incompatible-merge" };
  }
  const result = pasteWordTableMatrixIntoTable(target, {
    strategy: "expand", repair: "never", startRow: rect.startRow, startColumn: rect.startColumn,
    matrix: source.children.map(row => row.children.map(cell => cell.content.toJSON()))
  });
  return result.ok ? { table: result.value, edits: null } : { reason: "incompatible-merge" };
}
