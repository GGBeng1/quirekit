import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import type { TextDiagramOptions } from "./types";
import { readTextDiagramNode, textDiagramPreviewHtml } from "./source";
import { openTextDiagram } from "./session";

/** @param props - Mounted HTML owner. @param options - Product task factory. @returns Static retained view without a drawing runtime. */
export function textDiagramNodeView(props: QuireNodeViewRendererProps, options: TextDiagramOptions) {
  const dom = props.view.dom.ownerDocument.createElement("figure");
  dom.dataset.qkTextDiagram = "true"; dom.contentEditable = "false"; dom.tabIndex = 0;
  dom.style.cssText = "margin:16px 0;width:100%;max-width:720px;overflow:hidden;border:1px solid var(--qk-color-border-subtle,#e2e8f0);border-radius:8px;background:white;cursor:pointer";
  /** @param node - Latest immutable atom. @returns Whether the view accepted the node. */
  function update(node: Node): boolean {
    if (node.type.name !== "textDiagram") return false;
    const diagram = readTextDiagramNode(node);
    dom.setAttribute("aria-label", `${diagram?.title ?? "文本绘图"}，双击编辑`);
    dom.style.aspectRatio = diagram?.preview ? `${diagram.preview.width}/${diagram.preview.height}` : "12/7";
    // Match the retained layout's document bounds, independently of raster density.
    dom.style.maxWidth = `${Math.min(720, 460 * (diagram?.preview ? diagram.preview.width / diagram.preview.height : 12 / 7))}px`;
    dom.innerHTML = textDiagramPreviewHtml(diagram); return true;
  }
  /** @param event - Explicit activation of the selected preview. */
  function activate(event: Event): void {
    if (event.type === "keydown" && (event as KeyboardEvent).key !== "Enter") return;
    const position = props.getPos(); if (position === undefined) return;
    if (openTextDiagram(props.editor, options.open, position)) { event.preventDefault(); event.stopPropagation(); }
  }
  /** @param event - Pointer intent owned by this atomic preview. */
  function select(event: PointerEvent): void {
    if (event.button !== 0 || event.shiftKey) return;
    const position = props.getPos(); if (position === undefined) return;
    // A restored document may leave the text cursor far from this object.
    // Select the atom before focusing so the input proxy cannot scroll that old
    // text cursor under the second click. No graph or content work is needed.
    if (props.editor.commands.setNodeSelection(position)) {
      event.preventDefault(); event.stopPropagation(); props.view.focus();
    }
  }
  dom.addEventListener("pointerdown", select); dom.addEventListener("dblclick", activate); dom.addEventListener("keydown", activate); update(props.node);
  return { dom, update,
    /** Projects host object selection onto its inert preview. */
    selectNode() { dom.style.outline = "2px solid var(--qk-color-action-primary,#2563eb)"; },
    /** Clears selection appearance without changing source. */
    deselectNode() { dom.style.outline = ""; },
    /** @param event - Native preview event. @returns Whether activation belongs to this view. */
    stopEvent(event: Event) { return (event.type === "pointerdown" && (event as PointerEvent).button === 0 && !(event as PointerEvent).shiftKey)
      || event.type === "dblclick" || (event.type === "keydown" && (event as KeyboardEvent).key === "Enter"); },
    /** @returns Static preview mutations never become document edits. */
    ignoreMutation() { return true; },
    /** Releases native activation listeners. */
    destroy() { dom.removeEventListener("pointerdown", select); dom.removeEventListener("dblclick", activate); dom.removeEventListener("keydown", activate); }
  };
}
