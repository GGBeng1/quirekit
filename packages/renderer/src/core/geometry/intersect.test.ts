import { describe, expect, it } from "vitest";
import { doQuireRectsIntersect, intersectQuireRects } from "./rect";

/** Coordinates and extents covering finite, touching, empty, negative and non-finite cases. */
const values = [-10, -0, 0, 0.5, 5, 10, Number.POSITIVE_INFINITY, Number.NaN];
const extents = [-1, 0, 0.5, 5, 10, Number.POSITIVE_INFINITY, Number.NaN];

describe("rectangle intersection predicate", () => {
  it("agrees with the overlap rectangle for every combination", () => {
    const rects = values.flatMap(x => [0, 5].flatMap(y => extents.flatMap(width => [5, 0].map(height => ({ x, y, width, height })))));
    for (const first of rects) {
      for (const second of rects) {
        expect(doQuireRectsIntersect(first, second), JSON.stringify([first, second]))
          .toBe(intersectQuireRects(first, second) !== null);
      }
    }
  });
});
