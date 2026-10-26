import type { Editor } from "@quirekit/core";

/**
 * Returns focus after a public control closes, without stealing a later interaction.
 * @param editor - Session whose command has already committed.
 */
export function restoreBlockEditorFocus(editor: Editor): void {
  if (!editor.mountedView) return;
  const view = editor.view, document = view.dom.ownerDocument;
  const origin = document.activeElement;
  // Public controls finish their own focus restoration in the next frame.
  // Queue after their current event, then recheck ownership before handing off.
  queueMicrotask(() => {
    /** Restores only the original control's still-current focus lease. */
    const restore = (): void => {
      if (editor.isDestroyed || editor.mountedView !== view) return;
      const active = document.activeElement;
      if (active === origin || active === document.body || view.hasFocus()) view.focus();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(restore);
    else restore();
  });
}
