import type { EditorView } from "@quirekit/cm-view";

/**
 * Releases only an accidental native Range in noneditable source; embedded inputs retain theirs.
 * @param view - Current isolated display owner.
 * @param active - Current proxy admission guard, independent of keyboard focus.
 * @returns Listener cleanup without touching canonical selection or history.
 */
export function guardSourceNativeSelection(view: EditorView, active: () => boolean): () => void {
  const doc = view.dom.ownerDocument;
  /** @param node - Current native endpoint. @returns Whether noneditable source owns it. */
  function sourceEndpoint(node: Node | null): boolean {
    if (!node || !view.contentDOM.contains(node)) return false;
    const element = node.nodeType === 1 ? node as Element : node.parentElement;
    return !element?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [data-qk-not-prose]");
  }
  /** A native selectionchange has only two endpoints; no text/layout/state work occurs. */
  function release(): void {
    if (!active()) return;
    const range = doc.getSelection();
    if (range?.rangeCount && (sourceEndpoint(range.anchorNode) || sourceEndpoint(range.focusNode))) range.removeAllRanges();
  }
  doc.addEventListener("selectionchange", release);
  // A deferred UIKit selection may arrive after blur; ownership is still the
  // isolated display, so the lifetime listener remains active until handoff.
  return () => doc.removeEventListener("selectionchange", release);
}
