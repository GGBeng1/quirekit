import type { QuirePoint } from "@quirekit/renderer";
import type { QuireSubLayoutQueryProducts } from "../../../layout";
import {
  findQuireSubLayoutSelectionRectForCaretStop,
  isQuireSubLayoutCaretInsideTarget,
  measureQuireSubLayoutLineDistanceY
} from "../shared";
import type { QuireSubLayoutCaretStop, QuireSubLayoutHitTarget } from "../types";

/**
 * Maps the target's line bands to a caret without using glyph height as a hit band.
 *
 * @param products - Immutable query products with explicit text membership.
 * @param target - Hit target containing the point and bounding its ownership.
 * @param point - Pointer in the products' coordinate space.
 * @returns Line-local or trailing caret, or null for structural space.
 */
export function resolveQuireSubLayoutTargetCaret(
  products: QuireSubLayoutQueryProducts,
  target: QuireSubLayoutHitTarget,
  point: QuirePoint
): QuireSubLayoutCaretStop | null {
  let nearest: QuireSubLayoutCaretStop | null = null;
  let nearestY = Number.POSITIVE_INFINITY;
  let nearestX = Number.POSITIVE_INFINITY;
  let lastLineBottom = Number.NEGATIVE_INFINITY;
  let trailing: QuireSubLayoutCaretStop | null = null;
  let trailingLineY = Number.NEGATIVE_INFINITY;

  // Line proximity owns vertical routing; shaped stops own horizontal routing.
  // Comparing these lexicographically prevents a distant line's x from winning.
  for (const stop of products.caretStops) {
    if (!isQuireSubLayoutCaretInsideTarget(stop, target)) {
      continue;
    }
    const line = findQuireSubLayoutSelectionRectForCaretStop(products, stop)?.rect;
    if (line === undefined) {
      continue;
    }
    lastLineBottom = Math.max(lastLineBottom, line.y + line.height);
    if (trailing === null || line.y > trailingLineY || (line.y === trailingLineY && stop.rect.x > trailing.rect.x)) {
      trailing = stop;
      trailingLineY = line.y;
    }
    const y = measureQuireSubLayoutLineDistanceY(line, point.y);
    const x = Math.abs(point.x - stop.rect.x);
    if (y < nearestY || (y === nearestY && x < nearestX)) {
      nearest = stop;
      nearestY = y;
      nearestX = x;
    }
  }

  // Below the final line, existing trailing-blank semantics choose the line end.
  return point.y > lastLineBottom ? trailing : nearest;
}
