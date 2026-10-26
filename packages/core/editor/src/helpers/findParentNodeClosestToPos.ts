import type { ResolvedPos } from "@quirekit/pm";
import type { QuireNodePredicate, QuireParentNodeMatch } from "../types";

/**
 * Finds the closest ancestor node to a resolved position that matches a predicate.
 *
 * @param $pos - Resolved position to inspect.
 * @param predicate - Predicate used to match ancestors.
 * @returns Closest matching ancestor, or undefined.
 */
export function findParentNodeClosestToPos(
  $pos: ResolvedPos,
  predicate: QuireNodePredicate
): QuireParentNodeMatch | undefined {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);

    if (predicate(node)) {
      return {
        node,
        pos: $pos.before(depth),
        start: $pos.start(depth),
        depth
      };
    }
  }

  return undefined;
}
