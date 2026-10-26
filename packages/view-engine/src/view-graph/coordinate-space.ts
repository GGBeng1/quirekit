import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireViewCoordinatePoint,
  QuireViewCoordinatePointMapping,
  QuireViewCoordinateRect,
  QuireViewCoordinateSize,
  QuireViewCoordinateSpaceKind
} from "./types";

/**
 * Creates a coordinate-space-tagged point.
 *
 * @param space - Coordinate space that owns the point.
 * @param x - Horizontal coordinate inside the space.
 * @param y - Vertical coordinate inside the space.
 * @returns Tagged coordinate point.
 */
export function createQuireViewCoordinatePoint<
  Space extends QuireViewCoordinateSpaceKind
>(
  space: Space,
  x: number,
  y: number
): QuireViewCoordinatePoint<Space> {
  return { space, x, y };
}

/**
 * Creates a coordinate-space-tagged rectangle.
 *
 * @param space - Coordinate space that owns the rectangle.
 * @param rect - Untagged rectangle values.
 * @returns Tagged coordinate rectangle.
 */
export function createQuireViewCoordinateRect<
  Space extends QuireViewCoordinateSpaceKind
>(
  space: Space,
  rect: QuireRect
): QuireViewCoordinateRect<Space> {
  return {
    space,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Maps a viewport CSS-pixel size to canvas physical pixels.
 *
 * @param size - Viewport-space size in CSS pixels.
 * @param devicePixelRatio - Device pixel ratio used by the backing store.
 * @returns Canvas-physical size in device pixels.
 */
export function mapQuireViewViewportSizeToCanvasPhysical(
  size: QuireViewCoordinateSize<"viewport">,
  devicePixelRatio: number
): QuireViewCoordinateSize<"canvas-physical"> {
  const scale = resolveCanvasPhysicalScale(devicePixelRatio);

  return {
    space: "canvas-physical",
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale)
  };
}

/**
 * Creates a point mapping and its one-step coordinate path.
 *
 * @param from - Source-space point.
 * @param to - Destination-space point.
 * @param scaleX - Horizontal scale used by the mapping.
 * @param scaleY - Vertical scale used by the mapping.
 * @returns Tagged point mapping with a coordinate path.
 */
export function createQuireViewCoordinatePointMapping<
  From extends QuireViewCoordinateSpaceKind,
  To extends QuireViewCoordinateSpaceKind
>(
  from: QuireViewCoordinatePoint<From>,
  to: QuireViewCoordinatePoint<To>,
  scaleX: number,
  scaleY: number
): QuireViewCoordinatePointMapping<From, To> {
  return {
    from,
    to,
    path: {
      spaces: [from.space, to.space],
      steps: [
        {
          from: from.space,
          to: to.space,
          input: from,
          output: to,
          scaleX,
          scaleY
        }
      ]
    }
  };
}

/**
 * Resolves a stable DPR scale for viewport-to-physical canvas conversions.
 *
 * @param devicePixelRatio - Candidate device pixel ratio.
 * @returns Positive finite DPR scale, falling back to 1.
 */
function resolveCanvasPhysicalScale(devicePixelRatio: number): number {
  return Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
}
