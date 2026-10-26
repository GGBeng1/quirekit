import type { Editor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";

const listeners = new WeakMap<HTMLElement, (selected: boolean) => void>();

/**
 * Registers one surface without subscribing every mounted card to editor transactions.
 * @param root - Exact retained card.
 * @param changed - Notified only when this card enters or leaves the canonical selection.
 * @returns Local cleanup.
 */
export function observeBlockObjectSelection(root: HTMLElement, changed: (selected: boolean) => void): () => void {
  listeners.set(root, changed); changed(root.dataset.selected === "true");
  return () => { if (listeners.get(root) === changed) listeners.delete(root); };
}

/** @param root - The previous or next selected card. @param selected - Canonical selection presentation. */
function project(root: HTMLElement | null, selected: boolean): void {
  if (!root) return;
  if (selected) root.dataset.selected = "true"; else delete root.dataset.selected;
  listeners.get(root)?.(selected);
}

/**
 * Projects one canonical atom selection without measuring or scanning the document.
 * @param editor - Mounted HTML session whose rich cards have their own frame.
 * @returns Cleanup for the host's single selection subscription.
 */
export function trackBlockObjectSelection(editor: Editor): () => void {
  let current: HTMLElement | null = null, host: HTMLElement | null = null;
  let previousSelection = editor.state.pm.selection, previousDoc = editor.state.doc, previousEditable = editor.isEditable;
  let initialized = false, stopped = false, pending = true;
  let releaseGeometry: (() => void) | undefined;
  /** Resolves one retained DOM node only after the mounted view commits its projection. */
  function flush(): void {
    if (stopped || !pending && (!current || current.isConnected)) return;
    pending = false;
    const selection = editor.state.pm.selection;
    const dom = editor.isEditable && selection instanceof NodeSelection && selection.node.isAtom ? editor.view.nodeDOM?.(selection.from) : null;
    const next = dom instanceof HTMLElement && dom.matches(".qk-block-rich") ? dom : null;
    if (current === next) return;
    project(current, false); current = next; project(current, true);
    // The card frame replaces the generic full-node text-selection wash. Image
    // frames keep their existing token on the outer viewport; removing this
    // local override restores that inherited presentation when selection moves.
    host?.style.removeProperty("--qk-block-selection-fill");
    host = current ? editor.view.dom : null;
    host?.style.setProperty("--qk-block-selection-fill", "transparent");
  }
  /** Invalidates presentation without resolving positions against the previous rendered document. */
  function sync(): void {
    const selection = editor.state.pm.selection, doc = editor.state.doc, editable = editor.isEditable;
    if (initialized && selection === previousSelection && doc === previousDoc && editable === previousEditable && (!current || current.isConnected)) return;
    initialized = true; previousSelection = selection; previousDoc = doc; previousEditable = editable;
    pending = true;
    // Core emits before View reconciliation, which may wait for a frame. Clearing
    // is safe immediately; resolving a new node belongs to committed geometry.
    if (!editable || !(selection instanceof NodeSelection && selection.node.isAtom)) flush();
  }
  /** Binds the current mounted view and projects its already committed initial state. */
  function mount(): void {
    releaseGeometry?.(); releaseGeometry = editor.mountedView?.onGeometryUpdate?.(flush);
    pending = true; flush();
  }
  /** Clears presentation before the current view is removed or replaced. */
  function unmount(): void {
    releaseGeometry?.(); releaseGeometry = undefined;
    project(current, false); current = null; host?.style.removeProperty("--qk-block-selection-fill"); host = null;
  }
  editor.on("transaction", sync); editor.on("update", sync);
  editor.on("mount", mount); editor.on("unmount", unmount); sync(); mount();
  return () => {
    if (stopped) return; stopped = true;
    editor.off("transaction", sync); editor.off("update", sync);
    editor.off("mount", mount); editor.off("unmount", unmount); unmount();
  };
}
