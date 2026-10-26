import type { Node as PMNode } from "@quirekit/pm";
import {
  assertStructuredDocumentPosition,
  assertStructuredNonEmptyRange,
  assertStructuredSegmentShape
} from "./shape";
import type {
  QuireStructuredRangePlan,
  QuireStructuredRangeStructureSegment
} from "../types";

/**
 * Validates a structured range plan against its owning document.
 *
 * @param doc - Document that owns all absolute positions.
 * @param plan - Candidate plan to validate.
 */
export function assertStructuredRangePlan(
  doc: PMNode,
  plan: QuireStructuredRangePlan
): void {
  assertStructuredDocumentPosition(doc, plan.anchor, "anchor");
  assertStructuredDocumentPosition(doc, plan.head, "head");
  if (
    plan.direction !== "forward" &&
    plan.direction !== "backward"
  ) {
    throw new RangeError("Invalid structured range direction");
  }
  if (plan.segments.length === 0) {
    throw new RangeError("Structured range selection requires a segment");
  }

  let previousTo = -1;
  for (const segment of plan.segments) {
    assertStructuredSegmentShape(segment);
    assertStructuredNonEmptyRange(doc, segment.range, "segment");
    if (segment.range.from < previousTo) {
      throw new RangeError(
        "Structured range segments must be source-ordered and disjoint"
      );
    }
    previousTo = segment.range.to;
    if (segment.kind === "structure") {
      assertStructureSegment(doc, segment);
    }
  }
}

/**
 * Validates adapter-owned structure metadata against the live document.
 *
 * @param doc - Document owning the segment.
 * @param segment - Structural segment to validate.
 */
function assertStructureSegment(
  doc: PMNode,
  segment: QuireStructuredRangeStructureSegment
): void {
  assertStructuredNonEmptyRange(doc, segment.ownerRange, "owner");
  if (
    segment.range.from < segment.ownerRange.from ||
    segment.range.to > segment.ownerRange.to
  ) {
    throw new RangeError("Structured range must remain inside its owner");
  }

  const owner = doc.nodeAt(segment.ownerRange.from);
  if (
    !owner ||
    owner.type.name !== segment.nodeType ||
    segment.ownerRange.to !== segment.ownerRange.from + owner.nodeSize
  ) {
    throw new RangeError("Structured range owner no longer matches the document");
  }

  let previousTo = segment.ownerRange.from;
  for (const unit of segment.units) {
    assertStructuredNonEmptyRange(doc, unit.range, "unit");
    if (
      unit.range.from < segment.ownerRange.from ||
      unit.range.to > segment.ownerRange.to ||
      unit.range.from < segment.range.from ||
      unit.range.to > segment.range.to ||
      unit.range.from < previousTo
    ) {
      throw new RangeError(
        "Structured range units must be ordered inside their owner"
      );
    }
    previousTo = unit.range.to;
  }
}
