import type { QuirePoint } from "@quirekit/renderer";

import type {
  QuireLayoutCoordinatePath,
  QuireLayoutCoordinatePoint,
  QuireLayoutCoordinateSpaceKind
} from "./types";

/**
 * Creates a point tagged with its canonical layout coordinate space.
 *
 * @param space - Layout coordinate space that owns the point.
 * @param x - Horizontal coordinate inside the owning space.
 * @param y - Vertical coordinate inside the owning space.
 * @returns Coordinate-space-tagged layout point.
 */
export function createQuireLayoutCoordinatePoint<
  Space extends QuireLayoutCoordinateSpaceKind
>(
  space: Space,
  x: number,
  y: number
): QuireLayoutCoordinatePoint<Space> {
  return { space, x, y };
}

/**
 * Creates the explicit path for a translation between layout spaces.
 *
 * @param point - Source-space point before translation.
 * @param toSpace - Destination layout coordinate space.
 * @param offset - Destination-space offset of the source origin.
 * @returns Canonical coordinate path that records the translation.
 */
export function translateQuireLayoutCoordinatePoint<
  From extends QuireLayoutCoordinateSpaceKind,
  To extends QuireLayoutCoordinateSpaceKind
>(
  point: QuireLayoutCoordinatePoint<From>,
  toSpace: To,
  offset: QuirePoint
): QuireLayoutCoordinatePath {
  const output = createQuireLayoutCoordinatePoint(
    toSpace,
    point.x + offset.x,
    point.y + offset.y
  );

  return {
    spaces: [point.space, output.space],
    steps: [
      {
        from: point.space,
        to: output.space,
        input: point,
        output,
        scaleX: 1,
        scaleY: 1
      }
    ]
  };
}
