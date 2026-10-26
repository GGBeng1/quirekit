import type { Editor } from "@quirekit/core";
import { createWordTableMap, resolveWordTableCellHtmlStyles, resolveWordTableStyleRegistry } from "@quirekit/classic-table-model";
import { blockTableStyleIds } from "./presets";

/**
 * Flattens product appearances into explicit portable CSS only for a requested static export.
 * @param editor - Canonical source snapshot.
 * @param html - Existing serializer output, including optional list projection.
 * @returns HTML preserving the visible built-in table appearance without a running editor.
 */
export function exportBlockTableHTML(editor: Editor, html: string): string {
  const root = new DOMParser().parseFromString(html, "text/html").body;
  const elements = Array.from(root.querySelectorAll("table"));
  const registry = resolveWordTableStyleRegistry(editor.state.doc.attrs.wordTableStyleRegistry);
  let index = 0;
  editor.state.doc.descendants(table => {
    if (table.type.name !== "wordTable") return true;
    const element = elements[index++];
    if (!element || !Object.values(blockTableStyleIds).includes(table.attrs.tableStyle)) return true;
    const styles = resolveWordTableCellHtmlStyles(table, createWordTableMap(table), registry);
    for (const style of styles ?? []) {
      const cell = element.rows[style.rowIndex]?.cells[style.cellIndex];
      if (!cell) continue;
      cell.setAttribute("style", [cell.getAttribute("style") ?? "", style.style,
        ...(style.text?.fontWeight === "bold" ? ["font-weight: bold"] : [])].join("; "));
    }
    return true;
  });
  return root.innerHTML;
}
