import { resolveQuireTableBorderBand } from "../occupancy/width";
import type { QuireResolvedTableBorderSegment, QuireTableGeometrySnapshot } from "../../types";

/** Tolerance for matching a horizontal line to the fragment's bottom edge. */
const bandEpsilon = 0.001;

/**
 * Places a horizontal line in the space table layout reserved for it: below the grid line, inside the row it tops,
 * or above the table's bottom edge. Vertical lines and separated borders stay centred on their grid line.
 *
 * @param snapshot - Table fragment being painted.
 * @param border - Resolved physical border segment.
 * @returns Vertical offset of the stroke centre from the grid line.
 */
export function resolveHorizontalBandOffset(
  snapshot: QuireTableGeometrySnapshot,
  border: QuireResolvedTableBorderSegment
): number {
  const { from, to } = border.line;
  if (Math.abs(from.y - to.y) > bandEpsilon || (snapshot.cellSpacing ?? 0) > 0 || snapshot.rows.length === 0) return 0;
  const half = resolveQuireTableBorderBand(border.border) / 2;
  const bottom = Math.max(...snapshot.rows.map((row) => row.rect.y + row.rect.height));
  return Math.abs(from.y - bottom) <= bandEpsilon ? -half : half;
}
