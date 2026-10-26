import type {
  QuireStructuredRangeSegment,
  QuireStructuredRangeStructureSegment
} from "../types";

/** Result of applying one structure segment's mapping fallback. */
export interface QuireStructuredRangeFallback {
  /** Retained text segment, or null when coverage is removed. */
  readonly segment: QuireStructuredRangeSegment | null;
  /** Whether the complete selection must resolve near its logical head. */
  readonly nearest: boolean;
}

/**
 * Applies one adapter's declared mapping fallback.
 *
 * @param segment - Mapped or partially collapsed structure segment.
 * @returns Text, removal, or nearest fallback result.
 */
export function applyStructuredRangeMappingFallback(
  segment: QuireStructuredRangeStructureSegment
): QuireStructuredRangeFallback {
  if (segment.mappingFallback === "nearest") {
    return { segment: null, nearest: true };
  }
  if (
    segment.mappingFallback === "text" &&
    segment.range.from < segment.range.to
  ) {
    return {
      segment: { kind: "text", range: segment.range },
      nearest: false
    };
  }
  return { segment: null, nearest: false };
}
