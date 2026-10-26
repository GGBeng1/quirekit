import {
  Selection,
  TextSelection,
  type Node as PMNode
} from "@quirekit/pm";
import {
  applyStructuredRangeMappingFallback
} from "./fallback";
import type { QuireMappedStructuredRangePlan } from "./types";
import type {
  QuireStructuredRangePlan,
  QuireStructuredRangeSegment,
  QuireStructuredRangeStructureSegment
} from "../types";

/**
 * Resolves a mapped plan against the next document and validates owners.
 *
 * @param doc - Next ProseMirror document.
 * @param mapped - Document-independent mapping result.
 * @param createSelection - Callback constructing a live structured selection.
 * @returns Structured selection or a safe ProseMirror fallback.
 */
export function resolveMappedStructuredRangePlan(
  doc: PMNode,
  mapped: QuireMappedStructuredRangePlan,
  createSelection: (
    doc: PMNode,
    plan: QuireStructuredRangePlan
  ) => Selection
): Selection {
  if (mapped.nearestPosition !== null) {
    return createNearestSelection(doc, mapped.nearestPosition);
  }
  if (mapped.plan === null) {
    return createNearestSelection(doc, 0);
  }

  const segments: QuireStructuredRangeSegment[] = [];
  let nearestPosition: number | null = null;
  for (const segment of mapped.plan.segments) {
    if (segment.kind === "text" || structureOwnerMatches(doc, segment)) {
      segments.push(segment);
      continue;
    }
    const fallback = applyStructuredRangeMappingFallback(segment);
    if (fallback.nearest) nearestPosition = mapped.plan.head;
    if (fallback.segment) segments.push(fallback.segment);
  }

  if (nearestPosition !== null) {
    return createNearestSelection(doc, nearestPosition);
  }
  if (segments.length === 0) {
    return createNearestSelection(doc, mapped.plan.head);
  }
  if (segments.length === 1 && segments[0]!.kind === "text") {
    const range = segments[0]!.range;
    return mapped.plan.direction === "backward"
      ? TextSelection.between(doc.resolve(range.to), doc.resolve(range.from))
      : TextSelection.between(doc.resolve(range.from), doc.resolve(range.to));
  }

  return createSelection(doc, {
    ...mapped.plan,
    segments
  });
}

/**
 * Reports whether a mapped owner still identifies the expected source node.
 *
 * @param doc - Next document.
 * @param segment - Mapped structure segment.
 * @returns Whether type and outer range still match.
 */
function structureOwnerMatches(
  doc: PMNode,
  segment: QuireStructuredRangeStructureSegment
): boolean {
  const owner = doc.nodeAt(segment.ownerRange.from);
  return owner !== null &&
    owner.type.name === segment.nodeType &&
    segment.ownerRange.to === segment.ownerRange.from + owner.nodeSize;
}

/**
 * Creates a safe nearby selection with a clamped document position.
 *
 * @param doc - Target document.
 * @param position - Preferred mapped position.
 * @returns Nearest valid ProseMirror selection.
 */
function createNearestSelection(
  doc: PMNode,
  position: number
): Selection {
  const clamped = Math.max(0, Math.min(position, doc.content.size));
  return Selection.near(doc.resolve(clamped));
}
