import type { EditorView, ViewUpdate } from "@quirekit/cm-view";
import { sourceProxyState } from "./state";
import type { SourceInputOwner } from "./types";

/** Native hosts are view-local resources, never serialized editor state. */
export const sourceInputOwners = new WeakMap<EditorView, SourceInputOwner>();

/** @param view - Mounted source view. @returns Its current keyboard host, including isolated mobile input. */
export function sourceInputElement(view: EditorView): HTMLElement {
  const owner = sourceInputOwners.get(view);
  return owner?.active ? owner.input : view.contentDOM;
}

/** @param view - Mounted source view. @returns Whether the current source keyboard owner actually has focus. */
export function sourceInputHasFocus(view: EditorView): boolean {
  const owner = sourceInputOwners.get(view);
  return owner?.active ? view.dom.ownerDocument.hasFocus() && view.root.activeElement === owner.input : view.hasFocus;
}

/** @param update - Accepted native or isolated focus metadata. @returns Whether the logical source input focus changed. */
export function sourceInputFocusChanged(update: ViewUpdate): boolean {
  return update.focusChanged || update.startState.field(sourceProxyState, false)?.focused !== update.state.field(sourceProxyState, false)?.focused;
}

/** @param view - Current source authority. */
export function focusSourceView(view: EditorView): void {
  const owner = sourceInputOwners.get(view);
  if (owner?.active) owner.focus(); else view.focus();
}

/**
 * Measures only a transient preedit's tail, otherwise leaves canonical CM geometry to the caller.
 * @param view - Source and owner-document authority.
 * @returns Current composition caret in client CSS coordinates, or null without visible preedit.
 */
export function sourceInputCaret(view: EditorView): DOMRect | null {
  const element = view.contentDOM.querySelector("[data-msfe-preedit]"), node = element?.firstChild;
  if (!element || !node) return null;
  const range = view.dom.ownerDocument.createRange();
  range.setStart(node, node.textContent?.length ?? 0); range.collapse(true);
  const rect = range.getBoundingClientRect();
  if (rect.height) return rect;
  const bounds = element.getBoundingClientRect();
  return new view.dom.ownerDocument.defaultView!.DOMRect(bounds.right, bounds.top, 0, bounds.height);
}
