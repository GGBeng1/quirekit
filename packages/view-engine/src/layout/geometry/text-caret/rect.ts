import type { QuireRect } from "@quirekit/renderer";
import { intersectQuireRects } from "@quirekit/renderer";
import type { QuireTextCaretStop, QuireTextFragment } from "@quirekit/layout/text";
import {
  findQuireTextCaretStopAtXWithinRect,
  resolveQuireTextFragmentRunRect
} from "@quirekit/layout/text";

/**
 * Builds the caret rectangle for a text caret stop within a visible node rect.
 *
 * @param fragment - Text fragment that owns the caret stop.
 * @param caretStop - Caret stop for the requested document position.
 * @param visibleRect - Visible rectangle inherited from the layout node path.
 * @param caretWidth - Width used for the caret rectangle.
 * @returns Caret rectangle in layout document coordinates.
 */
export function buildQuireTextCaretAnchorRect(
  fragment: QuireTextFragment,
  caretStop: QuireTextCaretStop,
  visibleRect: QuireRect,
  caretWidth: number
): QuireRect {
  const runRect = resolveQuireTextFragmentRunRect(fragment);
  const clippedRect = intersectQuireRects(runRect, visibleRect);

  if (!clippedRect) {
    return {
      x: fragment.rect.x + caretStop.localX,
      y: runRect.y,
      width: caretWidth,
      height: runRect.height
    };
  }

  const clippedStop = findQuireTextCaretStopAtXWithinRect(
    fragment,
    fragment.rect.x + caretStop.localX,
    clippedRect
  );

  return {
    x: fragment.rect.x + clippedStop.localX,
    y: clippedRect.y,
    width: caretWidth,
    height: clippedRect.height
  };
}
