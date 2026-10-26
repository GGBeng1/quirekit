import type {
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import { containsQuireTargetPoint } from "@quirekit/renderer";
import type { QuireSubLayoutQueryProducts } from "../../../layout";
import {
  findQuireSubLayoutSelectionRectForCaretStop,
  isQuireSubLayoutCaretInsideTarget,
  measureQuireSubLayoutLineDistanceY
} from "../shared";
import type { QuireSubLayoutCaretStop, QuireSubLayoutHitTarget, QuireSubLayoutHitTargetMatch } from "../types";

/**
 * Finds the best retained hit target across multiple sub-layout query products.
 *
 * @param productSets - Query-product sets to inspect as one hit-test surface.
 * @param point - Canvas point being mapped.
 * @param requiredCaret - Optional caret whose exact source owner must be retained.
 * @returns Best matching hit target and its owning products, or null.
 */
export function findBestQuireSubLayoutHitTargetFromProducts(
  productSets: readonly QuireSubLayoutQueryProducts[],
  point: QuirePoint,
  requiredCaret?: QuireSubLayoutCaretStop
): QuireSubLayoutHitTargetMatch | null {
  let best: QuireSubLayoutHitTargetMatch | null = null;
  let bestCaretDistanceY = Number.POSITIVE_INFINITY;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const products of productSets) {
    for (const target of products.hitTargets) {
      if (
        !containsQuireTargetPoint(target.rect, target.hitArea, point) ||
        (requiredCaret !== undefined && !isQuireSubLayoutCaretInsideTarget(requiredCaret, target))
      ) {
        continue;
      }

      const caretDistanceY = measureNearestQuireSubLayoutTargetCaretDistanceY(
        products,
        target,
        point
      );
      const area = measureQuireRectArea(target.rect);

      if (
        best === null ||
        isQuireSubLayoutHitTargetCandidateBetter({
          caretDistanceY,
          area,
          bestCaretDistanceY,
          bestArea
        })
      ) {
        best = { products, target };
        bestCaretDistanceY = caretDistanceY;
        bestArea = area;
      }
    }
  }

  return best;
}

/**
 * Compares a retained hit-target candidate with the current best candidate.
 *
 * @param options - Candidate and best scores to compare.
 * @returns Whether the candidate should replace the current best target.
 */
function isQuireSubLayoutHitTargetCandidateBetter(options: {
  /** Vertical distance from the candidate to its nearest caret line. */
  readonly caretDistanceY: number;
  /** Candidate target rectangle area. */
  readonly area: number;
  /** Vertical distance from the current best target to its nearest caret line. */
  readonly bestCaretDistanceY: number;
  /** Current best target rectangle area. */
  readonly bestArea: number;
}): boolean {
  const hasExactLine = options.caretDistanceY === 0;
  const bestHasExactLine = options.bestCaretDistanceY === 0;

  if (hasExactLine !== bestHasExactLine) {
    return hasExactLine;
  }

  if (
    !hasExactLine &&
    Number.isFinite(options.caretDistanceY) &&
    Number.isFinite(options.bestCaretDistanceY) &&
    options.caretDistanceY !== options.bestCaretDistanceY
  ) {
    return options.caretDistanceY < options.bestCaretDistanceY;
  }

  if (options.area !== options.bestArea) {
    return options.area < options.bestArea;
  }

  return options.caretDistanceY < options.bestCaretDistanceY;
}

/**
 * Measures vertical distance from a point to the closest caret line in a target.
 *
 * @param products - Query products that own the target.
 * @param target - Candidate hit target.
 * @param point - Canvas point being mapped.
 * @returns Vertical distance to the nearest caret line, or infinity without carets.
 */
function measureNearestQuireSubLayoutTargetCaretDistanceY(
  products: QuireSubLayoutQueryProducts,
  target: QuireSubLayoutHitTarget,
  point: QuirePoint
): number {
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const stop of products.caretStops) {
    if (!isQuireSubLayoutCaretInsideTarget(stop, target)) {
      continue;
    }

    const lineRect = findQuireSubLayoutSelectionRectForCaretStop(products, stop)?.rect;
    if (lineRect === undefined) {
      continue;
    }
    const distance = measureQuireSubLayoutLineDistanceY(lineRect, point.y);

    if (distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  return nearestDistance;
}

/**
 * Measures the positive area of a rectangle.
 *
 * @param rect - Rectangle to measure.
 * @returns Rectangle area.
 */
function measureQuireRectArea(rect: QuireRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}
