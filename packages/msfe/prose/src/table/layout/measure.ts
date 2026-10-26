import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import { readTableRow } from "../context";
import type { TableLayoutWork } from "./types";

/**
 * Samples canonical cells once per layout dependency change, reserving source-reveal geometry.
 * @param state - Accepted source. @param node - Confirmed table. @param width - Available row content width.
 * @param font - Actual body font. @param size - Actual font size. @param padding - Cell horizontal box insets.
 * @param context - Owner-document text measurer. @param work - Deterministic sample counters.
 * @returns Per-column CSS widths; later unsampled values wrap within the same grid.
 */
export function measureTable(state: EditorState, node: SyntaxNode, width: number, font: string, size: number, padding: number,
  context: CanvasRenderingContext2D, work: TableLayoutWork): Readonly<Record<string, string>> {
  const delimiter = node.getChild("TableDelimiter");
  if (!delimiter) return {};
  const columns = state.sliceDoc(delimiter.from, delimiter.to).trim().replace(/^\||\|$/gu, "").split("|").length;
  const widths = Array<number>(columns).fill(size * 5 + padding);
  work.measurements++;
  let cells = 0, rows = 0;
  // Stable leading samples avoid viewport-dependent width jumps in long tables. No selection
  // input enters this phase. Text beyond the sample and width budget wraps, never disappears.
  for (let row = node.firstChild; row && rows < 128 && cells < 2048; row = row.nextSibling) {
    if (row.name !== "TableHeader" && row.name !== "TableRow") continue;
    rows++; context.font = row.name === "TableHeader" ? `600 ${font}` : font;
    for (const [index, cell] of readTableRow(row).cells.entries()) {
      if (index >= columns || cells >= 2048) break;
      const source = state.sliceDoc(cell.from, Math.min(cell.to, cell.from + 256));
      widths[index] = Math.max(widths[index]!, Math.min(size * 28, context.measureText(source).width + padding + 2));
      cells++;
    }
  }
  work.cells += cells;
  const sum = widths.reduce((total, value) => total + value, 0);
  const grow = Math.max(1, width / sum);
  return Object.fromEntries(widths.map((value, index) => [`--msfe-table-col-${index}`, `${(value * grow).toFixed(3)}px`]));
}
