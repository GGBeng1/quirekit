import type { QuirePathSegment } from "@quirekit/renderer";

/** Cubic-circle approximation constant. */
const circleKappa = 0.5522847498307936;

/**
 * Creates a closed cubic approximation of a circle.
 *
 * @param centerX - Circle center x coordinate.
 * @param centerY - Circle center y coordinate.
 * @param radius - Circle radius.
 * @returns Closed circular path segment list.
 */
export function createCircleSegments(
  centerX: number,
  centerY: number,
  radius: number
): QuirePathSegment[] {
  const control = radius * circleKappa;
  return [
    { kind: "move-to", point: { x: centerX + radius, y: centerY } },
    {
      kind: "bezier-curve-to",
      control1: { x: centerX + radius, y: centerY + control },
      control2: { x: centerX + control, y: centerY + radius },
      point: { x: centerX, y: centerY + radius }
    },
    {
      kind: "bezier-curve-to",
      control1: { x: centerX - control, y: centerY + radius },
      control2: { x: centerX - radius, y: centerY + control },
      point: { x: centerX - radius, y: centerY }
    },
    {
      kind: "bezier-curve-to",
      control1: { x: centerX - radius, y: centerY - control },
      control2: { x: centerX - control, y: centerY - radius },
      point: { x: centerX, y: centerY - radius }
    },
    {
      kind: "bezier-curve-to",
      control1: { x: centerX + control, y: centerY - radius },
      control2: { x: centerX + radius, y: centerY - control },
      point: { x: centerX + radius, y: centerY }
    },
    { kind: "close-path" }
  ];
}


/**
 * Draws a continuous inclined comma instead of a circle with a subpixel tail.
 * The contour stays within the existing over-side allocation from Layout.
 *
 * @param x - Visual grapheme center in document coordinates.
 * @param y - Marker center anchor in document coordinates.
 * @param radius - Shared marker scale.
 * @returns Closed filled contour, pointing from upper left to lower right.
 */
export function createCommaSegments(x: number, y: number, radius: number): QuirePathSegment[] {
  return [
    { kind: "move-to", point: { x: x - radius, y: y - radius } },
    { kind: "bezier-curve-to",
      control1: { x: x - radius * 0.2, y: y - radius * 0.9 },
      control2: { x: x + radius, y: y + radius * 0.3 },
      point: { x: x + radius, y: y + radius * 1.1 } },
    { kind: "bezier-curve-to",
      control1: { x: x + radius, y: y + radius * 1.7 },
      control2: { x: x - radius * 0.2, y: y + radius * 1.7 },
      point: { x: x - radius * 0.35, y: y + radius * 0.9 } },
    { kind: "bezier-curve-to",
      control1: { x: x - radius * 0.45, y: y + radius * 0.1 },
      control2: { x: x - radius * 0.65, y: y - radius * 0.6 },
      point: { x: x - radius, y: y - radius } },
    { kind: "close-path" }
  ];
}
