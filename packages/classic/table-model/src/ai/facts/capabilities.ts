import type { QuireAiBlockChild, QuireAiCapability } from "@quirekit/ai-contract";
import type { Node } from "@quirekit/pm";
import { createWordTableNode } from "../../commands/insert";

/**
 * Table facts: a size label with cells listed beneath and creation from rows of text; the table
 * commands describe structure and formatting changes.
 */
export const wordTableAiCapabilities: readonly QuireAiCapability[] = [{
  // A table whose every row is a tracked deletion is removed pending review.
  kind: "removal",
  removed: node => node.type.name === "wordTable" && node.childCount > 0 && everyRow(node, row =>
    (row.attrs.wordTableStructuralRevision as { kind?: unknown } | null | undefined)?.kind === "table-row-deletion")
}, {
  kind: "block",
  node: "wordTable",
  label: node => {
    let columns = 0;
    node.forEach(row => { columns = Math.max(columns, row.childCount); });
    // Tracked structure changes show only once accepted; naming them keeps the model from making them again.
    const pending = describePendingStructure(node);
    // The current style, so a request for it is seen as already done.
    const style = typeof node.attrs.tableStyle === "string" && node.attrs.tableStyle !== "" ? ` 样式 ${node.attrs.tableStyle}` : "";
    return `表格 ${node.childCount}×${columns}${style}${pending === "" ? "" : `（待审阅：${pending}，接受后生效）`}`;
  },
  children: node => {
    const cells: QuireAiBlockChild[] = [];
    node.forEach((row, rowOffset, rowIndex) => row.forEach((cell, cellOffset, cellIndex) => {
      cells.push({ node: cell, offset: rowOffset + 1 + cellOffset, caption: `(${rowIndex + 1},${cellIndex + 1})`, owners: [row] });
    }));
    return cells;
  },
  create: {
    key: "table",
    description: "A table given as rows of cell texts, such as [[\"名称\",\"数量\"],[\"苹果\",\"3\"]]; inline markup allowed, and a line break starts another paragraph in the same cell, so one cell can hold a name, a title and contact lines.",
    schema: {
      type: "array", minItems: 1, maxItems: 200,
      items: { type: "array", minItems: 1, maxItems: 30, items: { type: "string" } }
    },
    build: (value, schema) => {
      const rows = value as readonly (readonly string[])[];
      const columnCount = Math.max(...rows.map(row => row.length));
      const result = createWordTableNode(schema, {
        rowCount: rows.length,
        columnCount,
        cellContents: rows.flatMap(row => Array.from({ length: columnCount }, (_, index) =>
          (row[index] ?? "").split("\n").map(text => ({ type: "paragraph", content: text.length > 0 ? [{ type: "text", text }] : [] }))))
      });
      if (!result.ok) throw new TypeError("The table could not be built.");
      return result.value;
    }
  }
}];

/**
 * @param table - Table node.
 * @param test - Row test.
 * @returns Whether every row passes.
 */
function everyRow(table: Node, test: (row: Node) => boolean): boolean {
  let all = true;
  table.forEach(row => { if (!test(row)) all = false; });
  return all;
}

/** Names of tracked table structure changes, in the order they are listed. */
const pendingNames: Readonly<Record<string, string>> = {
  "table-cell-merge": "合并单元格", "table-row-insertion": "新增行", "table-row-deletion": "删除行",
  "table-cell-insertion": "新增单元格", "table-cell-deletion": "删除单元格", "table-grid": "列宽", "table-properties": "表格属性"
};

/**
 * @param table - Table node.
 * @returns Tracked structure changes of the table, its rows and cells, joined with 、; empty when none.
 */
function describePendingStructure(table: Node): string {
  // A table inserted as a tracked change is one pending insertion, not a list of new rows.
  if (table.childCount > 0 && everyRow(table, row =>
    (row.attrs.wordTableStructuralRevision as { kind?: unknown } | null | undefined)?.kind === "table-row-insertion")) return "整表新增";
  const kinds = new Set<string>();
  const read = (node: Node) => {
    const kind = (node.attrs.wordTableStructuralRevision as { kind?: unknown } | null | undefined)?.kind;
    if (typeof kind === "string" && pendingNames[kind] !== undefined) kinds.add(kind);
  };
  read(table);
  table.forEach(row => { read(row); row.forEach(read); });
  return Object.keys(pendingNames).filter(kind => kinds.has(kind)).map(kind => pendingNames[kind]).join("、");
}
