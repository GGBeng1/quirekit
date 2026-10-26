import { describe, expect, it } from "vitest";
import {
  containsQuireDocumentRange,
  doQuireDocumentRangesIntersect,
  intersectQuireDocumentRanges,
  unionQuireDocumentRanges
} from "./range";

describe("document range primitives", () => {
  it("checks containment and half-open intersection", () => {
    expect(containsQuireDocumentRange({ from: 10, to: 30 }, { from: 12, to: 20 }))
      .toBe(true);
    expect(containsQuireDocumentRange({ from: 10, to: 30 }, { from: 8, to: 20 }))
      .toBe(false);
    expect(doQuireDocumentRangesIntersect({ from: 10, to: 20 }, { from: 20, to: 30 }))
      .toBe(false);
    expect(doQuireDocumentRangesIntersect({ from: 10, to: 20 }, { from: 19, to: 30 }))
      .toBe(true);
  });

  it("intersects and unions document ranges", () => {
    expect(intersectQuireDocumentRanges(
      { from: 10, to: 30 },
      { from: 20, to: 40 }
    )).toEqual({ from: 20, to: 30 });
    expect(intersectQuireDocumentRanges(
      { from: 10, to: 20 },
      { from: 20, to: 30 }
    )).toBeNull();
    expect(unionQuireDocumentRanges([
      { from: 30, to: 40 },
      { from: 10, to: 20 },
      { from: 18, to: 32 }
    ])).toEqual({ from: 10, to: 40 });
    expect(unionQuireDocumentRanges([])).toBeNull();
  });
});
