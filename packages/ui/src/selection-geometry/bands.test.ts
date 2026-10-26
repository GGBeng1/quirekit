import { describe, expect, it } from "vitest";
import { groupQuireSelectionTextBands } from "./bands";

describe("shared selection visual rows", () => {
  it("keeps provenance and bidi gaps while normalizing mixed sizes and scripts", () => {
    const fragments = [
      { owner: "large", left: 0, right: 40, top: 0, bottom: 30 },
      { owner: "small", left: 40, right: 60, top: 12, bottom: 26 },
      { owner: "sup", left: 60, right: 65, top: 5, bottom: 16 },
      { owner: "rtl", left: 90, right: 110, top: 10, bottom: 28 }
    ];
    const original = structuredClone(fragments);
    const bands = groupQuireSelectionTextBands(fragments);
    expect(bands).toHaveLength(1);
    expect(bands[0]).toMatchObject({ top: 0, bottom: 30 });
    expect(bands[0]!.rects).toEqual(fragments);
    expect(bands[0]!.rects[0]).toBe(fragments[0]);
    expect(fragments).toEqual(original);
  });

  it("uses a shared intersection so wrapped rows cannot be bridged by a raised glyph", () => {
    const rows = groupQuireSelectionTextBands([
      { left: 0, right: 40, top: 10, bottom: 30 },
      { left: 40, right: 50, top: 20, bottom: 34 },
      { left: 50, right: 60, top: 5, bottom: 24 },
      { left: 0, right: 40, top: 32, bottom: 52 },
      { left: 40, right: 50, top: 30, bottom: 43 }
    ]);
    expect(rows.map(({ top, bottom }) => ({ top, bottom }))).toEqual([
      { top: 5, bottom: 34 }, { top: 30, bottom: 52 }
    ]);
  });

  it("ignores collapsed, hidden and invalid rectangles without changing visible ownership", () => {
    const visible = { left: 0, right: 10, top: 0, bottom: 20 };
    expect(groupQuireSelectionTextBands([
      { ...visible, right: 0 }, { ...visible, bottom: 0 }, { ...visible, top: NaN }, visible
    ])).toMatchObject([{ top: 0, bottom: 20, rects: [visible] }]);
  });
});
