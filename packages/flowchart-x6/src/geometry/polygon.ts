import type { ShapeGeometry } from "./types";

/** @param points - Normalized polygon contour. @param width - Local width. @param height - Local height. @param base - Caption defaults. @returns Polygon with cardinal ray intersections on its precise boundary. */
export function polygonGeometry(points: readonly (readonly [number, number])[], width: number, height: number, base: ShapeGeometry): ShapeGeometry {
  // Intersect the center axes with the contour, so concave stars and asymmetric
  // arrows attach to visible segments rather than their bounding rectangle.
  const xs: number[] = [], ys: number[] = [];
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length]!;
    if (y !== ny && (y - 0.5) * (ny - 0.5) <= 0) xs.push(x + (0.5 - y) * (nx - x) / (ny - y));
    if (x !== nx && (x - 0.5) * (nx - 0.5) <= 0) ys.push(y + (0.5 - x) * (ny - y) / (nx - x));
  });
  return { ...base, outline: points.map(([x, y], i) => `${i ? "L" : "M"}${x * width} ${y * height}`).join(" ") + " Z",
    ports: { left: { x: Math.min(...xs) * width, y: height / 2 }, right: { x: Math.max(...xs) * width, y: height / 2 },
      top: { x: width / 2, y: Math.min(...ys) * height }, bottom: { x: width / 2, y: Math.max(...ys) * height } } };
}
