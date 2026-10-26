import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import { selectQuireSubLayoutPositionAffinityCandidate } from "./position-affinity";
import { iterateQuireSubLayoutQueryProductSets } from "./product-sets";
import type { QuireSubLayoutInputAnchor } from "./types";
import {
  areQuireRectsOnSameLine,
  measureQuireRectVerticalDistance
} from "./shared";

/**
 * Resolves a retained nested-flow input anchor from layout query products.
 *
 * @param nodes - Layout nodes to inspect.
 * @param position - Document position that should own the input anchor.
 * @param role - Preferred input anchor role for the current transient state.
 * @param referenceRect - Optional visible geometry used to disambiguate repeated anchors.
 * @returns Input anchor, or null when no sub-layout product owns it.
 */
export function resolveQuireSubLayoutInputAnchor(
  nodes: readonly QuireLayoutNode[],
  position: number,
  role: QuireSubLayoutInputAnchor["role"],
  referenceRect?: QuireRect | undefined
): QuireSubLayoutInputAnchor | null {
  const anchors: QuireSubLayoutInputAnchor[] = [];
  for (const products of iterateQuireSubLayoutQueryProductSets(nodes)) {
    anchors.push(...products.inputAnchors.filter((candidate) =>
      candidate.role === role && candidate.position.pos === position
    ));
  }
  return selectQuireSubLayoutInputAnchor(anchors, 1, referenceRect);
}

/**
 * Selects one input anchor from matching retained candidates.
 *
 * @param anchors - Candidate input anchors in layout order.
 * @param side - Side preference used when wrapped fragments share one position.
 * @param referenceRect - Optional visible geometry used to disambiguate repeated anchors.
 * @returns Preferred input anchor, or null when no candidate matched.
 */
function selectQuireSubLayoutInputAnchor(
  anchors: readonly QuireSubLayoutInputAnchor[],
  side: number,
  referenceRect: QuireRect | undefined
): QuireSubLayoutInputAnchor | null {
  if (referenceRect === undefined || anchors.length < 2) {
    return selectQuireSubLayoutPositionAffinityCandidate(anchors, side);
  }

  const sameLineAnchors = anchors.filter((anchor) =>
    areQuireRectsOnSameLine(anchor.rect, referenceRect)
  );

  if (sameLineAnchors.length > 0) {
    return selectQuireSubLayoutPositionAffinityCandidate(
      sameLineAnchors,
      side
    );
  }

  const nearestDistance = Math.min(
    ...anchors.map((anchor) =>
      measureQuireRectVerticalDistance(anchor.rect, referenceRect)
    )
  );
  const nearestAnchors = anchors.filter((anchor) =>
    measureQuireRectVerticalDistance(anchor.rect, referenceRect) === nearestDistance
  );

  return selectQuireSubLayoutPositionAffinityCandidate(nearestAnchors, side);
}
