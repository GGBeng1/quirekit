import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions } from "../types";

/** @param text - Source text. @param extra - Overrides. @returns Deterministic layout input. */
function input(text: string, extra: Partial<QuireTextLayoutOptions> = {}): QuireTextLayoutOptions {
  return { runs: [{ text, font: "16px test" }], maxWidth: 65, lineHeight: 24,
    baselineOffset: 18, alignment: "justify", measureText: (value) => ({ width: value.length * 10, height: 16 }), ...extra };
}

describe("shared justification geometry", () => {
  it("expands interior spaces, retaining trailing-space anchors and a natural last line", () => {
    const result = layoutQuireText(input("aa bb cc"));
    expect(result.lines.map((line) => line.rect.width)).toEqual([65, 20]);
    expect(result.clusters.slice(0, 6).map((cluster) => cluster.advance)).toEqual([10, 10, 25, 10, 10, 0]);
    expect(result.clusters[3]?.x).toBe(45);
    expect(result.lines[0]?.end.offset).toBe(6);
    expect(result.visualRuns.filter((run) => run.line === 0).map((run) => run.x)).toContain(45);
  });

  it("expands CJK boundaries across marks without inventing mark-boundary spacing", () => {
    const result = layoutQuireText(input("", { runs: [
      { text: "中文段", font: "16px test" }, { text: "落对齐示例", font: "bold 16px test" }
    ] }));
    expect(result.lines.map((line) => line.rect.width)).toEqual([65, 20]);
    expect(result.clusters.slice(0, 6).map((cluster) => cluster.x)).toEqual([0, 11, 22, 33, 44, 55]);
    expect(result.visualRuns.slice(0, 6).map((run) => run.trailingSpacing ?? 0)).toEqual([1, 1, 1, 1, 1, 0]);
  });

  it("distinguishes soft breaks from true paragraph ends", () => {
    expect(layoutQuireText(input("aa bb\ncc")).lines.map((line) => line.rect.width)).toEqual([65, 20]);
    expect(layoutQuireText(input("aa bb\ncc", { justifySoftBreaks: false })).lines.map((line) => line.rect.width)).toEqual([50, 20]);
    expect(layoutQuireText(input("aa bb")).lines[0]?.rect.width).toBe(50);
  });

  it("does not stretch unbreakable words, tabs, NBSP or unbounded lines", () => {
    for (const text of ["abcdefg", "a\tb\ncc", "a\u00a0b\ncc"]) {
      const source = input(text);
      expect(layoutQuireText(source)).toEqual(layoutQuireText({ ...source, alignment: "start" }));
    }
    expect(layoutQuireText(input("aa bb\ncc", { maxWidth: Infinity })).lines[0]?.rect.width).toBe(50);
  });

  it("reuses shaped words while rebasing painting onto the expanded cluster origins", () => {
    const shapeText = vi.fn((text: string) => ({
      clusters: Array.from(text, (_, offset) => ({ offset, length: 1, advance: 10 })),
      glyphs: Array.from(text, (_, offset) => ({ glyphId: offset + 1, cluster: offset, x: offset * 10, y: 0,
        xAdvance: 10, yAdvance: 0, xOffset: 0, yOffset: 0 }))
    }));
    const result = layoutQuireText(input("aa bb cc", { shapeText }));
    expect(shapeText).toHaveBeenCalledOnce();
    const word = result.visualRuns.find((run) => run.line === 0 && run.clusters[0]?.from === 3);
    expect(word?.x).toBe(45);
    expect(word?.glyphs.map((glyph) => glyph.x)).toEqual([0, 10]);
  });

  it("uses the actual indented slot and preserves required shaped cluster interiors", () => {
    const result = layoutQuireText(input("中文段落对齐示例", {
      lineSlots: [[{ x: 17, width: 65 }]],
      shapeText: () => ({ clusters: [
        { offset: 0, length: 2, advance: 20 },
        ...[2, 3, 4, 5, 6, 7].map(offset => ({ offset, length: 1, advance: 10 }))
      ], glyphs: [] })
    }));
    expect(result.lines[0]?.rect).toMatchObject({ x: 17, width: 65 });
    expect(result.clusters[0]?.advance).toBe(20);
    expect(result.clusters[1]?.advance).toBe(0);
    expect(result.clusters[2]?.x).toBe(37);
  });

  it("does not invent gaps at Latin mark boundaries or inside mixed-direction rows", () => {
    const source = input("", { runs: [{ text: "abc", font: "16px test" }, { text: "defg", font: "bold 16px test" }] });
    expect(layoutQuireText(source)).toEqual(layoutQuireText({ ...source, alignment: "start" }));
    const rtl = input("אב גד\nה", { baseDirection: "rtl" });
    expect(layoutQuireText(rtl)).toEqual(layoutQuireText({ ...rtl, alignment: "start" }));
  });
});
