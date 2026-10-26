import {
  intersectQuireRects,
  isQuireRectFinite,
  type QuireRect
} from "@quirekit/renderer";

/**
 * Clips a text line while retaining zero-width empty-paragraph interaction bands.
 *
 * Empty text has no paint area, but its line still owns a source position. The
 * block-axis intersection and explicit inline anchor determine its visibility.
 *
 * @param line - Accepted line rectangle in the clip's coordinate space.
 * @param clip - Visible page or viewport rectangle.
 * @returns Visible line band, or null when the line is outside the clip.
 */
export function clipQuireSubLayoutTextLine(
  line: QuireRect,
  clip: QuireRect
): QuireRect | null {
  if (line.width !== 0) {
    return intersectQuireRects(line, clip);
  }
  if (!isQuireRectFinite(line) || !isQuireRectFinite(clip)) {
    return null;
  }
  const top = Math.max(line.y, clip.y);
  const bottom = Math.min(line.y + line.height, clip.y + clip.height);
  return line.x < clip.x || line.x > clip.x + clip.width || bottom <= top
    ? null
    : { x: line.x, y: top, width: 0, height: bottom - top };
}
