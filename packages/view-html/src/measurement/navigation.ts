import type { QuireEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import type { QuireEditorInputBindingOptions } from "@quirekit/view/mounted-backend";
import type { HtmlDomMeasurementProvider } from "./types";

/**
 * Finds a logical edge of the browser line containing a model position.
 * @param editor - Canonical document owner.
 * @param provider - Retained browser geometry.
 * @param pos - Position on the requested visual line.
 * @param end - Whether to find its logical end instead of start.
 * @returns Position at the requested line edge.
 */
export function htmlLineBoundary(editor: QuireEditor, provider: HtmlDomMeasurementProvider, pos: number, end: boolean): number {
  const $pos = editor.state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return pos;
  const rect = provider.coordsAtPos(pos);
  let low = end ? pos : $pos.start();
  let high = end ? $pos.end() : pos;
  // Browser lines are vertically ordered inside one textblock, even when their
  // glyphs have mixed bidi order. Never binary-search horizontal glyph order.
  while (low < high) {
    const middle = end ? Math.ceil((low + high) / 2) : Math.floor((low + high) / 2);
    const candidate = provider.coordsAtPos(middle, end ? -1 : 1);
    const same = candidate.top < rect.bottom && candidate.bottom > rect.top;
    if (end ? same : !same) low = end ? middle : middle + 1;
    else high = end ? middle - 1 : middle;
  }
  return low;
}

/**
 * Supplies input navigation from DOM geometry without a shaped text/page snapshot.
 * @param editor - Canonical document owner.
 * @param provider - The same browser authority used for pointer hits and caret paint.
 * @returns Visual movement resolvers for the shared input controller.
 */
export function createHtmlVisualNavigation(editor: QuireEditor, provider: HtmlDomMeasurementProvider): NonNullable<QuireEditorInputBindingOptions["navigation"]> {
  return {
    resolveLineBoundaryPosition(direction, context) {
      const end = direction === "end";
      return { pos: htmlLineBoundary(editor, provider, context.position.pos, end), bias: end ? 1 : -1 };
    },
    resolveVerticalCaretPosition(direction, context) {
      const down = direction === "down";
      const pos = context.position.pos;
      const rect = provider.coordsAtPos(pos, context.position.bias);
      const edge = htmlLineBoundary(editor, provider, pos, down);
      const $pos = editor.state.doc.resolve(pos);
      if (!$pos.parent.isTextblock) return null;
      const sign = down ? 1 : -1;
      const within = down ? edge < $pos.end() : edge > $pos.start();
      const next = within ? edge + sign : TextSelection.findFrom(
        editor.state.doc.resolve(Math.max(0, Math.min(editor.state.doc.content.size, edge + sign))), sign, true
      )?.head;
      if (next === undefined || next === pos) return null;
      const target = provider.coordsAtPos(next, sign);
      const hit = provider.posAtClientPoint(rect.left, (target.top + target.bottom) / 2);
      if (hit) {
        const hitRect = provider.coordsAtPos(hit.pos);
        if (hitRect.top < target.bottom && hitRect.bottom > target.top) return { pos: hit.pos, bias: sign };
      }
      // Offscreen browser hit APIs cannot answer. Read only the destination
      // visual line, preserving bidi order by comparing actual caret boxes.
      const from = htmlLineBoundary(editor, provider, next, false);
      const to = htmlLineBoundary(editor, provider, next, true);
      let nearest = next;
      let distance = Infinity;
      for (let candidate = from; candidate <= to; candidate += 1) {
        const caret = provider.coordsAtPos(candidate);
        const dx = Math.abs(caret.left - rect.left);
        if (dx < distance) { nearest = candidate; distance = dx; }
      }
      return { pos: nearest, bias: sign };
    }
  };
}
