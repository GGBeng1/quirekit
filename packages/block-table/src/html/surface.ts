import type { QuireNodeViewRendererProps } from "@quirekit/core";
import { DOMSerializer, type Node } from "@quirekit/pm";
import { createWordTableMap, type WordTableGridColumn } from "@quirekit/classic-table-model";
import { tableWidthCss } from "./width";

/** @param props - Canonical table node owner. @returns Retained table shell; View alone owns editable cells. */
export function createBlockTableSurface(props: QuireNodeViewRendererProps) {
  const document = props.view.dom.ownerDocument;
  const rendered = DOMSerializer.renderSpec(document, props.node.type.spec.toDOM!(props.node));
  const dom = rendered.dom as HTMLTableElement, contentDOM = rendered.contentDOM!;
  const columns = document.createElement("colgroup");
  dom.insertBefore(columns, contentDOM);
  let node = props.node;
  /** @param next - Latest immutable source. Updates only non-editable column sizing. */
  function project(next: Node): void {
    const grid = next.attrs.grid as readonly WordTableGridColumn[] | null;
    const count = createWordTableMap(next).width;
    while (columns.children.length > count) columns.lastElementChild!.remove();
    while (columns.children.length < count) columns.append(document.createElement("col"));
    Array.from(columns.children).forEach((col, index) => {
      (col as HTMLElement).style.width = tableWidthCss(grid?.[index]?.width) ?? "";
    });
    const shell = DOMSerializer.renderSpec(document, next.type.spec.toDOM!(next)).dom as HTMLElement;
    dom.style.cssText = shell.style.cssText;
    if (shell.dataset.blockTableStyle) dom.dataset.blockTableStyle = shell.dataset.blockTableStyle;
    else delete dom.dataset.blockTableStyle;
  }
  project(node);
  return {
    dom, contentDOM,
    /** @param next - Latest source table. @returns Whether the retained content owner is compatible. */
    update(next: Node) { if (next.type !== node.type) return false; if (next.attrs !== node.attrs || structureChanged(node, next)) project(next); node = next; return true; },
    /** @param mutation - Observed native change. @returns Whether only the non-editable sizing shell changed. */
    ignoreMutation(mutation: MutationRecord | { type: "selection"; target: globalThis.Node }) {
      return columns.contains(mutation.target) || (mutation.type === "attributes" && mutation.target === dom);
    }
  };
}

/** @param previous - Previously projected table. @param next - Next source. @returns Whether grid ownership changed, ignoring text-only edits. */
function structureChanged(previous: Node, next: Node): boolean {
  if (previous.childCount !== next.childCount) return true;
  for (let row = 0; row < next.childCount; row++) {
    const before = previous.child(row), after = next.child(row);
    if (before === after) continue;
    if (before.attrs !== after.attrs || before.childCount !== after.childCount) return true;
    for (let cell = 0; cell < after.childCount; cell++) {
      if (before.child(cell).attrs.gridSpan !== after.child(cell).attrs.gridSpan) return true;
    }
  }
  return false;
}
