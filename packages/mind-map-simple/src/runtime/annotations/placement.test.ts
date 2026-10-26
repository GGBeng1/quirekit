import { describe, expect, it } from "vitest";
import { measureAnnotationCaption, placeBoundaryCaption, relationBaseline, routeAnnotationRelation } from "./placement";
import type { AnnotationBounds } from "./types";

/** @param a - Rectangle. @param b - Rectangle. @returns Whether they overlap. */
const overlaps = (a: AnnotationBounds, b: AnnotationBounds) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("annotation placement", () => {
  it("keeps the natural route when nothing is in the way", () => {
    const route = routeAnnotationRelation({ x: 0, y: 0, width: 100, height: 40 }, { x: 400, y: 0, width: 100, height: 40 }, [], measureAnnotationCaption(["关联"]));
    expect(route.start).toEqual({ x: 100, y: 20 });
    expect(route.end).toEqual({ x: 400, y: 20 });
    expect(route.control).toEqual({ x: 250, y: 20 + 90 });
    expect(route.caption).toEqual({ x: 250, y: 20 + 45 });
  });

  it("routes a relation between two topics of a column around the topic between them", () => {
    const source = { x: 433, y: 97, width: 207, height: 78 }, middle = { x: 433, y: 327, width: 184, height: 73 };
    const target = { x: 433, y: 552, width: 184, height: 73 }, size = measureAnnotationCaption(["检验目标"]);
    const route = routeAnnotationRelation(source, target, [middle], size);
    const box = { x: route.caption.x - size.width / 2, y: relationBaseline(route.caption.y, size) - 17, width: size.width, height: size.height };
    expect(overlaps(box, middle)).toBe(false);
    for (let t = 0; t <= 1; t += 0.05) {
      const u = 1 - t;
      const point = { x: u * u * route.start.x + 2 * u * t * route.control.x + t * t * route.end.x, y: u * u * route.start.y + 2 * u * t * route.control.y + t * t * route.end.y };
      expect(point.x > middle.x && point.x < middle.x + middle.width && point.y > middle.y && point.y < middle.y + middle.height).toBe(false);
    }
  });

  it("moves a boundary caption only as far from the centre as a topic above it requires", () => {
    const bounds = { x: 400, y: 260, width: 540, height: 200 }, size = measureAnnotationCaption(["协作阶段"]);
    expect(placeBoundaryCaption(bounds, [], size, 236)).toBe(670);
    // The topic's left edge, less the clearance, bounds the caption's right edge.
    const x = placeBoundaryCaption(bounds, [{ x: 722, y: 155, width: 220, height: 68 }], size, 236);
    expect(x + size.width / 2).toBeLessThanOrEqual(718);
    expect(x).toBeGreaterThan(640);
  });
});
