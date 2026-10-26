import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { describe, expect, it, vi } from "vitest";
import { resolveQuireNaturalRunGlyphMetrics } from "./natural-line-metrics";

describe("Word natural run line metrics", () => {
  it("aggregates glyph extents and centers the largest normal line strut", () => {
    const measureText = vi.fn((_text: string, font: string) => font.includes("SimSun")
      ? { width: 10, ascent: 14, descent: 2, lineHeight: 19 }
      : { width: 10, ascent: 12, descent: 4, lineHeight: 20 });
    const measurer: QuireTextMeasurer = {
      measureText
    };

    expect(resolveQuireNaturalRunGlyphMetrics(
      [
        createTextRun("16px SimSun"),
        createTextRun("16px Arial")
      ],
      "16px Arial",
      measurer
    )).toEqual({
      ascent: 14,
      descent: 4,
      extent: 18,
      lineHeight: 20,
      baselineOffset: 15
    });
    expect(measureText.mock.calls.map(([text]) => text)).toEqual(["Hg", "Hg"]);
  });

  it("falls back to the effective font size when vertical metrics are absent", () => {
    const measurer: QuireTextMeasurer = {
      measureText: () => ({ width: 10 })
    };

    expect(resolveQuireNaturalRunGlyphMetrics(
      [],
      "16px sans-serif",
      measurer
    )).toEqual({
      ascent: 12.8,
      descent: 3.2,
      extent: 16,
      lineHeight: 16,
      baselineOffset: 12.8
    });
  });

  it("measures each visible script with a glyph from the owning run", () => {
    const measureText = vi.fn((text: string) => text === "聘"
      ? { width: 10, ascent: 48, descent: 17, lineHeight: 66 }
      : { width: 10, ascent: 43, descent: 10, lineHeight: 55 });

    expect(resolveQuireNaturalRunGlyphMetrics(
      [createTextRun("48px Fallback Stack", "A聘")],
      "16px sans-serif",
      { measureText }
    )).toEqual({
      ascent: 48,
      descent: 17,
      extent: 65,
      lineHeight: 66,
      baselineOffset: 48.5
    });
    expect(measureText.mock.calls.map(([text]) => text)).toEqual(["Hg", "聘"]);
  });
});

/**
 * Creates one minimal mark-resolved inline run.
 *
 * @param font - Effective run font.
 * @param text - Run text used to select script-aware metric samples.
 * @returns Inline run fixture carrying the requested font and text.
 */
function createTextRun(font: string, text = "A"): QuireInlineTextRun {
  return {
    text,
    range: { from: 1, to: 2 },
    font,
    marks: []
  };
}
