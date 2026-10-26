import { describe, expect, it } from "vitest";
import { shapeQuireTextRun } from "./shape";
import type { QuireTextMeasurer } from "./types";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: text.length * 10 })
};

describe("text shaping", () => {
  it("shapes text into grapheme cluster boxes with source ranges", () => {
    expect(shapeQuireTextRun("a你b", "16px sans-serif", fixedMeasurer)).toEqual({
      clusters: [
        { from: 0, to: 1, x: 0, advance: 10, rtl: false },
        { from: 1, to: 2, x: 10, advance: 10, rtl: false },
        { from: 2, to: 3, x: 20, advance: 10, rtl: false }
      ],
      width: 30,
      ascent: 0,
      descent: 0
    });
  });

  it("delegates to a real shaper backend when the measurer provides one", () => {
    const shapedMeasurer: QuireTextMeasurer = {
      measureText: () => ({ width: 999 }),
      shapeRun: () => ({
        clusters: [
          { from: 0, to: 2, x: 0, advance: 12, rtl: false },
          { from: 2, to: 4, x: 12, advance: 8, rtl: true }
        ],
        width: 20,
        ascent: 14,
        descent: 4
      })
    };

    expect(shapeQuireTextRun("abcd", "16px serif", shapedMeasurer)).toEqual({
      clusters: [
        { from: 0, to: 2, x: 0, advance: 12, rtl: false },
        { from: 2, to: 4, x: 12, advance: 8, rtl: true }
      ],
      width: 20,
      ascent: 14,
      descent: 4
    });
  });
});
