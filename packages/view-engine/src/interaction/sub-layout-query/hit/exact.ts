import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import type { QuirePositionHitTestResult } from "../../types";
import { resolveQuireSubLayoutTargetCaret } from "../caret";
import { iterateQuireSubLayoutQueryProductSets } from "../product-sets";
import { findQuireSubLayoutSelectionRectForCaretStop } from "../shared";
import { buildQuireSubLayoutPositionHit } from "./result";
import { findBestQuireSubLayoutHitTargetFromProducts } from "./target";

/**
 * Hit-tests retained sub-layout query products in a layout tree.
 *
 * @param nodes - Layout nodes to inspect.
 * @param point - Canvas point being mapped.
 * @returns Hit result from sub-layout query products, or null when none match.
 */
export function hitTestQuireSubLayoutQueryProducts(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuirePositionHitTestResult | null {
  // Nested targets win equal scores; the shared traversal retains sibling order.
  const match = findBestQuireSubLayoutHitTargetFromProducts(
    [...iterateQuireSubLayoutQueryProductSets(nodes, true)],
    point
  );
  if (match === null) {
    return null;
  }

  const { products, target } = match;
  const stop = resolveQuireSubLayoutTargetCaret(products, target, point);
  if (stop !== null) {
    return buildQuireSubLayoutPositionHit({
      position: stop.position,
      rect: findQuireSubLayoutSelectionRectForCaretStop(products, stop)?.rect ?? target.rect,
      queryOwner: stop.queryOwner
    }, target);
  }

  const leading = point.x <= target.rect.x + target.rect.width / 2;
  return buildQuireSubLayoutPositionHit({
    position: leading
      ? { pos: target.range.from, bias: 1 }
      : { pos: target.range.to, bias: -1 },
    rect: target.rect
  }, target);
}
