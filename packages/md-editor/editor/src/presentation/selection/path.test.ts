import { describe, expect, it } from "vitest";
import { selectionPath } from "./path";

describe("document selection path", () => {
  const clip = { left: 30, top: 10, right: 100, bottom: 80 };
  const origin = { left: 10, top: 5 };
  it("clips controls and preserves nested text positions in the native coordinate space", () => {
    expect(selectionPath([{ left: 0, top: 0, right: 60, bottom: 30 }, { left: 50, top: 40, right: 120, bottom: 90 }], clip, origin))
      .toBe("M20 5H50V25H20ZM40 35H90V75H40Z");
  });
  it("drops collapsed source markers, offscreen fragments and invalid geometry", () => {
    expect(selectionPath([{ left: 40, right: 40, top: 20, bottom: 40 }, { left: 0, right: 20, top: 20, bottom: 40 },
      { left: NaN, right: 80, top: 20, bottom: 40 }, { left: 40, right: 80, top: 30, bottom: 30 }], clip, origin)).toBe("");
  });
  it("puts overlapping fragments in the same clockwise nonzero-fill path", () => {
    const rect = { left: 40, top: 20, right: 80, bottom: 40 };
    const part = "M30 15H70V35H30Z";
    expect(selectionPath([rect, rect], clip, origin)).toBe(part + part);
  });
});
