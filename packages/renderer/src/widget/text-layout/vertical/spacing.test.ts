import { describe, expect, it } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions, QuireTextLineSpacing } from "../types";

/** @param overrides - Per-case layout inputs. @returns Measured visual lines. */
function lines(overrides: Partial<QuireTextLayoutOptions> & {
  lineSpacing: QuireTextLineSpacing;
}) {
  return layoutQuireText({
    runs: [{ text: "small\nsmall", font: "16px Arial", ascent: 12, descent: 4 }],
    maxWidth: 200,
    lineHeight: 32,
    baselineOffset: 24,
    measureText: text => ({ width: text.length * 8, height: 16 }),
    ...overrides
  }).lines;
}

describe("per-line spacing independent of glyph bounds", () => {
  it("anchors an explicit fixed baseline independently from font, mark and object extents", () => {
    for (const height of [2, 20, 30, 40, 60]) {
      const result = lines({
        lineSpacing: { mode: "exact", value: height, exactBaselineRatio: 0.8 },
        runs: [
          { text: "small\n", font: "16px Arial", ascent: 12, descent: 4 },
          { text: "大", font: "32px SimSun", ascent: 30, descent: 8, baselineShift: 5 },
          { text: "\ufffc", font: "16px Arial", ascent: 50, descent: 0, replacement: { inlineSize: 20 } }
        ],
        finalLineMetricContribution: { ascent: 60, descent: 20 }
      });
      expect(result.map(line => line.rect.height)).toEqual([height, height]);
      expect(result.map(line => line.baselineOffset)).toEqual([height * 0.8, height * 0.8]);
      expect(result[1]!.rect.y).toBe(height);
    }
    expect(lines({ runs: [], lineSpacing: { mode: "exact", value: 20, exactBaselineRatio: 0.8 } })[0]!.baselineOffset).toBe(16);
  });

  it("ignores a fixed baseline ratio for minimum and multiple line spacing", () => {
    for (const mode of ["multiple", "at-least"] as const) {
      const value = mode === "multiple" ? 1.5 : 24;
      expect(lines({ lineSpacing: { mode, value, exactBaselineRatio: 0.8 } }))
        .toEqual(lines({ lineSpacing: { mode, value } }));
    }
  });

  it("keeps positive automatic leading below text and moves compressed baselines up", () => {
    const expanded = lines({ lineSpacing: { mode: "multiple", value: 1.5 } });
    expect(expanded[0]!.rect.height).toBe(24);
    expect(expanded[0]!.baselineOffset).toBe(12);
    expect(expanded[1]!.baselineOffset).toBe(12);
    const compressed = lines({ lineSpacing: { mode: "multiple", value: 0.5 } });
    expect(compressed[0]!.baselineOffset).toBe(4);
  });
  it("does not grow small lines to a different line's largest font", () => {
    const result = lines({ lineSpacing: { mode: "multiple", value: 1 }, runs: [
      { text: "small\n", font: "16px Arial", ascent: 12, descent: 4 },
      { text: "BIG", font: "32px Arial", ascent: 24, descent: 8 }
    ] });
    expect(result.map(line => line.rect.height)).toEqual([16, 32]);
  });

  it("permits half-spacing without shrinking the glyph metrics", () => {
    const result = lines({ lineSpacing: { mode: "multiple", value: 0.5 } });
    expect(result.map(line => line.rect.height)).toEqual([8, 8]);
    expect(result[1]!.rect.y).toBe(8);
  });

  it("bottom-aligns overflowing exact text without clamping a negative baseline", () => {
    const result = lines({ lineSpacing: { mode: "exact", value: 2 } });
    expect(result[0]!.rect.height).toBe(2);
    expect(result[0]!.baselineOffset).toBe(-2);
  });

  it("centers text within larger exact and minimum boxes", () => {
    for (const mode of ["exact", "at-least"] as const) {
      const result = lines({ lineSpacing: { mode, value: 24 } });
      expect(result[0]!.rect.height).toBe(24);
      expect(result[0]!.baselineOffset).toBe(16);
    }
    expect(lines({ lineSpacing: { mode: "at-least", value: 8 } })[0]!.rect.height).toBe(16);
  });

  it("includes the font line gap and applies the multiplier after the final mark", () => {
    const result = lines({ lineSpacing: { mode: "multiple", value: 2 }, runs: [
      { text: "A\nB", font: "16px Arial", ascent: 12, descent: 4, lineHeight: 20 }
    ], finalLineMetricContribution: { ascent: 24, descent: 8 } });
    expect(result.map(line => line.rect.height)).toEqual([40, 64]);
  });

  it("does not multiply an inline object's physical height", () => {
    const result = lines({ lineSpacing: { mode: "multiple", value: 2 }, runs: [
      { text: "A", font: "16px Arial", ascent: 12, descent: 4 },
      { text: "\ufffc", font: "16px Arial", ascent: 40, descent: 0, replacement: { inlineSize: 20 } }
    ] });
    expect(result[0]!.rect.height).toBe(60);
  });

  it("retains the fallback strut for an empty paragraph", () => {
    expect(lines({ runs: [], lineSpacing: { mode: "multiple", value: 0.5 } })[0]!.rect.height).toBe(16);
  });
});
