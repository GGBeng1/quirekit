import type { Node as PMNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireStructuredRangeSegment } from "../types";

/**
 * Validates the non-range fields of one persisted segment.
 *
 * @param segment - Candidate text or structural segment.
 */
export function assertStructuredSegmentShape(
  segment: QuireStructuredRangeSegment
): void {
  if (!isRecord(segment) || !isDocumentRange(segment.range)) {
    throw new RangeError("Invalid structured range segment");
  }
  if (segment.kind === "text") return;
  if (
    segment.kind !== "structure" ||
    !isNonEmptyString(segment.ownerId) ||
    !isNonEmptyString(segment.adapterId) ||
    !isNonEmptyString(segment.nodeType) ||
    !isDocumentRange(segment.ownerRange) ||
    !isNonEmptyString(segment.commandDomain) ||
    !isNonEmptyString(segment.clipboardDomain) ||
    !isMappingFallback(segment.mappingFallback) ||
    !isReplacementFallback(segment.replacementFallback) ||
    !Array.isArray(segment.units) ||
    !segment.units.every((unit) =>
      isRecord(unit) &&
      isNonEmptyString(unit.id) &&
      isNonEmptyString(unit.kind) &&
      isDocumentRange(unit.range)
    )
  ) {
    throw new RangeError("Invalid structured range structure segment");
  }
}

/**
 * Validates one non-empty half-open document range.
 *
 * @param doc - Document owning the range.
 * @param range - Range to validate.
 * @param label - Diagnostic range kind.
 */
export function assertStructuredNonEmptyRange(
  doc: PMNode,
  range: QuireDocumentRange,
  label: string
): void {
  if (
    !isDocumentRange(range) ||
    range.from < 0 ||
    range.from >= range.to ||
    range.to > doc.content.size
  ) {
    throw new RangeError(`Invalid structured ${label} range`);
  }
}

/**
 * Validates one absolute position against a document.
 *
 * @param doc - Document owning the position.
 * @param position - Candidate position.
 * @param label - Diagnostic position kind.
 */
export function assertStructuredDocumentPosition(
  doc: PMNode,
  position: number,
  label: string
): void {
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position > doc.content.size
  ) {
    throw new RangeError(`Invalid structured range ${label}`);
  }
}

/**
 * Reports whether a value is a half-open numeric range.
 *
 * @param value - Candidate range.
 * @returns Whether both boundaries are finite integers.
 */
function isDocumentRange(value: unknown): value is QuireDocumentRange {
  return isRecord(value) &&
    Number.isInteger(value.from) &&
    Number.isInteger(value.to);
}

/**
 * Reports whether a value is a supported mapping fallback.
 *
 * @param value - Candidate fallback.
 * @returns Whether the value belongs to the public fallback space.
 */
function isMappingFallback(
  value: unknown
): value is "nearest" | "text" | "remove" {
  return value === "nearest" || value === "text" || value === "remove";
}

/**
 * Reports whether a value is a supported replacement fallback.
 *
 * @param value - Candidate fallback.
 * @returns Whether the value belongs to the public fallback space.
 */
function isReplacementFallback(
  value: unknown
): value is "owner" | "text" | "reject" {
  return value === "owner" || value === "text" || value === "reject";
}

/**
 * Reports whether a value is a non-empty string.
 *
 * @param value - Candidate string.
 * @returns Whether the value can be used as a stable domain identifier.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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
