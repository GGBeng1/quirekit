import type { QuireRange } from "../types";

/** Position or range accepted by insertion and selection commands. */
export type QuireCommandPosition = number | QuireRange;

/**
 * Resolves a number or range-like value into a document range.
 *
 * @param position - Number, range, or unknown value.
 * @param fallback - Position used when the value is invalid.
 * @returns Resolved document range.
 */
export function resolvePosition(position: unknown, fallback: number): QuireRange {
  if (typeof position === "number") {
    return { from: position, to: position };
  }

  if (
    typeof position === "object" &&
    position !== null &&
    "from" in position &&
    "to" in position &&
    typeof position.from === "number" &&
    typeof position.to === "number"
  ) {
    return { from: position.from, to: position.to };
  }

  return { from: fallback, to: fallback };
}

/**
 * Resolves an optional position, preserving a fallback selection range.
 *
 * @param position - Number, range, or unknown value.
 * @param fallbackFrom - Fallback range start.
 * @param fallbackTo - Fallback range end.
 * @returns Resolved document range.
 */
export function resolveOptionalPosition(
  position: unknown,
  fallbackFrom: number,
  fallbackTo: number
): QuireRange {
  if (position === undefined) {
    return { from: fallbackFrom, to: fallbackTo };
  }

  return resolvePosition(position, fallbackFrom);
}
