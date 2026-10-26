import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireSelectionAdapterMode
} from "../../../selection-adapter";
import type {
  QuireSelectionStructureOwnerFact,
  QuireSelectionStructureUnitFact
} from "../structure";
import type {
  QuireStructuredRangeStructureSegment
} from "./types";

/** Source coverage consumed by one non-delegating adapter decision. */
export interface QuireStructuredRangeClaim {
  /** Raw drag coverage suppressed from ordinary text semantics. */
  readonly blockedRange: QuireDocumentRange;
  /** Semantic segment emitted by the decision, absent for `skip`. */
  readonly segment?: QuireStructuredRangeStructureSegment | undefined;
}

/**
 * Compiles one owner's applicable crossing behavior into a source claim.
 *
 * @param owner - Compiled source owner.
 * @param anchor - Fixed logical drag endpoint.
 * @param head - Moving logical drag endpoint.
 * @param rawRange - Ascending raw drag range.
 * @returns Blocking and optional semantic claim, or null for delegation.
 */
export function createStructuredRangeClaim(
  owner: QuireSelectionStructureOwnerFact,
  anchor: number,
  head: number,
  rawRange: QuireDocumentRange
): QuireStructuredRangeClaim | null {
  const mode = resolveOwnerCrossing(owner, anchor, head);
  if (mode === null || mode === "delegate") return null;

  const blockedRange = intersectRanges(rawRange, owner.range);
  if (blockedRange === null) return null;
  if (mode === "skip") return { blockedRange };

  if (mode === "owner") {
    return {
      blockedRange,
      segment: createStructureSegment(owner, owner.range, [])
    };
  }

  const units = owner.units.filter((unit) =>
    rangesIntersect(unit.range, blockedRange)
  );
  if (units.length === 0) {
    return { blockedRange };
  }
  return {
    blockedRange,
    segment: createStructureSegment(owner, {
      from: units[0]!.range.from,
      to: units.at(-1)!.range.to
    }, units)
  };
}

/**
 * Reports whether an earlier outer claim already owns this nested owner.
 *
 * @param owner - Candidate nested source owner.
 * @param claims - Earlier source claims in outer-before-inner order.
 * @returns Whether nested normalization must be suppressed.
 */
export function isSelectionStructureOwnerClaimed(
  owner: QuireSelectionStructureOwnerFact,
  claims: readonly QuireStructuredRangeClaim[]
): boolean {
  return claims.some((claim) => {
    const range = claim.segment?.range ?? claim.blockedRange;
    return range.from <= owner.range.from && range.to >= owner.range.to;
  });
}

/**
 * Resolves the crossing field applicable to one owner.
 *
 * @param owner - Compiled source owner.
 * @param anchor - Fixed logical endpoint.
 * @param head - Moving logical endpoint.
 * @returns Adapter crossing mode, or null when the owner is merely adjacent.
 */
function resolveOwnerCrossing(
  owner: QuireSelectionStructureOwnerFact,
  anchor: number,
  head: number
): QuireSelectionAdapterMode | null {
  const anchorInside = isInsideRange(anchor, owner.range);
  const headInside = isInsideRange(head, owner.range);

  if (anchorInside && headInside) return owner.modes.internal;
  if (!anchorInside && headInside) return owner.modes.entry;
  if (anchorInside && !headInside) return owner.modes.exit;

  const from = Math.min(anchor, head);
  const to = Math.max(anchor, head);
  return from <= owner.range.from && to >= owner.range.to
    ? owner.modes.fullyCrossed
    : null;
}

/**
 * Copies owner routing facts into one immutable structural segment.
 *
 * @param owner - Compiled adapter owner.
 * @param range - Whole-owner or selected-unit range.
 * @param units - Ordered selected units, empty for whole-owner selection.
 * @returns Structural segment consumed by durable selection construction.
 */
function createStructureSegment(
  owner: QuireSelectionStructureOwnerFact,
  range: QuireDocumentRange,
  units: readonly QuireSelectionStructureUnitFact[]
): QuireStructuredRangeStructureSegment {
  return {
    kind: "structure",
    ownerId: owner.ownerId,
    adapterId: owner.adapterId,
    nodeType: owner.nodeType,
    ownerRange: owner.range,
    range,
    units,
    commandDomain: owner.commandDomain,
    clipboardDomain: owner.clipboardDomain,
    mappingFallback: owner.mappingFallback,
    replacementFallback: owner.replacementFallback
  };
}

/**
 * Intersects two half-open source ranges.
 *
 * @param left - First source range.
 * @param right - Second source range.
 * @returns Non-empty overlap, or null for disjoint ranges.
 */
function intersectRanges(
  left: QuireDocumentRange,
  right: QuireDocumentRange
): QuireDocumentRange | null {
  const range = {
    from: Math.max(left.from, right.from),
    to: Math.min(left.to, right.to)
  };
  return range.from < range.to ? range : null;
}

/**
 * Reports whether two half-open source ranges intersect.
 *
 * @param left - First source range.
 * @param right - Second source range.
 * @returns Whether their overlap is non-empty.
 */
function rangesIntersect(
  left: QuireDocumentRange,
  right: QuireDocumentRange
): boolean {
  return left.from < right.to && left.to > right.from;
}

/**
 * Reports whether a logical endpoint lies inside an owner rather than beside it.
 *
 * @param position - Absolute document position.
 * @param range - Half-open owner range.
 * @returns Whether the endpoint is strictly inside the owner boundaries.
 */
function isInsideRange(
  position: number,
  range: QuireDocumentRange
): boolean {
  return position > range.from && position < range.to;
}
