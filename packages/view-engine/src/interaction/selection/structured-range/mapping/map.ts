import type { Mappable } from "@quirekit/pm";
import {
  applyStructuredRangeMappingFallback,
  type QuireStructuredRangeFallback
} from "./fallback";
import {
  createCollapsedStructuredRange,
  mapStructuredExactRange
} from "./ranges";
import type { QuireMappedStructuredRangePlan } from "./types";
import type {
  QuireStructuredRangePlan,
  QuireStructuredRangeSegment,
  QuireStructuredRangeStructureSegment
} from "../types";

/**
 * Maps a durable structured range plan without requiring the next document.
 *
 * @param plan - Existing durable plan.
 * @param mapping - ProseMirror position mapping.
 * @returns Mapped plan plus any requested nearest fallback.
 */
export function mapStructuredRangePlan(
  plan: QuireStructuredRangePlan,
  mapping: Mappable
): QuireMappedStructuredRangePlan {
  const anchor = mapping.map(plan.anchor, 1);
  const head = mapping.map(plan.head, 1);
  const segments: QuireStructuredRangeSegment[] = [];
  let nearestPosition: number | null = null;

  for (const segment of plan.segments) {
    const mapped = segment.kind === "text"
      ? mapTextSegment(segment, mapping)
      : mapStructureSegment(segment, mapping);
    if (mapped.nearest) nearestPosition = head;
    if (mapped.segment) segments.push(mapped.segment);
  }

  return {
    plan: segments.length === 0
      ? null
      : {
          anchor,
          head,
          direction: plan.direction,
          requiresStructuredSelection: true,
          segments
        },
    nearestPosition
  };
}

/**
 * Maps one ordinary text segment with inward-facing associations.
 *
 * @param segment - Text segment to map.
 * @param mapping - Position mapping.
 * @returns Optional mapped segment.
 */
function mapTextSegment(
  segment: Extract<QuireStructuredRangeSegment, { readonly kind: "text" }>,
  mapping: Mappable
): QuireStructuredRangeFallback {
  const range = mapStructuredExactRange(segment.range, mapping);
  return {
    segment: range === null ? null : { kind: "text", range },
    nearest: false
  };
}

/**
 * Maps adapter-owned owner, selection, and unit ranges.
 *
 * @param segment - Structural segment to map.
 * @param mapping - Position mapping.
 * @returns Mapped semantic segment or its declared fallback.
 */
function mapStructureSegment(
  segment: QuireStructuredRangeStructureSegment,
  mapping: Mappable
): QuireStructuredRangeFallback {
  const ownerRange = mapStructuredExactRange(segment.ownerRange, mapping);
  const range = mapStructuredExactRange(segment.range, mapping);
  const units = segment.units.flatMap((unit) => {
    const unitRange = mapStructuredExactRange(unit.range, mapping);
    return unitRange === null ? [] : [{ ...unit, range: unitRange }];
  });
  const unitsInvalid = segment.units.length > 0 && units.length === 0;

  if (ownerRange === null || range === null || unitsInvalid) {
    return applyStructuredRangeMappingFallback({
      ...segment,
      ownerRange: ownerRange ?? createCollapsedStructuredRange(mapping.map(
        segment.ownerRange.from,
        1
      )),
      range: range ?? createCollapsedStructuredRange(mapping.map(
        segment.range.from,
        1
      )),
      units
    });
  }

  return {
    segment: {
      ...segment,
      ownerId: `${segment.adapterId}@${ownerRange.from}`,
      ownerRange,
      range,
      units
    },
    nearest: false
  };
}
