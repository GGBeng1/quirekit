import { describe, expect, it } from "vitest";
import { resolveQuirePageGeometryForIndex } from "./geometry";

describe("page geometry", () => {
  it("separates resolved page rectangles by the configured page gap", () => {
    expect(resolveQuirePageGeometryForIndex({
      pageRect: { x: 10, y: 20, width: 300, height: 400 },
      bodyRect: { x: 30, y: 60, width: 260, height: 320 },
      pageGap: 32
    }, 2)).toEqual({
      pageRect: { x: 10, y: 884, width: 300, height: 400 },
      bodyRect: { x: 30, y: 924, width: 260, height: 320 }
    });
  });

  it("selects first, even, and odd body rectangles before page translation", () => {
    const pageGeometry = {
      pageRect: { x: 10, y: 20, width: 300, height: 400 },
      bodyRect: { x: 30, y: 60, width: 260, height: 320 },
      pageGap: 20,
      bodyRectVariants: {
        first: { x: 30, y: 90, width: 260, height: 290 },
        even: { x: 30, y: 70, width: 260, height: 300 },
        odd: { x: 30, y: 80, width: 260, height: 295 }
      }
    };

    expect(resolveQuirePageGeometryForIndex(pageGeometry, 0).bodyRect).toEqual({
      x: 30,
      y: 90,
      width: 260,
      height: 290
    });
    expect(resolveQuirePageGeometryForIndex(pageGeometry, 1).bodyRect).toEqual({
      x: 30,
      y: 490,
      width: 260,
      height: 300
    });
    expect(resolveQuirePageGeometryForIndex(pageGeometry, 2).bodyRect).toEqual({
      x: 30,
      y: 920,
      width: 260,
      height: 295
    });
  });
});
