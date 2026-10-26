import { WidgetType, type EditorView } from "@quirekit/cm-view";

/** Empty and omitted cells keep the same grid without adding source characters. */
export class TableSpacer extends WidgetType {
  /** @param column - Zero-based semantic column for explicit activation. @param role - Optional locked reading role. */
  constructor(readonly column: number, readonly role?: "cell" | "columnheader") { super(); }
  /** @param other - Previous placeholder. @returns Whether geometry is identical. */
  eq(other: TableSpacer): boolean { return other.column === this.column && other.role === this.role; }
  /** @param view - Canonical owner. @returns A source-free grid spacer. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = "msfe-table-cell msfe-table-empty";
    span.setAttribute("data-msfe-caret-slot", "");
    span.dataset.tableColumn = String(this.column);
    span.style.width = `var(--msfe-table-col-${this.column}, calc(100% / var(--msfe-table-columns)))`;
    span.textContent = "\u200b";
    if (this.role) { span.setAttribute("role", this.role); span.setAttribute("aria-colindex", String(this.column + 1)); }
    else span.setAttribute("aria-hidden", "true");
    return span;
  }
  /** @returns CodeMirror retains all selection events. */
  ignoreEvent(): boolean { return false; }
}
