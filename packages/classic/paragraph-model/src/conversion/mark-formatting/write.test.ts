import { describe, expect, it } from "vitest";
import type { LitAstMark } from "@quirekit/lit-docx-contract";
import { litAstParagraphMarkFormattingToWord, wordParagraphMarkFormattingToLitAst } from "../mark-formatting";

const source: LitAstMark[] = [
  { type: "bold" }, { type: "underline", attrs: { style: "double", color: "#123456" } },
  { type: "characterStyle", attrs: { styleId: "Emphasis" } },
  { type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "11pt", color: "#123456",
    fontFamilyAsciiTheme: "minorHAnsi", fontFamilyHighAnsiTheme: "minorHAnsi",
    fontFamilyEastAsia: "SimSun", fontFamilyEastAsiaTheme: "minorEastAsia",
    fontFamilyComplexScript: "Arial", fontFamilyComplexScriptTheme: "minorBidi", fontSizeComplexScript: "12pt",
    themeColor: "accent1", themeTint: "80", kern: 1, lang: { val: "en-US" },
    _rPrPreservation: { rawChildren: [{ "w:noProof": [] }], semantic: { kern: 1 } } } }
];

describe("paragraph mark delta export", () => {
  it("preserves the complete source when its modeled projection is unchanged", () => {
    const before = structuredClone(source);
    expect(wordParagraphMarkFormattingToLitAst(litAstParagraphMarkFormattingToWord(source), source)).toEqual(source);
    expect(source).toEqual(before);
  });
  it("changes only color and its theme binding while keeping fonts, kerning and underline attributes", () => {
    const before = structuredClone(source), value = { ...litAstParagraphMarkFormattingToWord(source)!, color: "#ABCDEF" };
    const result = wordParagraphMarkFormattingToLitAst(value, source)!;
    const attrs = result.find(mark => mark.type === "textStyle")!.attrs!;
    expect(attrs).toMatchObject({ color: "#ABCDEF", kern: 1, fontFamilyAsciiTheme: "minorHAnsi", fontSizeComplexScript: "12pt" });
    expect(attrs).not.toHaveProperty("themeColor"); expect(attrs).not.toHaveProperty("themeTint");
    expect(result.find(mark => mark.type === "underline")).toEqual(source[1]);
    expect(result.find(mark => mark.type === "characterStyle")).toEqual(source[2]);
    expect(source).toEqual(before);
  });
  it("replaces Latin font binding without deleting the independent script fonts", () => {
    const result = wordParagraphMarkFormattingToLitAst({ ...litAstParagraphMarkFormattingToWord(source)!, fontFamily: "Georgia" }, source)!;
    const attrs = result.find(mark => mark.type === "textStyle")!.attrs!;
    expect(attrs).toMatchObject({ fontFamily: "Georgia", fontFamilyEastAsia: "SimSun", fontFamilyEastAsiaTheme: "minorEastAsia", fontFamilyComplexScriptTheme: "minorBidi", kern: 1 });
    expect(attrs).not.toHaveProperty("fontFamilyAsciiTheme"); expect(attrs).not.toHaveProperty("fontFamilyHighAnsiTheme");
  });
  it("clears modeled properties while preserving unowned data and an explicit empty result", () => {
    const result = wordParagraphMarkFormattingToLitAst(null, source)!;
    expect(result.some(mark => ["bold", "underline"].includes(mark.type))).toBe(false);
    const attrs = result.find(mark => mark.type === "textStyle")!.attrs!;
    expect(attrs).toMatchObject({ kern: 1, lang: { val: "en-US" }, fontFamilyEastAsia: "SimSun", fontSizeComplexScript: "12pt" });
    expect(attrs).not.toHaveProperty("fontFamily"); expect(attrs).not.toHaveProperty("fontSize"); expect(attrs).not.toHaveProperty("color");
    expect(wordParagraphMarkFormattingToLitAst(null, [{ type: "bold" }])).toEqual([]);
    expect(wordParagraphMarkFormattingToLitAst(null)).toBeNull();
    expect(wordParagraphMarkFormattingToLitAst(null, [])).toBeNull();
  });
  it("retains source-only marks when there was never a modeled direct property", () => {
    const marks: LitAstMark[] = [{ type: "textStyle", attrs: { kern: 2, lang: { val: "en-US" } } }];
    expect(litAstParagraphMarkFormattingToWord(marks)).toBeNull();
    expect(wordParagraphMarkFormattingToLitAst(null, marks)).toEqual(marks);
  });
});
