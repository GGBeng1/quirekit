import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { dataViewPreview } from "@quirekit/data-view";
import type { DataViewOptions } from "./types";
import { openDataView } from "./open";

/** Mounts a static, source-backed preview; data queries run only when the node changes.
 * @param props - Document node view lifecycle.
 * @param options - Host task hook.
 * @returns Disposable node view.
 */
export function dataViewNodeView(props: QuireNodeViewRendererProps, options: DataViewOptions) {
  const document = props.view.dom.ownerDocument, dom = document.createElement("figure");
  dom.contentEditable = "false"; dom.tabIndex = 0; dom.dataset.qkDataView = "true";
  dom.style.cssText = "margin:16px 0;padding:16px;border:1px solid #cbd5e1;border-radius:8px;overflow:auto;cursor:pointer";
  let last: Node | undefined;
  /** @param node - Latest source. @returns Whether the view accepts the node. */
  function update(node: Node): boolean {
    if (node.type.name !== "dataView") return false;
    if (node === last) return true; last = node; dom.replaceChildren();
    try {
      const preview = dataViewPreview(node.attrs.dataView), title = document.createElement("figcaption"), table = document.createElement("table"), note = document.createElement("small");
      title.textContent = preview.title; note.textContent = `${preview.notice} · 双击编辑`;
      for (const row of preview.rows) { const tr = document.createElement("tr"); for (const cell of row) { const td = document.createElement("td"); td.textContent = cell; td.style.cssText = "padding:7px 12px;max-width:220px;overflow-wrap:anywhere"; tr.append(td); } table.append(tr); }
      dom.append(title, table, note); dom.setAttribute("aria-label", `${preview.title}，双击编辑`);
    } catch { dom.textContent = "多维表格格式暂不支持，原始数据已保留。"; }
    return true;
  }
  /** @param event - Explicit activation, leaving selection to the parent editor. */
  function activate(event: Event): void {
    if (event.type === "keydown" && (event as KeyboardEvent).key !== "Enter") return;
    const position = props.getPos(); if (position !== undefined && openDataView(props.editor, options.open, position)) { event.preventDefault(); event.stopPropagation(); }
  }
  dom.addEventListener("dblclick", activate); dom.addEventListener("keydown", activate); update(props.node);
  return {dom, update,
    /** @returns Static DOM cannot author document changes. */ ignoreMutation() { return true; },
    /** Removes native listeners. */ destroy() { dom.removeEventListener("dblclick", activate); dom.removeEventListener("keydown", activate); }
  };
}
