import type { QuirePoint } from "@quirekit/renderer";
import type { QuireDrawingTransientTrack } from "../types";

const defaultMinimumExtent = { width: 12, height: 12 } as const;

/**
 * Creates a click-default or normalized drag creation track.
 *
 * @param startPoint - Projected creation origin.
 * @param currentPoint - Latest projected pointer point.
 * @param defaultExtent - Default click extent.
 * @param dragged - Whether the client gesture crossed the threshold.
 * @param minimumExtent - Smallest allowed drag-created extent.
 * @returns Immutable creation preview track.
 */
export function createQuireDrawingCreationTrack(
  startPoint: QuirePoint,
  currentPoint: QuirePoint,
  defaultExtent: Readonly<{ width: number; height: number }>,
  dragged: boolean,
  minimumExtent: Readonly<{ width: number; height: number }> = defaultMinimumExtent
): QuireDrawingTransientTrack {
  const x = dragged ? Math.min(startPoint.x, currentPoint.x) : startPoint.x;
  const y = dragged ? Math.min(startPoint.y, currentPoint.y) : startPoint.y;
  const width = dragged
    ? Math.max(minimumExtent.width, Math.abs(currentPoint.x - startPoint.x))
    : defaultExtent.width;
  const height = dragged
    ? Math.max(minimumExtent.height, Math.abs(currentPoint.y - startPoint.y))
    : defaultExtent.height;
  const frame = { rect: { x, y, width, height }, rotation: 0 };
  return {
    kind: "create",
    startFrame: frame,
    previewFrame: frame,
    startPoint,
    currentPoint
  };
}

/**
 * Constrains a raw drawing endpoint against its immutable origin.
 *
 * @param origin - Fixed document-space pointer-down point.
 * @param point - Unconstrained current document point.
 * @param aspectRatio - Width-to-height ratio for closed geometry.
 * @param straightLine - Whether to snap to the nearest 45-degree direction.
 * @returns Constrained endpoint without accumulating preview geometry.
 */
export function constrainQuireDrawingCreationPoint(
  origin: QuirePoint,
  point: QuirePoint,
  aspectRatio: number,
  straightLine: boolean
): QuirePoint {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const width = Math.abs(dx);
  const height = Math.abs(dy);
  if (straightLine) {
    const diagonalThreshold = Math.tan(Math.PI / 8);
    if (height <= width * diagonalThreshold) return { x: point.x, y: origin.y };
    if (width <= height * diagonalThreshold) return { x: origin.x, y: point.y };
  }
  const constrainedWidth = Math.max(width, height * aspectRatio);
  return {
    x: origin.x + (dx < 0 ? -1 : 1) * constrainedWidth,
    y: origin.y + (dy < 0 ? -1 : 1) * constrainedWidth / aspectRatio
  };
}
