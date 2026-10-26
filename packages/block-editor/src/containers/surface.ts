import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { BlockContainerAttributes, BlockContainerState, BlockContainerSurface } from "./types";
import { blockContainerLabels, blockContainerTone } from "./attributes";

/**
 * Retains the canonical editable body while allowing provider-owned controls in its header.
 * @param props - Mounted owner with a live position resolver.
 * @param changed - Header projection change only.
 * @param removed - Header disposal notification.
 * @returns One contentDOM owner; no nested editor or persisted disclosure state.
 */
export function createBlockContainerSurface(props: QuireNodeViewRendererProps, changed: () => void, removed: () => void): BlockContainerSurface {
  const { editor } = props, document = props.view.dom.ownerDocument;
  const dom = document.createElement("section"), header = document.createElement("div"), contentDOM = document.createElement("div");
  dom.className = "qk-prose-container qk-block-container";
  header.className = "qk-prose-container__header"; header.contentEditable = "false";
  header.dataset.qkNotProse = ""; header.dataset.blockRailAnchor = "";
  contentDOM.className = "qk-prose-container__body"; contentDOM.dataset.qkContainerBody = "";
  dom.append(header, contentDOM);
  let node = props.node, disposed = false, expanded = node.attrs.kind !== "details" || props.decorations.some(item => item.spec.revealContainer);
  let state: BlockContainerState;
  /** Reprojects only attributes and local visibility, preserving all retained content children. */
  function project(): void {
    const attrs = node.attrs as BlockContainerAttributes;
    state = { ...attrs, editable: editor.isEditable, expanded };
    dom.dataset.qkBlockContainer = attrs.kind; dom.dataset.tone = blockContainerTone(attrs.kind);
    if (attrs.kind === "highlight") dom.dataset.qkProseHighlight = attrs.color; else delete dom.dataset.qkProseHighlight;
    if (attrs.textColor && attrs.kind === "highlight") dom.dataset.qkProseHighlightText = attrs.textColor; else delete dom.dataset.qkProseHighlightText;
    contentDOM.hidden = attrs.kind === "details" && !expanded;
    fallback.textContent = attrs.title || blockContainerLabels[attrs.kind];
    fallback.setAttribute("aria-expanded", String(expanded));
    changed();
  }
  // The fallback uses native controls; the Vue product replaces only this header.
  const fallback = document.createElement("button"); fallback.type = "button";
  fallback.textContent = node.attrs.title || blockContainerLabels[node.attrs.kind as BlockContainerAttributes["kind"]];
  header.append(fallback);
  const surface: BlockContainerSurface = {
    dom, header, contentDOM,
    /** @returns Current attribute and permission projection. */
    snapshot() { return state; },
    /** @returns Current canonical position while mounted. */
    position() { return disposed ? undefined : props.getPos(); },
    /** Moves an internal selection out before hiding its source. */
    toggle() {
      const position = surface.position();
      if (position === undefined || node.attrs.kind !== "details") return;
      const { from, to } = editor.state.pm.selection;
      if (expanded && from < position + node.nodeSize && to > position) editor.commands.setNodeSelection(position);
      expanded = !expanded; project();
    },
    /** @param next - Accepted source. @param decorations - Selected ancestor facts. @returns Whether this mount remains valid. */
    update(next, decorations) {
      if (disposed || next.type !== node.type) return false;
      const entering = decorations.some(item => item.spec.revealContainer);
      const different = next.attrs !== node.attrs || state.editable !== editor.isEditable || entering && !expanded;
      node = next;
      if (entering) expanded = true;
      if (different) project();
      return true;
    },
    /** Updates controls only when permission changes. */
    syncEditable() { if (!disposed && state.editable !== editor.isEditable) project(); },
    /** @param event - Native input. @returns Whether header controls own this event. */
    stopEvent(event) { return header.contains(event.target as globalThis.Node | null); },
    /** @param mutation - Retained DOM observation. @returns Whether header or visibility owns the mutation. */
    ignoreMutation(mutation) { return header.contains(mutation.target) || mutation.type === "attributes" && (mutation.target === dom || mutation.target === contentDOM); },
    /** Revokes callbacks before removing controls. */
    destroy() { if (!disposed) { disposed = true; removed(); } }
  };
  fallback.addEventListener("click", () => surface.toggle());
  // The initial synchronous projection cannot publish a header entry before it exists.
  state = { ...node.attrs as BlockContainerAttributes, editable: editor.isEditable, expanded };
  dom.dataset.qkBlockContainer = state.kind; dom.dataset.tone = blockContainerTone(state.kind);
  if (state.kind === "highlight") { dom.dataset.qkProseHighlight = state.color; if (state.textColor) dom.dataset.qkProseHighlightText = state.textColor; }
  contentDOM.hidden = state.kind === "details" && !expanded;
  return surface;
}
