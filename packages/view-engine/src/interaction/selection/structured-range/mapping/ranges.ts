import type { Mappable } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";

/**
 * Maps an exact retained span without absorbing adjacent insertions.
 *
 * Start boundaries associate forward and end boundaries associate backward,
 * so inserting immediately before or after an owner does not enlarge it.
 *
 * @param range - Existing exact source range.
 * @param mapping - Position mapping.
 * @returns Non-empty mapped range, or null after complete deletion.
 */
export function mapStructuredExactRange(
  range: QuireDocumentRange,
  mapping: Mappable
): QuireDocumentRange | null {
  const from = mapping.mapResult(range.from, 1);
  const to = mapping.mapResult(range.to, -1);
  return from.pos < to.pos
    ? { from: from.pos, to: to.pos }
    : null;
}

/**
 * Creates a zero-width diagnostic range for fallback routing.
 *
 * @param position - Mapped boundary.
 * @returns Collapsed half-open range.
 */
export function createCollapsedStructuredRange(
  position: number
): QuireDocumentRange {
  return { from: position, to: position };
}
