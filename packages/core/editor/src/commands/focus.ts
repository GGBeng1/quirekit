import { isTextSelection, resolveFocusPosition } from "../helpers";
import type { QuireEditor } from "../Editor";
import type { CommandSpec, QuireFocusPosition } from "../types";

/** Options accepted by the Tiptap-compatible focus command. */
interface QuireFocusCommandOptions {
  /** Whether the focused position should be scrolled into view. */
  readonly scrollIntoView?: boolean | undefined;
}

/**
 * Focuses the active mounted view and optionally moves the selection first.
 *
 * @param context - Current command execution context.
 * @param position - Optional focus position.
 * @param options - Optional focus behavior.
 * @returns Whether the command was handled.
 */
export const focus: CommandSpec = (position = null, options = {}) => (context) => {
  const focusPosition = position as QuireFocusPosition;
  const focusOptions = {
    scrollIntoView: true,
    ...(typeof options === "object" && options !== null
      ? options as QuireFocusCommandOptions
      : {})
  };

  try {
    if ((context.editor.view.hasFocus() && focusPosition === null) || focusPosition === false) {
      return true;
    }
  } catch {
    return false;
  }

  if (focusPosition === null && !isTextSelection(context.state.selection)) {
    scheduleMountedViewFocus(context.editor);

    return true;
  }

  const selection =
    resolveFocusPosition(context.tr.doc, focusPosition) ??
    context.state.selection;
  const isSameSelection = context.state.selection.eq(selection);

  if (!isSameSelection) {
    context.tr.setSelection(selection);
  } else if (context.tr.storedMarks) {
    context.tr.setStoredMarks(context.tr.storedMarks);
  }

  if (focusOptions.scrollIntoView) {
    context.tr.scrollIntoView();
  }

  if (!isSameSelection || focusOptions.scrollIntoView) {
    context.dispatch?.(context.tr);
  }

  scheduleMountedViewFocus(context.editor);

  return true;
};

/**
 * Focuses the mounted input after the command manager applies its transaction.
 *
 * Browser focus events synchronously dispatch their own editor transaction. A
 * deferred focus keeps that transaction from overtaking the selection transaction
 * still held by the command manager. Headless runtimes use the same ordering via
 * a microtask when animation frames are unavailable.
 *
 * @param editor - Editor whose mounted view should receive input focus.
 */
function scheduleMountedViewFocus(editor: QuireEditor): void {
  /** Focuses the current view unless the owning editor was destroyed meanwhile. */
  function focusMountedView(): void {
    if (!editor.isDestroyed) editor.view.focus();
  }

  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(focusMountedView);
    return;
  }

  queueMicrotask(focusMountedView);
}
