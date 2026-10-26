import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { TableCell, TableContext, TableRow } from "./types";

/** @param node - Confirmed data row. @returns Raw cells with escaped pipes already resolved by the parser. */
export function readTableRow(node: SyntaxNode): TableRow {
  const pipes = node.getChildren("TableDelimiter");
  const leading = pipes[0]?.from === node.from, trailing = pipes.at(-1)?.to === node.to;
  let from = leading ? node.from + 1 : node.from;
  const cells: TableCell[] = [];
  for (const pipe of pipes) {
    if (pipe.from < from) continue;
    cells.push({ from, to: pipe.from }); from = pipe.to;
  }
  if (!trailing) cells.push({ from, to: node.to });
  return { node, cells, leading, trailing };
}

/** @param state - Canonical or command-draft state. @returns One unambiguous data-cell selection; delimiter/multi-row selections are refused. */
export function tableContext(state: EditorState): TableContext | null {
  if (state.selection.ranges.length !== 1) return null;
  const range = state.selection.main;
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(range.head, -1);
  while (node && node.name !== "Table") node = node.parent;
  if (!node || range.from < node.from || range.to > node.to || !syntaxTreeAvailable(state, Math.min(state.doc.length, node.to + 1))) return null;
  const header = node.getChild("TableHeader");
  const delimiter = node.getChild("TableDelimiter");
  if (!header || !delimiter) return null;
  const columns = state.sliceDoc(delimiter.from, delimiter.to).trim().replace(/^\||\|$/gu, "").split("|").length;
  const rowNode = node.childBefore(range.head + 1);
  if (!rowNode || !["TableRow", "TableHeader"].includes(rowNode.name) || range.from < rowNode.from || range.to > rowNode.to) return null;
  const row = readTableRow(rowNode);
  let column = row.cells.findIndex(cell => range.head <= cell.to);
  if (column < 0) column = row.cells.length - 1;
  const cell = row.cells[column];
  if (!cell || (!range.empty && range.from < cell.from)) return null;
  return { node, header, delimiter, row, column: Math.min(column, columns - 1), columns };
}

/** @param state - Canonical source. @param row - Raw row. @returns Exact cell spellings. */
export function rowValues(state: EditorState, row: TableRow): string[] {
  return row.cells.map(cell => state.sliceDoc(cell.from, cell.to));
}

/** @param row - Original outer-pipe choice. @param values - Raw cell fields. @returns Source retaining every supplied field. */
export function writeRow(row: Pick<TableRow, "leading" | "trailing">, values: readonly string[]): string {
  return `${row.leading ? "|" : ""}${values.join("|")}${row.trailing ? "|" : ""}`;
}

/** @param row - Outer-pipe spelling. @param values - Raw cell fields. @param column - Target column. @returns Offset at the target's first editable content. */
export function cellOffset(row: Pick<TableRow, "leading">, values: readonly string[], column: number): number {
  const field = values[column] ?? "";
  return Number(row.leading) + values.slice(0, column).reduce((sum, value) => sum + value.length + 1, 0)
    + (/^\s*/u.exec(field)?.[0].length ?? 0);
}
