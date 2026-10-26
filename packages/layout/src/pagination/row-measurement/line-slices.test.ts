import { describe, expect, it } from "vitest";
import { createQuireMeasuredRowLineSlices } from "./line-slices";

const row = {
  range: { from: 10, to: 60 },
  top: 10,
  bottom: 70
};

describe("measured row line slices", () => {
  it("coalesces overlapping parallel lines without losing their facts", () => {
    const first = { id: "first", from: 12, to: 16, top: 20, bottom: 32 };
    const second = { id: "second", from: 22, to: 26, top: 28, bottom: 40 };

    expect(createQuireMeasuredRowLineSlices(row, [first, second])).toEqual([
      {
        range: { from: 10, to: 60 },
        top: 10,
        bottom: 70,
        lines: [first, second]
      }
    ]);
  });

  it("retains framework bounds only on the first and last slices", () => {
    const first = { from: 12, to: 16, top: 20, bottom: 32 };
    const last = { from: 42, to: 46, top: 40, bottom: 52 };

    expect(createQuireMeasuredRowLineSlices(row, [first, last])).toEqual([
      {
        range: { from: 10, to: 16 },
        top: 10,
        bottom: 32,
        lines: [first]
      },
      {
        range: { from: 42, to: 60 },
        top: 40,
        bottom: 70,
        lines: [last]
      }
    ]);
  });

  it("uses the row range when an assigned line has a foreign source range", () => {
    const continuation = { from: 1, to: 4, top: 6, bottom: 22 };

    expect(createQuireMeasuredRowLineSlices(row, [continuation])).toEqual([
      {
        range: row.range,
        top: row.top,
        bottom: row.bottom,
        lines: [continuation]
      }
    ]);
  });
});
