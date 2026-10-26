import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions, QuireTextRun } from "../types";

/** @param text - Plain or styled input. @param extra - Geometry overrides. @returns Layout with reconstructed lines. */
function layout(text: string | readonly QuireTextRun[], extra: Partial<QuireTextLayoutOptions> = {}) {
  const runs = typeof text === "string" ? [{ text, font: "16px test" }] : text;
  const result = layoutQuireText({ runs, maxWidth: 200, lineHeight: 24, baselineOffset: 18,
    autoSpacing: { ideographAlpha: 0.25, ideographNumeric: 0.25 },
    measureText: value => ({ width: [...value].length * 10, height: 16 }), ...extra });
  return { ...result, textLines: result.lines.map(line => result.clusters.slice(line.clusterStart, line.clusterEnd)
    .map(cluster => runs[cluster.run]!.text.slice(cluster.offset, cluster.offset + cluster.length)).join("")) };
}

describe("automatic ideographic boundary spacing", () => {
  it.each([
    [{ ideographAlpha: 0.25, ideographNumeric: 0.25 }, [14, 14, 14, 14, 10]],
    [{ ideographAlpha: 0.25, ideographNumeric: 0 }, [14, 14, 10, 10, 10]],
    [{ ideographAlpha: 0, ideographNumeric: 0.25 }, [10, 10, 14, 14, 10]],
    [undefined, [10, 10, 10, 10, 10]]
  ] as const)("keeps letter and numeric policies independent: %s", (autoSpacing, widths) => {
    const result = layout("中A文1中", { autoSpacing });
    expect(result.clusters.map(cluster => cluster.advance)).toEqual(widths);
    expect(result.clusters.map(cluster => cluster.offset)).toEqual([0, 1, 2, 3, 4]);
    expect(result.textLines).toEqual(["中A文1中"]);
  });

  it("uses the ideographic font size across styled runs and exposes paint spacing", () => {
    const result = layout([{ text: "中", font: "24px cjk" }, { text: "AB", font: "bold 12px latin" }, { text: "文", font: "16px cjk" }]);
    expect(result.clusters.map(cluster => [cluster.x, cluster.advance])).toEqual([[0, 16], [16, 10], [26, 14], [40, 10]]);
    expect(result.visualRuns.map(run => run.x)).toEqual([0, 16, 26, 40]);
    expect(result.visualRuns.filter(run => run.trailingSpacing).map(run => run.trailingSpacing)).toEqual([6, 4]);
  });

  it("removes spacing at automatic line and physical slot edges", () => {
    const result = layout("中A文", { maxWidth: 20 });
    expect(result.textLines).toEqual(["中", "A", "文"]);
    expect(result.lines.map(line => line.rect.width)).toEqual([10, 10, 10]);
    const slots = layout("中A文", { maxWidth: 50, lineSlots: [[{ x: 0, width: 20 }, { x: 30, width: 20 }]] });
    expect(slots.clusters.map(cluster => [cluster.line, cluster.x, cluster.advance])).toEqual([[0, 0, 10], [0, 30, 10], [1, 0, 10]]);
  });

  it.each(["中 A", "中\u00a0A", "中，A", "中Ａ", "中１", "A\n中", "中\tA"])("does not add a gap across explicit separator/fullwidth text: %s", text => {
    expect(layout(text).clusters.every(cluster => cluster.advance === 10)).toBe(true);
  });

  it("treats combining Latin characters as one boundary and excludes inline replacements", () => {
    const shaped = layout("中e\u0301文");
    expect(shaped.clusters.map(cluster => cluster.offset)).toEqual([0, 1, 3]);
    expect(shaped.clusters.map(cluster => cluster.advance)).toEqual([14, 24, 10]);
    const replacement = layout([{ text: "中", font: "16px test" }, { text: "A", font: "16px test", replacement: { inlineSize: 30 } }]);
    expect(replacement.clusters.map(cluster => cluster.advance)).toEqual([10, 30]);
  });

  it("retains whole words, emergency progress and NBSP source without edge gaps", () => {
    expect(layout("中ABCDE文", { maxWidth: 25 }).textLines).toEqual(["中A", "BC", "DE", "文"]);
    expect(layout("中a\u00a0b文", { maxWidth: 20 }).textLines).toEqual(["中", "a\u00a0b", "文"]);
    expect(layout("中A文1中", { maxWidth: 0 }).lines.map(line => line.rect.width)).toEqual([10, 10, 10, 10, 10]);
  });

  it("shares shaped widths without invoking native measurement", () => {
    const measureText = vi.fn(() => { throw new Error("unexpected native measurement"); });
    const shapeText = vi.fn((text: string) => ({ clusters: [...text].map((_, offset) => ({ offset, length: 1, advance: 12 })),
      glyphs: [...text].map((_, offset) => ({ glyphId: offset + 1, cluster: offset, x: offset * 12, y: 0,
        xAdvance: 12, yAdvance: 0, xOffset: 0, yOffset: 0 })), glyphCoverage: "complete" as const }));
    const result = layout("中A文", { measureText, shapeText, shouldShapeRun: () => true });
    expect(result.clusters.map(cluster => cluster.advance)).toEqual([16, 16, 12]);
    expect(result.visualRuns.map(run => run.x)).toEqual([0, 16, 32]);
    expect(result.visualRuns.flatMap(run => run.glyphs.map(glyph => [glyph.glyphId, run.x + glyph.x]))).toEqual([[1, 0], [2, 16], [3, 32]]);
    expect(shapeText).toHaveBeenCalledOnce();
    expect(measureText).not.toHaveBeenCalled();
  });

  it("fits automatic gaps before distribution and aligns tab fields using the same width", () => {
    const distributed = layout("中A文", { maxWidth: 50, alignment: "distribute" });
    expect(distributed.clusters.map(cluster => cluster.advance)).toEqual([20, 20, 10]);
    expect(distributed.visualRuns.filter(run => run.trailingSpacing).map(run => run.trailingSpacing)).toEqual([10, 10]);
    const tabbed = layout("\t中A", { tabs: { stops: [{ position: 100, alignment: "end" }] } });
    expect(tabbed.clusters.map(cluster => [cluster.x, cluster.advance])).toEqual([[0, 76], [76, 14], [90, 10]]);
  });
});
