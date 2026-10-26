import { describe, expect, it } from "vitest";
import type { QuirePageBodyProjection } from "../types";
import { translateQuireRect } from "./rect";

describe("page projection rect translation", () => {
  it("applies page-body offsets without changing size", () => {
    expect(
      translateQuireRect(
        { x: 10, y: 20, width: 30, height: 40 },
        createProjection({ dx: 5, dy: -8 })
      )
    ).toEqual({ x: 15, y: 12, width: 30, height: 40 });
  });
});

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Projection offsets.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Horizontal projection offset. */
  readonly dx: number;
  /** Vertical projection offset. */
  readonly dy: number;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: 0,
      range: { from: 1, to: 2 },
      pageRect: { x: 0, y: 0, width: 100, height: 100 },
      bodyRect: { x: 0, y: 0, width: 100, height: 100 },
      rect: { x: 0, y: 0, width: 100, height: 100 },
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: options.dx,
    dy: options.dy
  };
}
