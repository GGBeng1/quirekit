import type { EditingBoundaryRule } from "@quirekit/msfe-core";
import type { SyntaxNode } from "@lezer/common";

/** @param row - Confirmed table header or body row. @returns Editable edges inside optional outer pipes, without scanning cell contents. */
function rowContent(row: SyntaxNode): readonly [number, number] {
  const first = row.firstChild, last = row.lastChild;
  return [first?.name === "TableDelimiter" && first.from === row.from ? first.to : row.from,
    last?.name === "TableDelimiter" && last.to === row.to ? last.from : row.to];
}

/** Table pipes and the alignment row belong to the table, not to cell text. */
export const tableBoundary: EditingBoundaryRule = { nodes: ["TableDelimiter"],
  /** @param context - One confirmed pipe or alignment row. @returns A protected token removable through whole-table selection or structure commands. */
  resolve({ node }) {
    let table = node.parent;
    while (table && table.name !== "Table") table = table.parent;
    if (table && node.parent?.name === "Table") {
      // The hidden alignment row includes its endpoints and adjacent line breaks.
      // Its legal destinations belong to actual rows, even for a header-only table.
      const header = node.prevSibling, next = node.nextSibling;
      if (header?.name !== "TableHeader") return null;
      if (next?.name === "TableRow") return { from: header.to, to: next.from, contentFrom: header.to,
        contentTo: next.from, kind: "syntax", selectFrom: table.from, selectTo: table.to, deletion: "protect" };
      const [contentFrom, contentTo] = rowContent(header);
      return { from: header.from, to: node.to, contentFrom, contentTo, kind: "block",
        selectFrom: table.from, selectTo: table.to, deletion: "protect" };
    }
    return table ? { from: node.from, to: node.to, contentFrom: node.from, contentTo: node.to, kind: "syntax",
      selectFrom: table.from, selectTo: table.to, deletion: "protect" } : null;
  },
};

/** Row breaks are retained during partial selections, including tables without outer pipes. */
export const tableRowBoundary: EditingBoundaryRule = { nodes: ["TableHeader", "TableRow"],
  /** @param context - One confirmed table row. @returns A line shell whose complete deletion requires its table owner. */
  resolve({ node }) {
    const table = node.parent;
    const [contentFrom, contentTo] = rowContent(node);
    return table?.name === "Table" ? { from: node.from, to: node.to, contentFrom, contentTo, kind: "block",
      selectFrom: table.from, selectTo: table.to, navigation: "content", deletion: "protect" } : null;
  },
};
