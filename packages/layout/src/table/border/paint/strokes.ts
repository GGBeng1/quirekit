import type { QuireTableBorder } from "../../types";
import { resolveQuireTableBorderBand } from "../occupancy/width";
import { normalizeQuireTableBorderStyleName } from "../style";
import type { QuireTableBorderPaint } from "../../types";

const borderStrokeEpsilon = 0.001;

/**
 * Expands one border paint into the stroke lines required by its style.
 *
 * @param border - Normalized border metadata.
 * @param paint - Base border paint on the resolved physical edge.
 * @returns One or more renderer-neutral line paints for the border style.
 */
export function expandQuireTableBorderPaintStrokes(
  border: QuireTableBorder,
  paint: QuireTableBorderPaint
): readonly QuireTableBorderPaint[] {
  const strokeCount = resolveMultiStrokeCount(border);

  if (strokeCount === null) {
    return [paint];
  }

  // Word gives each line of a compound border the nominal width, so the band is wider than the nominal width.
  const totalWidth = resolveQuireTableBorderBand(border);
  const lineWidth = totalWidth / ((strokeCount * 2) - 1);
  const offsets = Array.from({ length: strokeCount }, (_, index) =>
    ((index * 2) - (strokeCount - 1)) * lineWidth
  );

  return offsets.map((offset, index) =>
    createOffsetBorderPaint(paint, offset, lineWidth, index)
  );
}

/**
 * Resolves the stroke count for currently supported multi-line styles.
 *
 * @param border - Normalized border metadata.
 * @returns Number of parallel strokes, or null for single-stroke styles.
 */
function resolveMultiStrokeCount(border: QuireTableBorder): number | null {
  switch (normalizeQuireTableBorderStyleName(border.style)) {
    case "double":
      return 2;
    case "triple":
      return 3;
    default:
      return null;
  }
}

/**
 * Creates one parallel line paint from a base border paint.
 *
 * @param paint - Base border paint.
 * @param offset - Offset from the base line along the line normal.
 * @param lineWidth - Stroke width for the parallel line.
 * @param index - Zero-based stroke index used for stable ids.
 * @returns Offset border paint.
 */
function createOffsetBorderPaint(
  paint: QuireTableBorderPaint,
  offset: number,
  lineWidth: number,
  index: number
): QuireTableBorderPaint {
  const deltaX = paint.to.x - paint.from.x;
  const deltaY = paint.to.y - paint.from.y;
  const length = Math.hypot(deltaX, deltaY);

  if (length <= borderStrokeEpsilon) {
    return {
      ...paint,
      id: `${paint.id}#stroke-${index}`,
      lineWidth
    };
  }

  const normalX = -deltaY / length;
  const normalY = deltaX / length;

  return {
    ...paint,
    id: `${paint.id}#stroke-${index}`,
    from: {
      x: paint.from.x + (normalX * offset),
      y: paint.from.y + (normalY * offset)
    },
    to: {
      x: paint.to.x + (normalX * offset),
      y: paint.to.y + (normalY * offset)
    },
    lineWidth
  };
}
