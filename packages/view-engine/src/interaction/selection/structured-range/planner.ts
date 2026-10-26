import {
  createStructuredRangeClaim,
  isSelectionStructureOwnerClaimed,
  type QuireStructuredRangeClaim
} from "./claims";
import {
  compareStructuredRangeSegments,
  createStructuredRangeTextSegments
} from "./segments";
import type {
  QuireStructuredRangePlan,
  QuireStructuredRangePlannerOptions
} from "./types";

/**
 * Normalizes one logical drag range through snapshot-owned structure facts.
 *
 * @param options - Logical endpoints and compiled source interval authority.
 * @returns Source-ordered text and structural segments.
 */
export function planQuireStructuredRange(
  options: QuireStructuredRangePlannerOptions
): QuireStructuredRangePlan {
  const rawRange = {
    from: Math.min(options.anchor, options.head),
    to: Math.max(options.anchor, options.head)
  };
  const direction = options.anchor <= options.head ? "forward" : "backward";
  if (rawRange.from === rawRange.to) {
    return {
      anchor: options.anchor,
      head: options.head,
      direction,
      requiresStructuredSelection: false,
      segments: [{ kind: "text", range: rawRange }]
    };
  }

  const claims: QuireStructuredRangeClaim[] = [];

  // Resolve outer owners before nested owners. A non-delegating outer claim
  // suppresses nested decisions over the same selected source coverage.
  for (const owner of options.structureIndex.query(rawRange)) {
    if (isSelectionStructureOwnerClaimed(owner, claims)) continue;
    const claim = createStructuredRangeClaim(
      owner,
      options.anchor,
      options.head,
      rawRange
    );
    if (claim !== null) claims.push(claim);
  }

  const textSegments = createStructuredRangeTextSegments(rawRange, claims);
  const structureSegments = claims.flatMap((claim) =>
    claim.segment === undefined ? [] : [claim.segment]
  );
  const segments = [...textSegments, ...structureSegments]
    .sort(compareStructuredRangeSegments);

  return {
    anchor: options.anchor,
    head: options.head,
    direction,
    requiresStructuredSelection: claims.length > 0,
    segments
  };
}
