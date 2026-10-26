import { describe, expect, it } from "vitest";
import { layoutQuireText } from "./layout";
import type { QuireTextLayoutOptions } from "./types";

/**
 * @param scale - Horizontal glyph ratio.
 * @param extra - Layout overrides.
 * @returns Shared text geometry. */
function layout(scale: number, extra: Partial<QuireTextLayoutOptions> = {}) {
  return layoutQuireText({ runs: [{ text: "AB中文", font: "16px test", horizontalScale: scale }],
    maxWidth: 100, lineHeight: 24, baselineOffset: 18,
    measureText: text => ({ width: [...text].length * 10, height: 16 }), ...extra });
}

describe("horizontal glyph scaling", () => {
  it("scales wrapping and caret clusters without changing vertical metrics", () => {
    expect(layout(0.8).clusters.map(c => c.advance)).toEqual([8, 8, 8, 8]);
    expect(layout(1.2).lines[0]!.rect).toEqual({ x: 0, y: 0, width: 48, height: 24 });
    expect(layout(2, { maxWidth: 40 }).lines).toHaveLength(2);
  });
  it("keeps tracking and atomic replacements independent", () => {
    const result = layout(2, { runs: [
      { text: "AB", font: "16px test", horizontalScale: 2, letterSpacing: 3 },
      { text: "X", font: "16px test", horizontalScale: 2, replacement: { inlineSize: 15 } }
    ] });
    expect(result.clusters.map(c => c.advance)).toEqual([23, 23, 15]);
  });
  it("scales shaped glyph positions and advances once, preserving vertical offsets", () => {
    const result = layout(2, { runs: [{ text: "AB", font: "16px test", horizontalScale: 2 }],
      shapeText: () => ({ clusters: [{ offset: 0, length: 1, advance: 10 }, { offset: 1, length: 1, advance: 10 }],
        glyphs: [0, 1].map(cluster => ({ glyphId: cluster + 1, cluster, x: cluster * 10, y: 3,
          xAdvance: 10, yAdvance: 0, xOffset: 1, yOffset: 2 })), glyphCoverage: "complete" }) });
    expect(result.clusters.map(c => [c.x, c.advance])).toEqual([[0, 20], [20, 20]]);
    expect(result.visualRuns.flatMap(r => r.glyphs.map(g => [g.x, g.xAdvance, g.xOffset, g.y, g.yOffset])))
      .toEqual([[0, 20, 2, 3, 2], [20, 20, 2, 3, 2]]);
  });
  it("aligns a tab field using scaled content but the original stop position", () => {
    const result = layout(2, { runs: [{ text: "\tAB", font: "16px test", horizontalScale: 2 }],
      tabs: { stops: [{ position: 100, alignment: "end" }] } });
    expect(result.clusters.map(c => [c.x, c.advance])).toEqual([[0, 60], [60, 20], [80, 20]]);
  });
});
