import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import { whiteboardPreviewSize, whiteboardPreviewMessages, type WhiteboardActionsHandle } from "@quirekit/whiteboard";
import type { WhiteboardOptions } from "./types";
import { readWhiteboardNode, whiteboardPreviewHtml } from "./source";
import { openWhiteboard } from "./session";

/** @param props - Mounted HTML owner. @param options - Product task factory. @returns Static retained view without a drawing runtime. */
export function whiteboardNodeView(props: QuireNodeViewRendererProps, options: WhiteboardOptions) {
  const dom = props.view.dom.ownerDocument.createElement("figure");
  const preview = dom.ownerDocument.createElement("div"), toolbar = dom.ownerDocument.createElement("div");
  preview.style.cssText = "width:100%;height:100%";
  toolbar.style.cssText = "position:absolute;top:8px;right:8px;z-index:3;max-width:calc(100% - 16px);border-radius:8px;background:var(--qk-color-surface-page,#fff);box-shadow:0 2px 10px #0002";
  dom.append(preview, toolbar);
  let board = readWhiteboardNode(props.node), actions: WhiteboardActionsHandle | undefined;
  /** Supplies current facts while callbacks revalidate the exact mounted node at execution. */
  function refreshActions(): void {
    if (!board) return;
    const state = { document: board, readOnly: !props.editor.isEditable,
      edit() { const position = props.getPos(); if (position !== undefined) openWhiteboard(props.editor, options.open, position); },
      rename() { const position = props.getPos(); if (position !== undefined) openWhiteboard(props.editor, options.rename ?? null, position); } };
    if (actions) actions.update(state);
    else actions = options.mountActions?.(toolbar, state);
  }
  /** Releases the transient toolbar without affecting the retained image. */
  function hideActions(): void { actions?.destroy(); actions = undefined; }
  /** @param event - Focus leaving the preview and its controls. */
  function blur(event: FocusEvent): void { if (!dom.contains(event.relatedTarget as globalThis.Node | null)) hideActions(); }
  /** @param event - Explicit pointer activation in a DOM overlay or ordinary DOM view. */
  function select(event: MouseEvent): void {
    if (toolbar.contains(event.target as globalThis.Node)) return;
    const position = props.getPos(); if (position === undefined) return;
    props.editor.commands.setNodeSelection(position);
    dom.focus({ preventScroll: true }); refreshActions();
  }
  dom.dataset.qkWhiteboard = "true"; dom.contentEditable = "false"; dom.tabIndex = 0;
  dom.style.cssText = "position:relative;margin:16px 0;width:100%;overflow:hidden;border:1px solid var(--qk-color-border-subtle,#e2e8f0);border-radius:8px;background:white;cursor:pointer";
  /** @param node - Latest immutable atom. @returns Whether the view accepted the node. */
  function update(node: Node): boolean {
    if (node.type.name !== "whiteboard") return false;
    board = readWhiteboardNode(node);
    const locale = props.view.dom.closest<HTMLElement>("[lang]")?.lang ?? "zh-CN", text = whiteboardPreviewMessages(locale);
    dom.setAttribute("aria-label", `${board?.title ?? text.name}${props.editor.isEditable ? ` · ${text.edit}` : ""}`);
    dom.style.aspectRatio = board?.preview ? `${board.preview.width}/${board.preview.height}` : "12/7";
    dom.style.maxWidth = `${whiteboardPreviewSize(board?.preview ?? null).width}px`;
    preview.innerHTML = whiteboardPreviewHtml(board, locale);
    if (actions) refreshActions();
    return true;
  }
  /** @param event - Explicit activation of the selected preview. */
  function activate(event: Event): void {
    if (toolbar.contains(event.target as globalThis.Node)) return;
    if (event.type === "keydown" && (event as KeyboardEvent).key !== "Enter") return;
    const position = props.getPos(); if (position === undefined) return;
    if (openWhiteboard(props.editor, options.open, position)) { event.preventDefault(); event.stopPropagation(); }
  }
  dom.addEventListener("focusin", refreshActions); dom.addEventListener("focusout", blur);
  dom.addEventListener("click", select);
  dom.addEventListener("dblclick", activate); dom.addEventListener("keydown", activate); update(props.node);
  return { dom, update,
    /** Projects host object selection onto its inert preview. */
    selectNode() { dom.style.outline = "2px solid var(--qk-color-action-primary,#2563eb)"; refreshActions(); },
    /** Clears selection appearance without changing source. */
    deselectNode() { dom.style.outline = ""; hideActions(); },
    /** @param event - Native preview event. @returns Whether activation belongs to this view. */
    stopEvent(event: Event) { return toolbar.contains(event.target as globalThis.Node) || event.type === "dblclick" || (event.type === "keydown" && (event as KeyboardEvent).key === "Enter"); },
    /** @returns Static preview mutations never become document edits. */
    ignoreMutation() { return true; },
    /** Releases native activation listeners. */
    destroy() { hideActions(); dom.removeEventListener("click", select); dom.removeEventListener("focusin", refreshActions); dom.removeEventListener("focusout", blur); dom.removeEventListener("dblclick", activate); dom.removeEventListener("keydown", activate); }
  };
}
