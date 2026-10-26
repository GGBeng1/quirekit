import { getMarkRange, type Editor } from "@quirekit/core";
import { webURL } from "../../rich-content/urls";

/**
 * Observes only one pending URL paste; clipboard normalization can complete asynchronously.
 * @param editor - Mounted document owner.
 * @param root - This editor's visible document subtree.
 * @param open - Shared task entry for the accepted link.
 * @returns Cleanup, including an unfinished paste and its geometry listener.
 */
export function observePastedWebLink(editor: Editor, root: HTMLElement, open: () => void): () => void {
  const owner = root.ownerDocument;
  let release: (() => void) | undefined;
  /** @param event - Native clipboard input, never synthetic document mutation. */
  function pasted(event: ClipboardEvent): void {
    release?.();
    const url = webURL(event.clipboardData?.getData("text/plain"));
    if (!url || !editor.isEditable || !editor.mountedView?.hasFocus() || !editor.state.schema.nodes.webCard) return;
    const source = editor.state.doc, position = editor.state.pm.selection.from;
    let releaseGeometry: (() => void) | undefined;
    /** Cancels the pending task when later input takes over; no idle document subscription remains. */
    function stop(): void {
      releaseGeometry?.();
      editor.off("unmount", stop);
      owner.removeEventListener("pointerdown", stop, true); owner.removeEventListener("keydown", stop, true);
      release = undefined;
    }
    /** Resolves the accepted link after the View has reconciled its DOM for anchoring. */
    function finish(): void {
      if (editor.state.doc === source) return;
      stop();
      if (editor.isDestroyed || !root.isConnected || !editor.isEditable) return;
      const { doc, selection, schema } = editor.state.pm, type = schema.marks.link;
      if (!type || doc === source || selection.to <= position) return;
      // Native paste may retain a selection over the inserted text or collapse at its end.
      const range = getMarkRange(doc.resolve(selection.to - 1), type, { href: url });
      if (range && range.from === position && range.to === selection.to && (selection.empty || selection.from === range.from)) { editor.commands.setTextSelection(range); open(); }
    }
    // Core accepts paste before the HTML view reconciles. The committed geometry
    // notification is the authority for resolving the new link's DOM positions.
    release = stop;
    releaseGeometry = editor.mountedView?.onGeometryUpdate?.(finish);
    editor.on("unmount", stop);
    owner.addEventListener("pointerdown", stop, true); owner.addEventListener("keydown", stop, true);
  }
  // The View's native input bridge may sit outside the visible document subtree.
  owner.addEventListener("paste", pasted, true);
  return () => { release?.(); owner.removeEventListener("paste", pasted, true); };
}
