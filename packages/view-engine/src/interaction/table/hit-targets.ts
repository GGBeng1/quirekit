import { containsQuireTargetPoint } from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireHitTarget, QuireTableHitTarget } from "../../layout";

/** Options used to find a table hit target at a point. */
export interface QuireTableHitTargetAtPointOptions {
  /** Retained hit targets emitted by the layout snapshot. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Canvas point to test against table cell rectangles. */
  readonly point: QuirePoint;
}

/**
 * Finds the most specific table cell hit target containing a point.
 *
 * @param options - Table hit targets and point to inspect.
 * @returns Best matching table hit target, or null when none contains the point.
 */
export function findQuireTableHitTargetAtPoint(
  options: QuireTableHitTargetAtPointOptions
): QuireTableHitTarget | null {
  let best: QuireTableHitTarget | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const target of options.hitTargets) {
    if (
      !containsQuireTargetPoint(target.rect, target.hitArea, options.point) ||
      !isQuireTableHitTarget(target)
    ) {
      continue;
    }

    const area = measureQuireTableHitTargetArea(target);

    if (area < bestArea) {
      best = target;
      bestArea = area;
    }
  }

  return best;
}

/**
 * Reports whether a retained hit target carries table-cell metadata.
 *
 * @param target - Retained hit target to inspect.
 * @returns Whether the target is a table-cell hit target.
 */
function isQuireTableHitTarget(
  target: QuireHitTarget
): target is QuireTableHitTarget {
  const value = target as Partial<QuireTableHitTarget>;

  return (
    value.kind === "cell" &&
    typeof value.tableId === "string" &&
    typeof value.semanticCellId === "string" &&
    typeof value.originExplicitCellId === "string" &&
    Array.isArray(value.explicitCellIds) &&
    typeof value.originCellPos === "number"
  );
}

/**
 * Measures the visual area of a table hit target.
 *
 * @param target - Table hit target to measure.
 * @returns Positive hit target area in document coordinates.
 */
function measureQuireTableHitTargetArea(target: QuireTableHitTarget): number {
  return target.rect.width * target.rect.height;
}
