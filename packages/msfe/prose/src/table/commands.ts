import { EditorSelection, type ChangeSpec, type EditorState, type TransactionSpec } from "@quirekit/cm-state";
import type { MsfeCommand } from "@quirekit/msfe-core";
import { cellOffset, readTableRow, rowValues, tableContext, writeRow } from "./context";
import type { TableContext, TableSide } from "./types";

/** @param state - Canonical draft. @param context - Active table. @param column - Zero-based requested cell. @returns Selection and any explicitly requested missing fields. */
export function enterTableCell(state: EditorState, context: TableContext, column: number): TransactionSpec | null {
  if (column < 0 || column >= context.columns) return null;
  const row = context.row, values = rowValues(state, row);
  const missing = values.length <= column;
  while (values.length <= column) values.push(" ");
  return { ...(missing ? { changes: { from: row.node.from, to: row.node.to, insert: writeRow(row, values) } } : {}),
    selection: EditorSelection.single(row.node.from + cellOffset(row, values, column)), scrollIntoView: true };
}

/** @param side - Relative insertion side. @returns An atomic row insertion, always below the header/delimiter pair. */
export function insertTableRow(side: TableSide): MsfeCommand {
  return state => {
    const context = tableContext(state);
    if (!context) return null;
    const source = context.row.node.name === "TableHeader" ? context.delimiter : context.row.node;
    const before = side === "before" && source !== context.delimiter;
    const line = state.doc.lineAt(source.from), template = state.doc.lineAt(context.delimiter.from);
    const prefix = state.sliceDoc(template.from, context.delimiter.from);
    const cells = Array<string>(context.columns).fill("  "), row = { leading: true, trailing: true };
    const text = prefix + writeRow(row, cells), at = before ? line.from : line.to;
    return { changes: { from: at, insert: before ? text + "\n" : "\n" + text },
      selection: EditorSelection.single(at + Number(!before) + prefix.length + cellOffset(row, cells, context.column)), scrollIntoView: true };
  };
}

/** @returns Deletion of one body row, preserving the table's structural header. */
export function deleteTableRow(): MsfeCommand {
  return state => {
    const context = tableContext(state);
    if (!context || context.row.node.name !== "TableRow") return null;
    const line = state.doc.lineAt(context.row.node.from);
    const from = line.to === state.doc.length ? line.from - 1 : line.from;
    const to = line.to === state.doc.length ? line.to : line.to + 1;
    return { changes: { from, to }, selection: EditorSelection.single(Math.min(from, state.doc.length - (to - from))), scrollIntoView: true };
  };
}

/** @param side - Relative insertion side, or deletion. @returns A whole-column edit that preserves surplus data and alignment fields. */
function changeColumn(side: TableSide | "delete"): MsfeCommand {
  return state => {
    const context = tableContext(state);
    if (!context || (side === "delete" && context.columns === 1)) return null;
    const column = context.column + Number(side === "after"), changes: ChangeSpec[] = [];
    let caret = 0, shift = 0;
    // A column edit explicitly owns every row. Selection/status queries never call
    // this planner, so normal caret movement has no table-wide rewrite cost.
    for (let node = context.node.firstChild; node; node = node.nextSibling) {
      if (!["TableHeader", "TableRow", "TableDelimiter"].includes(node.name)) continue;
      const delimiter = node.name === "TableDelimiter";
      const text = state.sliceDoc(node.from, node.to);
      const row = delimiter ? { leading: text.startsWith("|"), trailing: text.endsWith("|") } : readTableRow(node);
      const values = delimiter ? text.replace(/^\||\|$/gu, "").split("|") : rowValues(state, row as ReturnType<typeof readTableRow>);
      while (values.length < context.columns) values.push(" ");
      values.splice(column, Number(side === "delete"), ...(side === "delete" ? [] : [delimiter ? " --- " : "  "]));
      const insert = writeRow(row, values);
      if (node.from === context.row.node.from) caret = node.from + shift + cellOffset(row, values, Math.min(column, context.columns - (side === "delete" ? 2 : 0)));
      changes.push({ from: node.from, to: node.to, insert }); shift += insert.length - (node.to - node.from);
    }
    return { changes, selection: EditorSelection.single(caret), scrollIntoView: true };
  };
}

/** @param side - Relative column insertion side. @returns Atomic insertion planner. */
export function insertTableColumn(side: TableSide): MsfeCommand { return changeColumn(side); }
/** @returns Atomic deletion planner, refusing the last remaining column. */
export function deleteTableColumn(): MsfeCommand { return changeColumn("delete"); }

/** @param direction - Next or previous data cell. @returns Navigation with one new row only at the forward table boundary. */
export function moveTableCell(direction: 1 | -1): MsfeCommand {
  return state => {
    const context = tableContext(state);
    if (!context) return null;
    const column = context.column + direction;
    if (column >= 0 && column < context.columns) return enterTableCell(state, context, column);
    let row = direction > 0 ? context.row.node.nextSibling : context.row.node.prevSibling;
    while (row && !["TableHeader", "TableRow"].includes(row.name)) row = direction > 0 ? row.nextSibling : row.prevSibling;
    if (!row) {
      if (direction < 0) return null;
      const insert = insertTableRow("after")(state);
      if (!insert?.selection) return insert;
      // A wrapped forward move always lands in the first new cell.
      const next = state.update(insert).state, fresh = tableContext(next);
      return fresh ? { ...insert, selection: enterTableCell(next, fresh, 0)!.selection } : insert;
    }
    return enterTableCell(state, { ...context, row: readTableRow(row) }, direction > 0 ? 0 : context.columns - 1);
  };
}
