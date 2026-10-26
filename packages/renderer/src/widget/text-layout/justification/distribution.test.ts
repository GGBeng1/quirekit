import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions } from "../types";

/** @param text - Source. @param extra - Overrides. @returns Stable grapheme metrics. */
function input(text: string, extra: Partial<QuireTextLayoutOptions> = {}): QuireTextLayoutOptions {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return { runs: [{ text, font: "16px test" }], maxWidth: 100, lineHeight: 24,
    baselineOffset: 18, alignment: "distribute",
    measureText: value => ({ width: [...segmenter.segment(value)].length * 10, height: 16 }), ...extra };
}

describe("shared distribution geometry", () => {
  it.each(["ABCD", "甲乙丙丁", "甲，乙。", "A😀e\u0301B", "A👩‍👩‍👧‍👦BC"])("distributes the final line without splitting graphemes: %s", text => {
    const result = layoutQuireText(input(text));
    expect(result.lines[0]?.rect.width).toBe(100);
    expect(result.clusters.map(cluster => cluster.x)).toEqual([0, 30, 60, 90]);
    expect(result.visualRuns.map(run => run.trailingSpacing ?? 0)).toEqual([20, 20, 20, 0]);
  });

  it("treats marks as styling only and retains existing shaped glyph widths", () => {
    const shapeText = vi.fn((text: string) => ({
      clusters: Array.from(text, (_, offset) => ({ offset, length: 1, advance: 10 })),
      glyphs: Array.from(text, (_, offset) => ({ glyphId: offset + 1, cluster: offset, x: offset * 10, y: 0,
        xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 }))
    }));
    const result = layoutQuireText(input("", { shapeText, runs: [
      { text: "AB", font: "16px test" }, { text: "CD", font: "bold 16px test" }
    ] }));
    expect(shapeText).toHaveBeenCalledTimes(2);
    expect(result.clusters.map(cluster => cluster.x)).toEqual([0, 30, 60, 90]);
    expect(result.visualRuns.map(run => run.glyphs[0]?.xAdvance)).toEqual([10, 10, 10, 10]);
    expect(result.visualRuns.map(run => run.glyphs[0]?.x)).toEqual([0, 0, 0, 0]);
  });

  it("distributes automatic, soft and paragraph-ending lines independently of justify's flag", () => {
    for (const justifySoftBreaks of [undefined, true, false]) {
      const result = layoutQuireText(input("甲乙丙丁戊己庚辛壬癸甲乙\n丙丁", { justifySoftBreaks, maxWidth: 65 }));
      expect(result.lines.map(line => line.rect.width)).toEqual([65, 65, 65]);
    }
  });

  it.each(["A", "甲", "😀", "e\u0301"])("centers a single visible grapheme in the actual indented slot: %s", text => {
    const result = layoutQuireText(input(text, { lineSlots: [[{ x: 17, width: 100 }]] }));
    expect(result.lines[0]?.rect).toMatchObject({ x: 62, width: 10 });
    expect(result.clusters[0]?.x).toBe(62);
    expect(result.visualRuns[0]?.x).toBe(62);
  });

  it("preserves leading spaces and trailing anchors, expanding internal spaces as character boundaries", () => {
    const result = layoutQuireText(input("  AB  "));
    expect(result.clusters.map(cluster => cluster.x)).toEqual([0, 10, 20, 90, 100, 100]);
    expect(result.clusters.map(cluster => cluster.advance)).toEqual([10, 10, 70, 10, 0, 0]);
    expect(result.lines[0]?.end.offset).toBe(6);
    expect(layoutQuireText(input("AB CD")).clusters.map(cluster => cluster.x)).toEqual([0, 22.5, 45, 67.5, 90]);
  });

  it("does not split required ligatures when distributing surrounding boundaries", () => {
    const result = layoutQuireText(input("fiAB", { shapeText: () => ({ clusters: [
      { offset: 0, length: 2, advance: 20 }, { offset: 2, length: 1, advance: 10 },
      { offset: 3, length: 1, advance: 10 }
    ], glyphs: [
      { glyphId: 1, cluster: 0, x: 0, y: 0, xAdvance: 20, yAdvance: 0, xOffset: 0, yOffset: 0 },
      { glyphId: 2, cluster: 2, x: 20, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 },
      { glyphId: 3, cluster: 3, x: 30, y: 0, xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 }
    ] }) }));
    expect(result.clusters.map(cluster => cluster.advance)).toEqual([20, 0, 70, 10]);
    expect(result.visualRuns[0]?.clusters.map(cluster => cluster.from)).toEqual([0, 1]);
    expect(result.visualRuns[0]?.glyphs[0]?.xAdvance).toBe(20);
  });

  it("retains natural geometry for empty, unbounded, tab, NBSP, complex-script and replacement rows", () => {
    for (const text of ["", "   ", "a\tb", "a\u00a0b", "אב גד", "ภาษาไทย", "देवनागरी"]) {
      const source = input(text);
      expect(layoutQuireText(source)).toEqual(layoutQuireText({ ...source, alignment: "start" }));
    }
    for (const text of ["A", "ABCD"]) {
      const source = input(text, { maxWidth: Infinity });
      expect(layoutQuireText(source)).toEqual(layoutQuireText({ ...source, alignment: "start" }));
    }
    const source = input("", { runs: [{ text: "A", font: "16px test", replacement: { inlineSize: 20 } }] });
    expect(layoutQuireText(source)).toEqual(layoutQuireText({ ...source, alignment: "start" }));
    expect(layoutQuireText(input("A", { maxWidth: 5 })).clusters[0]?.advance).toBe(10);
  });

  it("does not distribute independently across multiple exclusion slots", () => {
    const source = input("甲乙丙丁戊己", { lineSlots: [[{ x: 0, width: 25 }, { x: 50, width: 25 }]] });
    const distributed = layoutQuireText(source);
    const natural = layoutQuireText({ ...source, alignment: "start" });
    expect(distributed.lines[0]).toEqual(natural.lines[0]);
    expect(distributed.clusters.slice(0, 4)).toEqual(natural.clusters.slice(0, 4));
  });
});
