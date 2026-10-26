import type { QuireNodeViewRendererProps } from "@quirekit/core";
import type { BlockCodeState, BlockCodeSurface } from "./types";
import { codeDisplay, sameCodeDisplay } from "./display";

/**
 * Splits framework controls from document-owned editable text.
 * @param props - Retained node owner and live position resolver.
 * @param changed - Publishes header attribute/permission changes only.
 * @param removed - Detaches the header when this node leaves the document.
 * @returns Stable NodeView with one canonical editing/history owner.
 */
export function createBlockCodeSurface(props: QuireNodeViewRendererProps, changed: () => void, removed: () => void): BlockCodeSurface {
  const document = props.view.dom.ownerDocument, { editor } = props;
  const dom = document.createElement("div"), header = document.createElement("div"), pre = document.createElement("pre"), contentDOM = document.createElement("code");
  dom.className = "qk-block-code"; dom.dataset.qkNotProse = "";
  header.contentEditable = "false"; header.className = "qk-block-code__header";
  header.dataset.blockRailAnchor = "";
  pre.className = "qk-block-code__source"; contentDOM.className = "qk-block-code__text";
  pre.append(contentDOM); dom.append(header, pre);
  let node = props.node, disposed = false;
  let state: BlockCodeState = { language: String(node.attrs.language ?? ""), readOnly: !editor.isEditable, ...codeDisplay(node.attrs) };
  /** Applies layout attributes without recreating the canonical editable subtree. */
  function project(): void {
    dom.dataset.wrap = String(state.wrap); dom.dataset.lineNumbers = String(state.lineNumbers); dom.dataset.theme = state.theme;
    pre.style.maxHeight = state.height ? `${state.height}px` : "";
  }
  project();
  return {
    dom, header, contentDOM,
    /** @returns Stable header projection. */
    snapshot() { return state; },
    /** @returns Current source only at the explicit copy boundary. */
    getCode() { return disposed ? "" : node.textContent; },
    /** @param language - Requested grammar. @returns Whether the exact source owner accepted it. */
    setLanguage(language) {
      const position = props.getPos();
      return !disposed && position !== undefined && editor.commands.setBlockCodeLanguage({ position, expected: state.language, language });
    },
    /** @param patch - Changed persistent settings. @returns Whether the exact code owner accepted it. */
    setDisplay(patch) {
      const position = props.getPos();
      return !disposed && position !== undefined && editor.commands.setBlockCodeDisplay({ position, expected: state, patch });
    },
    /** @param next - Latest immutable source node. @returns Whether this retained view remains valid. */
    update(next) {
      if (disposed || next.type !== node.type) return false;
      node = next;
      const language = String(node.attrs.language ?? "");
      const display = codeDisplay(node.attrs);
      if (language !== state.language || !sameCodeDisplay(display, state)) { state = { ...state, ...display, language }; project(); changed(); }
      this.syncEditable(); return true;
    },
    /** Avoids header rerendering on ordinary typing and selection movement. */
    syncEditable() {
      if (disposed || state.readOnly === !editor.isEditable) return;
      state = { ...state, readOnly: !editor.isEditable }; changed();
    },
    /** @param event - Native input. @returns Header ownership only; code remains owned by the View. */
    stopEvent(event) { return header.contains(event.target as Node | null); },
    /** @param mutation - Native observation. @returns Whether framework chrome owns this mutation. */
    ignoreMutation(mutation) { return header.contains(mutation.target) || (mutation.type === "attributes" && mutation.target === dom); },
    /** Revokes actions before the retained owner is removed. */
    destroy() { if (!disposed) { disposed = true; removed(); } }
  };
}
