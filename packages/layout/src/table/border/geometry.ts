import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableLineSegment } from "../types";

/**
 * Normalizes a line segment direction for stable grouping and paint metadata.
 *
 * @param line - Line segment to normalize.
 * @returns Direction-normalized line segment.
 */
export function normalizeQuireTableLineSegment(
  line: QuireTableLineSegment
): QuireTableLineSegment {
  if (
    line.from.x < line.to.x ||
    (line.from.x === line.to.x && line.from.y <= line.to.y)
  ) {
    return line;
  }

  return {
    from: line.to,
    to: line.from
  };
}

/**
 * Creates a rectangle centered on a horizontal or vertical line segment.
 *
 * @param line - Line segment in document coordinates.
 * @param width - Stroke or hit width.
 * @returns Rectangle centered on the line segment.
 */
export function createQuireTableLineRect(
  line: QuireTableLineSegment,
  width: number
): QuireRect {
  const halfWidth = width / 2;
  const deltaX = Math.abs(line.to.x - line.from.x);
  const deltaY = Math.abs(line.to.y - line.from.y);

  if (deltaX >= deltaY) {
    return {
      x: Math.min(line.from.x, line.to.x),
      y: line.from.y - halfWidth,
      width: deltaX,
      height: width
    };
  }

  return {
    x: line.from.x - halfWidth,
    y: Math.min(line.from.y, line.to.y),
    width,
    height: deltaY
  };
}
