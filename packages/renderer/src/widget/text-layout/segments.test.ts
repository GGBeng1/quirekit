import { describe, expect, it } from "vitest";
import { segmentGraphemes } from "./segments";

/** @param text - Source text. @returns Grapheme clusters reported by the platform segmenter. */
function platform(text: string): { text: string; offset: number }[] {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)]
    .map((segment) => ({ text: segment.segment, offset: segment.index }));
}

describe("grapheme segmentation", () => {
  it.each([
    "plain ASCII, with punctuation!", "中文段落，含标点。", "かなカナー混在", "全角ＡＢＣ１２３",
    "tab\tand\nnewline", "café naïve ¼", "dashes – — and “quotes” …",
    "é combining", "が voiced", "line\r\nbreak", "한국어", "👍🏽 emoji", "🇨🇳 flag",
    "a‍b joiner", "〪 tone", "ｶﾞ halfwidth", "ascii then 中文 then é"
  ])("matches the platform segmenter for %j", (text) => {
    expect(segmentGraphemes(text)).toEqual(platform(text));
  });
});
