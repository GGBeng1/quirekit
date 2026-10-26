import { describe, expect, it } from "vitest";
import { flattenSelectionLines } from "./lines";
import type { SelectionPaintRect } from "./types";

/** @param left - Left edge. @param top - Top edge. @param right - Right edge. @param bottom - Bottom edge. @returns A measured fragment. */
function rect(left: number, top: number, right: number, bottom: number): SelectionPaintRect { return { left, top, right, bottom }; }

describe("selection text bands", () => {
  it("flattens adjoining text, superscript, subscript and padded inline code", () => {
    const fragments = [rect(0, 12, 20, 29), rect(20, 18, 25, 31), rect(25, 12, 50, 29),
      rect(50, 10, 55, 22), rect(55, 12, 90, 29), rect(90, 11, 120, 33), rect(95, 14, 115, 30)];
    expect(flattenSelectionLines(fragments, [fragments]))
      .toEqual([rect(0, 10, 120, 33)]);
  });
  it("preserves physical bidi gaps and uses one common height on each visual line", () => {
    const fragments = [rect(70, 12, 90, 29), rect(0, 10, 20, 27), rect(20, 12, 30, 29)];
    expect(flattenSelectionLines(fragments, [fragments]))
      .toEqual([rect(0, 10, 30, 29), rect(70, 10, 90, 29)]);
  });
  it("does not bridge successive wrapped lines through expanding glyph bounds", () => {
    const fragments = [rect(0, 10, 40, 30), rect(40, 20, 50, 34), rect(50, 5, 60, 24),
      rect(0, 32, 40, 52), rect(40, 30, 50, 43)];
    expect(flattenSelectionLines(fragments, [fragments]))
      .toEqual([rect(0, 5, 60, 34), rect(0, 30, 50, 52)]);
  });
  it("keeps other blocks and their paragraph gaps outside endpoint line normalization", () => {
    const block = rect(0, 80, 500, 200), nextLine = rect(0, 210, 500, 235);
    expect(flattenSelectionLines([rect(0, 10, 20, 27), rect(20, 12, 40, 29), block, nextLine], [[rect(0, 10, 20, 27), rect(20, 12, 40, 29)]]))
      .toEqual([block, nextLine, rect(0, 10, 40, 29)]);
  });
  it("does not join separate table cell owners or paint collapsed markers", () => {
    expect(flattenSelectionLines([rect(0, 10, 30, 27), rect(0, 0, 0, 25), rect(30, 8, 60, 29)],
      [[rect(0, 10, 30, 27)], [rect(30, 8, 60, 29)]]))
      .toEqual([rect(0, 10, 30, 27), rect(30, 8, 60, 29)]);
  });
});
