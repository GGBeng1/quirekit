import type { AnnotationBounds } from "./types";

/** World point. */
export interface AnnotationPoint {
  /** Horizontal coordinate. */ readonly x: number;
  /** Vertical coordinate. */ readonly y: number;
}

/** Quadratic relation curve and the point its caption is centred above. */
export interface AnnotationRelationRoute {
  /** Start on the source topic's edge. */ readonly start: AnnotationPoint;
  /** Control point. */ readonly control: AnnotationPoint;
  /** End on the target topic's edge, where the arrow points. */ readonly end: AnnotationPoint;
  /** Caption anchor on the curve. */ readonly caption: AnnotationPoint;
}

/** Bulges tried in order; the first is the natural one, capped as short curves look. */
const bulges = [90, 160, 240, 320, 420];
/** Curve parameters tried for the caption, from the middle outwards. */
const captionStops = [0.5, 0.4, 0.6, 0.3, 0.7];
/** Clearance kept between a caption or curve and a topic. */
const clearance = 4;

/**
 * Estimates a caption's box before it is drawn: CJK characters at the 14px caption size, Latin narrower.
 * @param lines - Caption lines.
 * @returns Width and height including the backdrop padding.
 */
export function measureAnnotationCaption(lines: readonly string[]): { width: number; height: number } {
  const width = Math.max(...lines.map(line => Array.from(line).reduce((sum, char) => sum + (char.codePointAt(0)! >= 0x2e80 ? 14 : 8), 0)));
  return { width: width + 10, height: lines.length * 19 + 8 };
}

/**
 * Routes a relation so its curve and caption stay off other topics.
 *
 * The natural curve bends 90px at most to the left of its direction. When it or its caption would
 * cover a topic, such as one between two topics of a column, larger bends on either side and caption
 * points away from the middle are tried in turn; the smallest clear one wins, a clear caption over a
 * crossed curve comes next, and the natural route is kept when nothing is clear.
 *
 * @param source - Source topic rectangle.
 * @param target - Target topic rectangle.
 * @param obstacles - Other visible topic rectangles.
 * @param caption - Estimated caption box, or null without a caption.
 * @returns Curve and caption anchor.
 */
export function routeAnnotationRelation(source: AnnotationBounds, target: AnnotationBounds, obstacles: readonly AnnotationBounds[],
  caption: { width: number; height: number } | null): AnnotationRelationRoute {
  const dx = target.x + target.width / 2 - source.x - source.width / 2;
  const dy = target.y + target.height / 2 - source.y - source.height / 2;
  const horizontal = Math.abs(dx) >= Math.abs(dy), sign = Math.sign(horizontal ? dx : dy) || 1;
  const start = { x: source.x + source.width / 2 + (horizontal ? sign * source.width / 2 : 0),
    y: source.y + source.height / 2 + (horizontal ? 0 : sign * source.height / 2) };
  const end = { x: target.x + target.width / 2 - (horizontal ? sign * target.width / 2 : 0),
    y: target.y + target.height / 2 - (horizontal ? 0 : sign * target.height / 2) };
  const distance = Math.max(1, Math.hypot(dx, dy));
  /** @param bulge - Bend toward the left of the direction, negative for the right. @param stop - Caption's curve parameter. @returns Route. */
  const route = (bulge: number, stop: number): AnnotationRelationRoute => {
    const control = { x: (start.x + end.x) / 2 - dy / distance * bulge, y: (start.y + end.y) / 2 + dx / distance * bulge };
    return { start, control, end, caption: curvePoint(start, control, end, stop) };
  };
  const natural = route(Math.min(90, distance / 3), 0.5);
  const blocked = obstacles.map(rect => inflate(rect, clearance));
  /** @param candidate - Route. @returns Whether its caption box covers no topic. */
  const captionClear = (candidate: AnnotationRelationRoute) => caption === null
    || !blocked.some(rect => overlaps(rect, captionBox(candidate.caption.x, relationBaseline(candidate.caption.y, caption), caption)));
  /** @param candidate - Route. @returns Whether the curve passes no topic. */
  const curveClear = (candidate: AnnotationRelationRoute) => Array.from({ length: 25 }, (_, index) => curvePoint(candidate.start, candidate.control, candidate.end, index / 24))
    .every(point => !blocked.some(rect => contains(rect, point)));
  const candidates = [Math.min(90, distance / 3), ...bulges.filter(bulge => bulge > Math.min(90, distance / 3))]
    .flatMap(bulge => [bulge, -bulge]).flatMap(bulge => captionStops.map(stop => route(bulge, stop)));
  return candidates.find(candidate => curveClear(candidate) && captionClear(candidate))
    ?? candidates.find(captionClear) ?? natural;
}

/**
 * Places a boundary caption above the boundary, at the free position nearest its centre.
 * @param bounds - Boundary rectangle.
 * @param obstacles - Visible topic rectangles outside the boundary.
 * @param caption - Estimated caption box.
 * @param baseline - Baseline of the caption's first line above the boundary.
 * @returns Horizontal centre of the caption; the centre when no position along the boundary is free.
 */
export function placeBoundaryCaption(bounds: AnnotationBounds, obstacles: readonly AnnotationBounds[],
  caption: { width: number; height: number }, baseline: number): number {
  const centre = bounds.x + bounds.width / 2, reach = Math.max(0, bounds.width / 2 - caption.width / 2);
  const blocked = obstacles.map(rect => inflate(rect, clearance));
  for (let offset = 0; offset <= reach; offset += 8) {
    for (const x of offset === 0 ? [centre] : [centre - offset, centre + offset]) {
      if (!blocked.some(rect => overlaps(rect, captionBox(x, baseline, caption)))) return x;
    }
  }
  return centre;
}

/**
 * @param y - Caption anchor on the relation curve.
 * @param size - Caption box size.
 * @returns First baseline, which sits above the anchor so the last line clears the curve.
 */
export function relationBaseline(y: number, size: { width: number; height: number }): number {
  return y - 7 - ((size.height - 8) / 19 - 1) * 19;
}

/**
 * @param x - Caption centre.
 * @param baseline - First line's baseline.
 * @param size - Caption box size.
 * @returns Caption box in world coordinates.
 */
function captionBox(x: number, baseline: number, size: { width: number; height: number }): AnnotationBounds {
  return { x: x - size.width / 2, y: baseline - 17, width: size.width, height: size.height };
}

/** @param a - Start. @param c - Control. @param b - End. @param t - Curve parameter. @returns Point on the quadratic curve. */
function curvePoint(a: AnnotationPoint, c: AnnotationPoint, b: AnnotationPoint, t: number): AnnotationPoint {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** @param rect - Rectangle. @param margin - Added on each side. @returns Grown rectangle. */
function inflate(rect: AnnotationBounds, margin: number): AnnotationBounds {
  return { x: rect.x - margin, y: rect.y - margin, width: rect.width + margin * 2, height: rect.height + margin * 2 };
}

/** @param a - Rectangle. @param b - Rectangle. @returns Whether they overlap. */
function overlaps(a: AnnotationBounds, b: AnnotationBounds): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** @param rect - Rectangle. @param point - Point. @returns Whether the point lies inside. */
function contains(rect: AnnotationBounds, point: AnnotationPoint): boolean {
  return point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height;
}
