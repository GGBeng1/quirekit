import {
  measureQuireRectDistanceSquaredToPoint,
  type QuirePoint
} from "@quirekit/renderer";
import type {
  QuireLayoutNode
} from "../../../layout";
import type { QuirePositionHitTestResult } from "../../types";
import { findQuireSubLayoutSelectionRectForCaretStop } from "../shared";
import {
  findBestQuireSubLayoutHitTargetFromProducts
} from "./target";
import type { QuireNearestSubLayoutCaretMatch } from "../types";
import { iterateQuireSubLayoutQueryProductSets } from "../product-sets";
import { buildQuireSubLayoutPositionHit } from "./result";

/**
 * Resolves the nearest retained sub-layout caret outside exact target geometry.
 *
 * This fallback is required for page blanks below nested flows such as Table:
 * those flows expose caret stops through query products rather than flattened
 * text layout nodes.
 *
 * @param nodes - Layout subtrees whose retained query products may answer.
 * @param point - Document-space blank point to resolve.
 * @returns Nearest sub-layout position hit, or null without retained carets.
 */
export function hitTestNearestQuireSubLayoutCaret(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuirePositionHitTestResult | null {
  const match = findNearestQuireSubLayoutCaret(nodes, point);
  if (match === null) {
    return null;
  }

  return buildQuireNearestSubLayoutCaretHit(match);
}

/**
 * Restores the retained target identity for one already accepted caret stop.
 * @param match - Exact caret occurrence and the query products that own it.
 * @returns Position hit preserving the existing sub-layout owner contract.
 */
export function buildQuireNearestSubLayoutCaretHit(
  match: QuireNearestSubLayoutCaretMatch
): QuirePositionHitTestResult {
  const { rect } = match.stop;
  const targetMatch = findBestQuireSubLayoutHitTargetFromProducts(
    [match.products],
    { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    match.stop
  );
  return buildQuireSubLayoutPositionHit({
    ...match.stop,
    viewRegion: match.stop.queryOwner?.region
  }, targetMatch?.target);
}

/**
 * Finds the retained sub-layout caret closest to a point.
 *
 * @param nodes - Layout subtrees to scan.
 * @param point - Document-space point used for distance ordering.
 * @returns Nearest caret match, or null when no query product exposes carets.
 */
function findNearestQuireSubLayoutCaret(
  nodes: readonly QuireLayoutNode[],
  point: QuirePoint
): QuireNearestSubLayoutCaretMatch | null {
  let nearest: QuireNearestSubLayoutCaretMatch | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const products of iterateQuireSubLayoutQueryProductSets(nodes)) {
    for (const stop of products.caretStops) {
      const lineRect = findQuireSubLayoutSelectionRectForCaretStop(products, stop)?.rect;
      if (lineRect === undefined) {
        continue;
      }
      const distance = measureQuireRectDistanceSquaredToPoint({
        ...stop.rect,
        y: lineRect.y,
        height: lineRect.height
      }, point);

      if (distance < nearestDistance) {
        nearest = { products, stop };
        nearestDistance = distance;
      }
    }
  }

  return nearest;
}
