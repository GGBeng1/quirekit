import { syntaxTree } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode, Tree } from "@lezer/common";
import type { TableReadingModel } from "./types";

const indexes = new WeakMap<Tree, Map<number, TableReadingModel>>();

/** @param state - Canonical source. @param node - Accepted table. @returns Cached row identities and counts, never copied body text. */
export function tableReadingModel(state: EditorState, node: SyntaxNode): TableReadingModel {
  const tree = syntaxTree(state);
  let tables = indexes.get(tree);
  if (!tables) { tables = new Map(); indexes.set(tree, tables); }
  let model = tables.get(node.from);
  if (!model) {
    const rows: number[] = [];
    for (let row = node.firstChild; row; row = row.nextSibling) if (row.name === "TableRow" || row.name === "TableHeader") rows.push(row.from);
    const delimiter = node.getChild("TableDelimiter");
    const columns = delimiter ? state.sliceDoc(delimiter.from, delimiter.to).trim().replace(/^\||\|$/gu, "").split("|").length : 0;
    model = { rows, indexes: new Map(rows.map((from, index) => [from, index + 1])), columns };
    tables.set(node.from, model);
  }
  return model;
}
