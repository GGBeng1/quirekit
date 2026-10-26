import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../../map";
import { cloneCellWithAttrs, cloneRowWithAttrs, cloneTableWithRows } from "../../derive/node/clone";
import { isRectInsideMap, rectContainsOnlyCells } from "../../derive/grid/rect";
import { freshWordTableBorders } from "../../insert";
import { prepareWordTableCommand } from "../../repair";
import { wordTableCommandFailure, wordTableCommandSuccess, type SetWordTableCellBorderFormatOptions, type WordTableCommandResult } from "../../types";
import { createBorderFormatSource } from "./candidates";
import { planBorderFormat } from "./plan";
import { normalizeBorderFormat } from "./patch";

/**
 * Changes existing visible orthogonal borders without applying a topology preset.
 * @param tableNode - Source Word table.
 * @param options - Selection and independent existing-edge property patch.
 * @returns One atomic table edit, or a fail-closed result for unsupported edges.
 */
export function setWordTableCellBorderFormat(tableNode: PMNode, options: SetWordTableCellBorderFormatOptions): WordTableCommandResult<PMNode> {
  const format = normalizeBorderFormat(options.format);
  if (!format) return wordTableCommandFailure("invalid-content");
  const prepared = prepareWordTableCommand(tableNode, options.repair);
  if (!prepared.ok) return prepared;
  const table = prepared.value.tableNode;
  const map = createWordTableMap(table);
  if (![options.startRow, options.startColumn, options.rowSpan, options.columnSpan].every(Number.isInteger)
    || options.rowSpan <= 0 || options.columnSpan <= 0 || !isRectInsideMap(map, options)) return wordTableCommandFailure("invalid-selection");
  const rect = map.expandRectToMergedCells(options);
  if (!isRectInsideMap(map, rect) || !rectContainsOnlyCells(map, rect)) return wordTableCommandFailure("invalid-selection");
  if ([table, ...table.children].some(node => Number(node.attrs.cellSpacing?.value) > 0)) return wordTableCommandFailure("unsupported-border-format");
  if (map.rows.some(row => row.gridBefore.columnSpan > 0 || row.gridAfter.columnSpan > 0)) return wordTableCommandFailure("unsupported-border-format");
  const source = createBorderFormatSource(table, map);
  const pending = planBorderFormat(source, rect, format);
  if (pending === null) return wordTableCommandFailure("unsupported-border-format");
  if (pending.size === 0) return wordTableCommandSuccess(table.eq(tableNode) ? tableNode : table, prepared.value.repair);

  // Explicit continuations receive their semantic owner's complete tuple; no
  // nested-table scan or text replacement participates in this formatting edit.
  const attrsByPosition = new Map<string, Record<string, unknown>>();
  for (const explicit of map.explicitCells) {
    const borders = explicit.semanticCellId ? pending.get(explicit.semanticCellId) : undefined;
    if (borders) attrsByPosition.set(`${explicit.rowIndex}:${explicit.cellIndex}`, { borders });
  }
  const rows = table.children.map((row, rowIndex) => cloneRowWithAttrs(row, {}, row.children.map((cell, cellIndex) => {
    const attrs = attrsByPosition.get(`${rowIndex}:${cellIndex}`);
    return attrs ? cloneCellWithAttrs(cell, attrs) : cell;
  })));
  return wordTableCommandSuccess(cloneTableWithRows(table, source.legacy ? { borders: freshWordTableBorders } : {}, rows), prepared.value.repair);
}
