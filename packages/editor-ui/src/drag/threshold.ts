import type { EditorUIDragPoint } from "./types";

/** Default activation threshold in client-space CSS pixels. */
export const defaultEditorUIDragThreshold = 5;

/**
 * Reports whether pointer movement exceeded the activation threshold.
 *
 * @param press - Initial client-space press point.
 * @param current - Latest client-space pointer point.
 * @param threshold - CSS-pixel activation threshold.
 * @returns Whether Euclidean movement is strictly greater than the threshold.
 */
export function hasExceededEditorUIDragThreshold(
  press: EditorUIDragPoint,
  current: EditorUIDragPoint,
  threshold: number
): boolean {
  const deltaX = current.x - press.x;
  const deltaY = current.y - press.y;
  return deltaX * deltaX + deltaY * deltaY > threshold * threshold;
}

/**
 * Normalizes an optional activation threshold.
 *
 * @param threshold - Optional threshold supplied by a caller.
 * @returns Finite non-negative threshold or the default.
 */
export function resolveEditorUIDragThreshold(threshold?: number): number {
  return Number.isFinite(threshold) && threshold !== undefined && threshold >= 0
    ? threshold
    : defaultEditorUIDragThreshold;
}
