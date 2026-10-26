import { describe, expect, it, vi } from "vitest";
import { layoutQuireText } from "../layout";
import type { QuireTextLayoutOptions, QuireTextRun } from "../types";

/** @param runs - Styled source. @param width - Available inline extent. @param extra - Overrides. @returns Geometry and reconstructed source lines. */
function layout(runs: string | readonly QuireTextRun[], width: number, extra: Partial<QuireTextLayoutOptions> = {}) {
  const source = typeof runs === "string" ? [{ text: runs, font: "16px test" }] : runs;
  const result = layoutQuireText({ runs: source, maxWidth: width, lineHeight: 24, baselineOffset: 18,
    measureText: text => ({ width: [...text].length * 10, height: 16 }), ...extra });
  const lines = result.lines.map(line => result.clusters.slice(line.clusterStart, line.clusterEnd)
    .map(cluster => source[cluster.run]!.text.slice(cluster.offset, cluster.offset + cluster.length)).join(""));
  return { ...result, textLines: lines };
}

describe("basic Chinese punctuation wrapping", () => {
  it.each([
    ["这是示例文字，继续。", 60, ["这是示例文", "字，继续。"]],
    ["参见附件（具体内容）", 50, ["参见附件", "（具体内", "容）"]],
    ["这是（示例）内容", 50, ["这是（示", "例）内容"]],
    ["甲乙《“丙”》。", 60, ["甲乙", "《“丙”》。"]]
  ] as const)("wraps %s without avoidable orphan punctuation", (text, width, expected) => {
    expect(layout(text, width).textLines).toEqual(expected);
  });

  it.each(["，", "。", "、", "；", "：", "！", "？", "）", "］", "｝", "】", "》", "〉", "」", "』", "”", "’"])("keeps closing %s with preceding text across styles", punctuation => {
    const result = layout([{ text: "甲乙", font: "16px one" }, { text: punctuation + "丙", font: "bold 16px two" }], 20);
    expect(result.textLines).toEqual(["甲", "乙" + punctuation, "丙"]);
    expect(result.clusters.map(({ run, offset }) => [run, offset])).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
  });

  it.each(["（", "［", "｛", "【", "《", "〈", "「", "『", "“", "‘"])("keeps opening %s with following text across styles", punctuation => {
    expect(layout([{ text: "甲" + punctuation, font: "16px one" }, { text: "乙丙", font: "bold 16px two" }], 20).textLines)
      .toEqual(["甲", punctuation + "乙", "丙"]);
  });

  it("keeps punctuation on overlong Latin-word fallback boundaries", () => {
    expect(layout("（abcdef）", 30).textLines).toEqual(["（ab", "cde", "f）"]);
  });

  it("respects explicit separators and manual breaks", () => {
    expect(layout("甲乙\n，丙", 20).textLines).toEqual(["甲乙", "，丙"]);
    expect(layout("甲（ 乙", 20).textLines).toEqual(["甲（", " 乙"]);
    expect(layout("甲乙\t，丙", 20).textLines.join("")).toBe("甲乙\t，丙");
  });

  it("preserves anywhere and explicit disabled behavior", () => {
    expect(layout("甲乙，丙", 20, { avoidPunctuationBreaks: false }).textLines).toEqual(["甲乙", "，丙"]);
    expect(layout("甲乙，丙", 20, { wrapMode: "anywhere" }).textLines).toEqual(["甲乙", "，丙"]);
  });

  it.each([0, 5, 10])("makes progress in an impossible %d px cell without dropping source", width => {
    const text = "（甲），乙。";
    const result = layout(text, width);
    expect(result.textLines).toEqual([...text]);
    expect(result.lines.every(line => line.rect.width === 10)).toBe(true);
  });

  it("retains NBSP indivisibility when punctuation is adjacent", () => {
    const result = layout("甲a\u00a0b，乙", 20);
    expect(result.textLines).toEqual(["甲", "a\u00a0b，", "乙"]);
  });

  it("uses shaped advances once and retains all cluster anchors", () => {
    const measureText = vi.fn(() => { throw new Error("must use shaped advances"); });
    const shapeText = vi.fn((text: string) => ({ clusters: [...text].map((_, offset) => ({ offset, length: 1, advance: 12 })), glyphs: [] }));
    const result = layout("甲乙，丙", 24, { shapeText, measureText, shouldShapeRun: () => true });
    expect(result.textLines).toEqual(["甲", "乙，", "丙"]);
    expect(result.lines.map(line => line.rect.width)).toEqual([12, 24, 12]);
    expect(result.clusters.map(cluster => cluster.offset)).toEqual([0, 1, 2, 3]);
    expect(shapeText).toHaveBeenCalledOnce();
    expect(measureText).not.toHaveBeenCalled();
  });

  it("honors leading row slots without producing an orphaned opening bracket", () => {
    expect(layout("甲（乙）丙", 40, { lineSlots: [[{ x: 10, width: 20 }]] }).textLines)
      .toEqual(["甲", "（乙）丙"]);
  });

  it("bounds measurement work for a long punctuation sequence", () => {
    const text = "甲，".repeat(500);
    const measureText = vi.fn((value: string) => ({ width: value.length * 10, height: 16 }));
    const result = layout(text, 60, { measureText });
    expect(result.textLines.join("")).toBe(text);
    expect(result.textLines.every(line => !line.startsWith("，"))).toBe(true);
    expect(measureText.mock.calls.length).toBeLessThan(text.length * 5);
  });
});
