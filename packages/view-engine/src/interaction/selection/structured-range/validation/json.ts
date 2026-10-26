import type {
  QuireStructuredRangePlan,
  QuireStructuredRangeSegment,
  QuireStructuredRangeSelectionJSON
} from "../types";

/** ProseMirror JSON registry id for durable structured range selections. */
export const QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID =
  "quireStructuredRange";

/**
 * Parses a persisted selection payload without trusting external JSON.
 *
 * @param json - Unknown persisted payload.
 * @returns Candidate plan validated further against the target document.
 */
export function readStructuredRangeSelectionJSON(
  json: unknown
): QuireStructuredRangePlan {
  if (!isRecord(json)) {
    throw new RangeError("Invalid structured range selection JSON");
  }
  if (
    json.type !== QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID ||
    typeof json.anchor !== "number" ||
    typeof json.head !== "number" ||
    (json.direction !== "forward" && json.direction !== "backward") ||
    !Array.isArray(json.segments)
  ) {
    throw new RangeError("Invalid structured range selection JSON");
  }

  return {
    anchor: json.anchor,
    head: json.head,
    direction: json.direction,
    requiresStructuredSelection: true,
    segments: json.segments as readonly QuireStructuredRangeSegment[]
  };
}

/**
 * Produces the registered JSON representation of a selection plan.
 *
 * @param plan - Durable logical plan.
 * @returns JSON-safe registered selection payload.
 */
export function writeStructuredRangeSelectionJSON(
  plan: QuireStructuredRangePlan
): QuireStructuredRangeSelectionJSON {
  return {
    type: QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID,
    anchor: plan.anchor,
    head: plan.head,
    direction: plan.direction,
    segments: plan.segments
  };
}

/**
 * Reports whether a value is a non-null object record.
 *
 * @param value - Candidate value.
 * @returns Whether property access is safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
