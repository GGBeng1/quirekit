import type { EditorView } from "@quirekit/cm-view";
import { sourceInputCaret, sourceInputPosition, sourceCaretRect } from "@quirekit/msfe-core";
import type { QuireKitSelectionHandleGeometry, QuireKitSelectionHandlePoint, QuireKitSelectionHandlesSelection } from "@quirekit/ui";

/** Space reserved for the public grip's painted dot and touch target beyond the text caret. */
export const mobileHandleMargin = 32;

/**
 * Read only mounted endpoints in client space and project into the editor overlay.
 * @param view - Native selection, viewport and CSS scale authority.
 * @returns Up to two visible caret lines, or no visible geometry.
 */
export function measureMobileSelection(view: EditorView): QuireKitSelectionHandlesSelection | null {
  const origin = view.dom.getBoundingClientRect(), viewport = view.scrollDOM.getBoundingClientRect();
  const win = view.dom.ownerDocument.defaultView!, visual = win.visualViewport;
  const top = Math.max(viewport.top, visual?.offsetTop ?? 0);
  const bottom = Math.min(viewport.bottom, (visual?.offsetTop ?? 0) + (visual?.height ?? win.innerHeight));
  /** @param pos - Canonical endpoint. @param side - Native bidi association. @returns Visible local line geometry. */
  function endpoint(pos: number, side: -1 | 1): QuireKitSelectionHandleGeometry | null {
    if (!view.visibleRanges.some(range => pos >= range.from && pos <= range.to)) return null;
    const rect = sourceCaretRect(view, pos, side);
    if (!rect || rect.bottom - rect.top < 1 || rect.bottom <= top || rect.top >= bottom || rect.left < viewport.left || rect.left > viewport.right) return null;
    return { x: (rect.left - origin.left) / view.scaleX, y: (rect.top - origin.top) / view.scaleY,
      height: (rect.bottom - rect.top) / view.scaleY };
  }
  const range = view.state.selection.main;
  const preedit = sourceInputCaret(view);
  if (preedit && preedit.bottom > top && preedit.top < bottom) return { type: "caret", caret: {
    x: (preedit.left - origin.left) / view.scaleX, y: (preedit.top - origin.top) / view.scaleY, height: preedit.height / view.scaleY,
  } };
  if (range.empty) {
    const caret = endpoint(range.head, range.assoc < 0 ? -1 : 1);
    return caret ? { type: "caret", caret } : null;
  }
  const backward = range.head < range.anchor;
  const anchor = endpoint(range.anchor, backward ? -1 : 1), focus = endpoint(range.head, backward ? 1 : -1);
  return anchor || focus ? { type: "range", anchor, focus, backward } : null;
}

/**
 * Hit test only native mounted content, never estimate a source offset offscreen.
 * @param view - Native layout owner.
 * @param point - Public handle/gesture point in client CSS pixels.
 * @returns Accepted document position, or null outside mounted content.
 */
export function mobilePosition(view: EditorView, point: QuireKitSelectionHandlePoint): number | null {
  return sourceInputPosition(view, point);
}
