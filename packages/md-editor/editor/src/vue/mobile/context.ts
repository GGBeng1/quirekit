import { watch, type Ref } from "vue";
import { EditorView } from "@quirekit/cm-view";
import type { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";

/**
 * Reveals an already mounted caret only when its active task would cover it.
 * @param editor - Current source and native scrolling owner.
 * @param state - Existing accepted selection, without reading document content.
 * @param surface - Public physical task content; null releases all geometry work.
 * @param root - Explicit product instance for temporary document-tail space.
 * @param fixed - Only document layout admits page-wide bottom obstruction.
 */
export function useMobileTaskContext(editor: Readonly<Ref<MsfeEditor>>, state: Readonly<Ref<EditorState>>, surface: Readonly<Ref<HTMLElement | null>>, root: Readonly<Ref<HTMLElement | null>>, fixed: Readonly<Ref<boolean>>): void {
  watch([editor, surface, root, fixed], ([owner, shell, element, documentLayout], _previous, cleanup) => {
    const win = shell?.ownerDocument.defaultView;
    if (!shell || !win) return;
    const lifetime = owner.documentScope;
    let frame = 0;
    // Read one client-space task box and one visible native endpoint. Off-screen
    // range heads (including Select all) never force a jump to the document end.
    function measure(): void {
      frame = 0;
      const view = EditorView.findFromDOM(owner.element), head = owner.state.selection.main.head;
      if (owner.documentScope !== lifetime || owner.mode === "locked" || owner.state.readOnly || !shell!.isConnected
        || !shell!.ownerDocument.hasFocus() || !view || view.composing || !view.visibleRanges.some(range => head >= range.from && head <= range.to)) return;
      const bounds = shell!.getBoundingClientRect(), caret = view.coordsAtPos(head);
      // Scroll margins describe obstruction, but cannot create room at document
      // end. Extend only this product's existing tail, then let native scroll own
      // the correction; identical geometry performs no repeated style write.
      if (documentLayout && element && bounds.height > 0) {
        const space = `${Math.max(0, win!.innerHeight - bounds.top) + 12}px`;
        if (element.style.getPropertyValue("--md-editor-task-height") !== space) element.style.setProperty("--md-editor-task-height", space);
      }
      if (caret && bounds.height > 0 && bounds.top < caret.bottom + 12 && bounds.bottom > caret.top
        && bounds.left < caret.right + 1 && bounds.right > caret.left) owner.scrollTo(head);
    }
    /** Coalesces actual task/selection changes; hidden source transactions have no listener. */
    function schedule(): void { if (!frame) frame = win!.requestAnimationFrame(measure); }
    /** @param event - Only the shell's own enter/resize transition can remeasure its box. */
    function settled(event: Event): void { if (event.target === shell) schedule(); }
    const observer = new win.ResizeObserver(schedule); observer.observe(shell);
    shell.addEventListener("transitionend", settled); shell.addEventListener("animationend", settled);
    const stop = watch(() => state.value.selection, schedule);
    schedule();
    cleanup(() => { stop(); observer.disconnect(); if (frame) win.cancelAnimationFrame(frame); element?.style.removeProperty("--md-editor-task-height");
      shell.removeEventListener("transitionend", settled); shell.removeEventListener("animationend", settled); });
  }, { immediate: true, flush: "post" });
}
