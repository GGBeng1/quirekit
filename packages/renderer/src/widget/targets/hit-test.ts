import {
  containsQuireTargetPoint,
  type QuirePoint
} from "../../core/geometry";
import type { QuireViewTarget } from "../events";
import { getNodePathDepth } from "./node-path";

/**
 * Finds the deepest topmost target containing a point.
 *
 * @param targets - Target list in compiler output order.
 * @param point - Renderer-space pointer position.
 * @returns Hit target, or undefined.
 */
export function findHitTarget<TContext>(
  targets: readonly QuireViewTarget<TContext>[],
  point: QuirePoint
): QuireViewTarget<TContext> | undefined {
  return targets
    .map((target, index) => ({ target, index }))
    .filter(({ target }) =>
      target.pointerEvents === "none"
        ? false
        : containsQuireTargetPoint(target.rect, target.hitArea, point)
    )
    .sort(compareHitCandidates)
    .at(0)?.target;
}

/**
 * Orders hit candidates by depth first, then paint order.
 *
 * @param first - First candidate.
 * @param second - Second candidate.
 * @returns Sort order for hit-test candidates.
 */
function compareHitCandidates<TContext>(
  first: { readonly target: QuireViewTarget<TContext>; readonly index: number },
  second: { readonly target: QuireViewTarget<TContext>; readonly index: number }
): number {
  const depthDelta = getNodePathDepth(second.target.nodePath) -
    getNodePathDepth(first.target.nodePath);

  return depthDelta === 0 ? second.index - first.index : depthDelta;
}
