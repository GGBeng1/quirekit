import { EditorSelection } from "@quirekit/cm-state";
import { EditorView, RectangleMarker } from "@quirekit/cm-view";
import { sourceBlockAt } from "@quirekit/msfe-core";

/** @param view - Geometry owner. @param from - Source start. @param to - Source end.
 * @returns Visible replacement intervals, without scanning unrelated document syntax. */
export function replacements(view: EditorView, from: number, to: number): { from: number; to: number }[] {
  const result: { from: number; to: number }[] = [];
  for (const provider of [...view.state.facet(EditorView.decorations), ...view.state.facet(EditorView.outerDecorations)]) {
    const ranges = typeof provider === "function" ? provider(view) : provider;
    ranges.between(from, to, (start, end, value) => {
      if (end > start && value.point && end > from && start < to) result.push({ from: start, to: end });
    });
  }
  return result.sort((a, b) => a.from - b.from || b.to - a.to);
}

/** @param view - Accepted source and native DOM geometry. @param position - Remote head.
 * @returns A precise source position or the containing block boundary, with an explicit fallback flag. */
export function caretPosition(view: EditorView, position: number): { position: number; boundary: boolean } {
  const replaced = replacements(view, Math.max(0, position - 1), position + 1).some(range => position > range.from && position < range.to);
  const dom = view.domAtPos(position);
  if (!replaced && view.posAtDOM(dom.node, dom.offset) === position) return { position, boundary: false };
  return { position: sourceBlockAt(view.state, position)?.from ?? view.state.doc.lineAt(position).from, boundary: true };
}

/** @param view - CM viewport/bidi authority. @param anchor - Directed selection start. @param head - Directed end.
 * @returns Only visible text rectangles; replaced source never becomes a fictitious text range. */
export function selectionRectangles(view: EditorView, anchor: number, head: number): readonly RectangleMarker[] {
  if (anchor === head) return [];
  const from = Math.min(anchor, head), to = Math.max(anchor, head), result: RectangleMarker[] = [];
  // Visible ranges bound work even for select-all. Replacement fragments are excluded before CM measures text.
  for (const visible of view.visibleRanges) {
    let start = Math.max(from, visible.from); const end = Math.min(to, visible.to);
    if (start >= end) continue;
    const hidden = replacements(view, start, end);
    for (const range of [...hidden, { from: end, to: end }]) {
      const until = Math.min(end, range.from);
      if (start < until) result.push(...RectangleMarker.forRange(view, "", EditorSelection.range(start, until)));
      start = Math.max(start, range.to);
      if (start >= end || result.length >= 256) break;
    }
    if (result.length >= 256) break;
  }
  return result.slice(0, 256);
}
