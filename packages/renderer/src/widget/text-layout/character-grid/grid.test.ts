import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextRun } from "../types";
import type { QuireTextCharacterGrid } from "./types";

const spaced: QuireTextCharacterGrid = { mode: "spacing", spacing: 2, pitch: 18, unit: "grapheme", align: "center" };
const cells: QuireTextCharacterGrid = { ...spaced, mode: "cells" };
const latin: QuireTextCharacterGrid = { ...cells, unit: "block" };

/** @param text - Source text. @param font - Test font. @returns Deterministic font-proportional widths. */
function measureText(text: string, font: string) {
  const size = parseFloat(font);
  return { width: [...text].reduce((sum, char) => sum + (/[^\x00-\x7F]/u.test(char) ? size : size / 2), 0), height: size };
}

/** @param runs - Source runs. @param width - Physical slot extent. @returns Shared paint/caret geometry. */
function layout(runs: readonly QuireTextRun[], width = 1000) {
  return layoutQuireText({ runs, maxWidth: width, lineHeight: 30, baselineOffset: 24, measureText });
}

describe("character grid allocation", () => {
  it("bounds native Chinese measurement by distinct graphemes rather than paragraph prefixes", () => {
    const measure = vi.fn(measureText);
    const result = layoutQuireText({ runs: [{ text: "甲乙".repeat(308), font: "16px serif", characterGrid: spaced }],
      maxWidth: 504, lineHeight: 30, baselineOffset: 24, measureText: measure });
    expect(result.lines).toHaveLength(22);
    expect(measure.mock.calls.reduce((sum, [text]) => sum + text.length, 0)).toBeLessThanOrEqual(616);
  });

  it("retains native word kerning while reusing repeated word prefixes", () => {
    const measure = vi.fn((text: string, font: string) => ({
      ...measureText(text, font), width: text.length * 8 - (text.match(/AV/gu)?.length ?? 0) * 4
    }));
    const result = layoutQuireText({ runs: [{ text: "AV AV", font: "16px serif", characterGrid: latin }],
      maxWidth: 100, lineHeight: 30, baselineOffset: 24, measureText: measure });
    expect(result.lines[0]!.rect.width).toBe(36);
    expect(result.clusters.map(cluster => cluster.advance)).toEqual([10, 4, 8, 8, 6]);
    expect(measure.mock.calls.every(([text]) => text.length <= 2)).toBe(true);
  });

  it("accepts only bounded input rounding at the right edge, without shrinking paint geometry", () => {
    const grid = { ...spaced, spacing: -841 / 4096, pitch: 16 - 841 / 4096, roundingError: 1 / 8192 };
    const runs = [{ text: "甲".repeat(28), font: "16px serif", characterGrid: grid }];
    expect(layout(runs, 442.25).lines).toHaveLength(1);
    expect(layout(runs, 442.25).lines[0]!.rect.width).toBeCloseTo(442.2509765625, 8);
    expect(layout(runs, 442.24).lines).toHaveLength(2);
    expect(layout([{ ...runs[0]!, characterGrid: { ...grid, roundingError: 0 } }], 442.25).lines).toHaveLength(2);
  });
  it("uses the grid pitch for automatic gaps and avoids double spacing strict cells", () => {
    const create = (mode: "off" | "spacing" | "cells") => layoutQuireText({
      runs: [{ text: "甲", font: "16px serif", ...(mode === "off" ? {} : { characterGrid: mode === "cells" ? cells : spaced }) },
        { text: "ABC", font: "16px serif", ...(mode === "off" ? {} : { characterGrid: mode === "cells" ? latin : spaced }) },
        { text: "乙", font: "16px serif", ...(mode === "off" ? {} : { characterGrid: mode === "cells" ? cells : spaced }) }],
      autoSpacing: { ideographAlpha: 0.25 }, maxWidth: 300, lineHeight: 30, baselineOffset: 24, measureText
    });
    expect(create("off").lines[0]!.rect.width).toBe(64);
    expect(create("spacing").lines[0]!.rect.width).toBe(75);
    expect(create("cells").lines[0]!.rect.width).toBe(72);
    expect(create("cells").clusters.map(item => item.x)).toEqual([0, 18, 32, 40, 54]);
  });

  it("retains tab geometry and starts a new block after the tab", () => {
    const result = layoutQuireText({ runs: [{ text: "AB\tCD", font: "16px serif", characterGrid: latin }],
      tabs: { stops: [{ position: 54, alignment: "start" }] }, maxWidth: 200,
      lineHeight: 30, baselineOffset: 24, measureText });
    expect(result.clusters.map(item => item.x)).toEqual([0, 9, 18, 54, 63]);
    expect(result.lines[0]!.rect.width).toBe(72);
  });

  it("adds signed spacing after glyph scaling and tracking without changing font size", () => {
    const result = layout([
      { text: "甲乙", font: "16px serif", characterGrid: spaced },
      { text: "丙丁", font: "8px serif", characterGrid: spaced },
      { text: "戊己", font: "24px serif", characterGrid: spaced, horizontalScale: 1.5, letterSpacing: 2 }
    ]);
    expect(result.clusters.map(item => item.advance)).toEqual([18, 18, 10, 10, 40, 40]);
    expect(result.visualRuns.map(item => item.x)).toEqual([0, 18, 36, 46, 56, 96]);
  });

  it("fits a negative-spacing 616-character paragraph into 22 rows of 28 characters", () => {
    const grid = { ...spaced, spacing: -0.20361328125, pitch: 15.79638671875 };
    const result = layout([{ text: "甲".repeat(616), font: "16px serif", characterGrid: grid }], 442.3);
    expect(result.lines).toHaveLength(22);
    expect(result.lines.map(line => line.clusterEnd - line.clusterStart)).toEqual(Array(22).fill(28));
    expect(layout([{ text: "甲".repeat(616), font: "16px serif" }], 442.3).lines).toHaveLength(23);
  });

  it("centers small and large East Asian glyphs inside integral cells", () => {
    const result = layout([
      { text: "甲乙", font: "8px serif", characterGrid: cells },
      { text: "丙丁", font: "24px serif", characterGrid: cells }
    ]);
    expect(result.clusters.map(item => item.advance)).toEqual([18, 18, 36, 36]);
    expect(result.visualRuns.map(item => item.paintOffset)).toEqual([5, 5, 6, 6]);
  });

  it("rounds Latin text once across style boundaries, and again at each physical line", () => {
    const result = layout([
      { text: "ABC", font: "16px serif", characterGrid: latin },
      { text: "DEF", font: "16px monospace", characterGrid: latin }
    ], 36);
    expect(result.lines.map(line => line.rect.width)).toEqual([36, 18]);
    expect(result.lines.map(line => line.clusterEnd - line.clusterStart)).toEqual([4, 2]);
    expect(result.clusters.map(item => item.advance)).toEqual([10, 8, 8, 10, 9, 9]);
    const unbroken = layout([{ text: "ABC", font: "16px serif", characterGrid: latin },
      { text: "DEF", font: "16px monospace", characterGrid: latin }]);
    expect(unbroken.lines[0]!.rect.width).toBe(54);
    expect(unbroken.visualRuns.map(run => run.paintOffset ?? 0)).toEqual([3, 0]);
  });

  it("remeasures a block when a slot change discards the preceding cell remainder", () => {
    const result = layout([{ text: "AB CD EF", font: "16px serif", characterGrid: latin }], 36);
    expect(result.lines.every(line => line.rect.width <= 36)).toBe(true);
    expect(result.lines.map(line => line.clusterEnd - line.clusterStart)).toEqual([3, 3, 2]);
  });

  it("shapes each source run once and uses allocated positions for glyphs", () => {
    const shapeText = vi.fn(() => ({ direction: "ltr" as const,
      clusters: [{ offset: 0, length: 1, advance: 16 }, { offset: 1, length: 1, advance: 16 }],
      glyphs: [0, 1].map(index => ({ glyphId: index + 1, cluster: index, x: index * 16, y: 0,
        xAdvance: 16, yAdvance: 0, xOffset: 0, yOffset: 0 })) }));
    const result = layoutQuireText({ runs: [{ text: "甲乙", font: "16px serif", characterGrid: cells }],
      maxWidth: 100, lineHeight: 30, baselineOffset: 24, measureText, shapeText });
    expect(shapeText).toHaveBeenCalledTimes(1);
    expect(result.clusters.map(cluster => cluster.x)).toEqual([0, 18]);
    expect(result.visualRuns.flatMap(run => run.glyphs.map(glyph => run.x + glyph.x))).toEqual([1, 19]);
  });
});
