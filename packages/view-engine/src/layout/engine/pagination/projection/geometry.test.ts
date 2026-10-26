import { describe, expect, it } from "vitest";
import { unionQuireRects } from "./geometry";

describe("pagination projection geometry primitives", () => {
  it("returns null when no rectangles are available", () => {
    expect(unionQuireRects([])).toBeNull();
  });

  it("computes one bounding rectangle for projected fragments", () => {
    expect(unionQuireRects([
      { x: 40, y: 120, width: 80, height: 20 },
      { x: 20, y: 150, width: 40, height: 10 },
      { x: 110, y: 100, width: 30, height: 35 }
    ])).toEqual({ x: 20, y: 100, width: 120, height: 60 });
  });
});
