import { bindBlockNodeLocale, blockEditorText } from "../localization/node-view";
import type { Editor, QuireNodeViewRendererProps } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import type { RichContentRenderer, RichContentSurface } from "./types";
const renderers = new WeakMap<Editor, RichContentRenderer>();
/** @param editor - Owner. @param render - Provider-preserving Vue portal factory. @returns Release. */
export function registerRichContentRenderer(editor: Editor, render: RichContentRenderer): () => void {
  renderers.set(editor, render); return () => { if (renderers.get(editor) === render) renderers.delete(editor); };
}
/** @param props - Public NodeView contract. @returns Retained mount. */
export function renderRichContent(props: QuireNodeViewRendererProps): RichContentSurface {
  return renderers.get(props.editor)?.(props) ?? createRichContentSurface(props, () => {}, () => {});
}
/** @param props - Source view. @param changed - Attrs change callback. @param removed - Portal cleanup. @returns Owned mount. */
export function createRichContentSurface(props: QuireNodeViewRendererProps, changed: () => void, removed: () => void): RichContentSurface {
  let node = props.node, disposed = false;
  const document = props.view.dom.ownerDocument, dom = document.createElement(node.isInline ? "span" : "section"), portal = document.createElement(node.isInline ? "span" : "div");
  const columns = node.type.name === "blockColumns", contentDOM = columns ? document.createElement("div") : undefined;
  dom.className = columns ? "qk-block-columns" : "qk-block-rich";
  if (node.isInline) dom.classList.add("qk-inline-attachment");
  dom.dataset.qkRich = node.type.name;
  portal.contentEditable = "false"; portal.dataset.qkNotProse = ""; portal.className = "qk-block-rich__portal";
  dom.append(portal);
  if (contentDOM) { contentDOM.className = "qk-block-columns__body"; dom.append(contentDOM); }
  else { dom.contentEditable = "false"; dom.tabIndex = 0; }
  /** Selects the canonical atom without adding history or repeating an unchanged selection. */
  function select(): void {
    const pos = disposed ? undefined : props.getPos(), selection = props.editor.state.pm.selection;
    if (pos !== undefined && !(selection instanceof NodeSelection && selection.from === pos)) props.editor.commands.setNodeSelection(pos);
  }
  /** @param event - Card input; nested controls keep their own focus and default actions. */
  function pointer(event: PointerEvent): void {
    if (disposed || columns || event.defaultPrevented || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const interactive = event.target instanceof Element && event.target.closest("button,input,textarea,select,a,audio,video,iframe,[role=slider],[role=combobox],[data-rich-interactive]");
    if (props.editor.isEditable) { select(); if (!interactive) props.view.focus(); }
    // The player owns all of its pointer input, including seek-track presses.
    // Selecting its atom must not cancel playback, dragging or browser focus.
    if (!interactive) event.preventDefault();
  }
  /** @param event - Keyboard activation of the focusable card shell, not of a nested control. */
  function key(event: KeyboardEvent): void {
    if (disposed || columns || !props.editor.isEditable || event.target !== dom || event.defaultPrevented || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || !["Enter", " "].includes(event.key)) return;
    select(); props.view.focus(); event.preventDefault();
  }
  dom.addEventListener("pointerdown", pointer, true); dom.addEventListener("keydown", key);
  /** Projects only this node's grid; selection-only updates do no work. */
  function project(): void {
    if (contentDOM) contentDOM.style.gridTemplateColumns = Array.from({ length: node.childCount }, (_, i) => `minmax(0,${Number(node.attrs.widths?.[i]) || 1}fr)`).join(" ");
    else if (!renderers.has(props.editor)) portal.textContent = String(node.attrs.title || node.attrs.caption || node.attrs.items?.[0]?.name || blockEditorText(props.editor, "媒体内容"));
  }
  project();
  const releaseLocale = !columns && !renderers.has(props.editor) ? bindBlockNodeLocale(props.editor, project) : () => {};
  return { dom, portal, ...(contentDOM ? { contentDOM } : {}), editor: props.editor,
    snapshot: () => node,
    position: () => disposed ? undefined : props.getPos(),
    update(next) { if (disposed || next.type !== node.type) return false; const different = next.attrs !== node.attrs || next.childCount !== node.childCount; node = next; if (different) { project(); changed(); } return true; },
    stopEvent: event => (event.type === "pointerdown" || event.type === "keydown") && event.defaultPrevented || portal.contains(event.target as globalThis.Node) && !!(event.target as Element)?.closest?.("button,input,textarea,select,a,audio,video,iframe,[data-rich-interactive]"),
    ignoreMutation: mutation => portal.contains(mutation.target) || mutation.type === "attributes" && (mutation.target === dom || mutation.target === contentDOM),
    destroy() { if (!disposed) { disposed = true; releaseLocale(); dom.removeEventListener("pointerdown", pointer, true); dom.removeEventListener("keydown", key); removed(); } }
  };
}
