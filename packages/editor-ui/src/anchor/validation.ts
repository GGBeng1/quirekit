import type { EditorUIAnchorRect } from "./types";

/**
 * Reports whether a snapshot version is a non-negative safe integer.
 *
 * @param version - Candidate retained snapshot version.
 * @returns Whether the value can safely participate in freshness checks.
 */
export function isEditorUIAnchorSnapshotVersion(version: unknown): version is number {
  return Number.isSafeInteger(version) && Number(version) >= 0;
}

/**
 * Reports whether one rectangle contains finite, non-negative geometry.
 *
 * Zero width and height are retained because caret and resize-line anchors use
 * them intentionally.
 *
 * @param rect - Candidate rectangle.
 * @returns Whether the rectangle is safe for geometry and client projection.
 */
export function isFiniteEditorUIAnchorRect(rect: EditorUIAnchorRect): boolean {
  return Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width >= 0
    && rect.height >= 0;
}

/**
 * Computes the bounding rectangle of a non-empty rectangle list.
 *
 * @param rects - Finite rectangles in deterministic visual order.
 * @returns Bounding rectangle, or undefined for an empty list.
 */
export function unionEditorUIAnchorRects(
  rects: readonly EditorUIAnchorRect[]
): EditorUIAnchorRect | undefined {
  const first = rects[0];
  if (first === undefined) {
    return undefined;
  }

  let left = first.x;
  let top = first.y;
  let right = first.x + first.width;
  let bottom = first.y + first.height;

  for (const rect of rects.slice(1)) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}
