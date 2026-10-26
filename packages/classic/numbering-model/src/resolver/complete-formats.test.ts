import { describe, expect, it } from "vitest";
import type { WordNumberingCounterFormat } from "../types";
import { formatWordNumberingCounter } from "./format";

const expectedFirstMarkers: Readonly<Record<string, string>> = {
  aiueo: "ｱ",
  aiueoFullWidth: "ア",
  arabicAbjad: "أ",
  arabicAlpha: "أ",
  bahtText: "1",
  cardinalText: "One",
  chicago: "*",
  chineseCounting: "一",
  chineseCountingThousand: "一",
  chineseLegalSimplified: "壹",
  chosung: "ㄱ",
  custom: "1",
  decimal: "1",
  decimalEnclosedCircle: "①",
  decimalEnclosedCircleChinese: "①",
  decimalEnclosedFullstop: "⒈",
  decimalEnclosedParen: "⑴",
  decimalFullWidth: "１",
  decimalFullWidth2: "１",
  decimalHalfWidth: "1",
  decimalZero: "01",
  dollarText: "1",
  ganada: "가",
  hebrew1: "א",
  hebrew2: "א",
  hex: "1",
  hindiConsonants: "अ",
  hindiCounting: "एक",
  hindiNumbers: "१",
  hindiVowels: "क",
  ideographDigital: "一",
  ideographEnclosedCircle: "㈠",
  ideographLegalTraditional: "壹",
  ideographTraditional: "甲",
  ideographZodiac: "子",
  ideographZodiacTraditional: "甲子",
  iroha: "ｲ",
  irohaFullWidth: "イ",
  japaneseCounting: "一",
  japaneseDigitalTenThousand: "一",
  japaneseLegal: "壱",
  koreanCounting: "일",
  koreanDigital: "일",
  koreanDigital2: "一",
  koreanLegal: "하나",
  lowerLetter: "a",
  lowerRoman: "i",
  none: "",
  numberInDash: "- 1 -",
  ordinal: "1st",
  ordinalText: "First",
  russianLower: "а",
  russianUpper: "А",
  taiwaneseCounting: "一",
  taiwaneseCountingThousand: "一",
  taiwaneseDigital: "一",
  thaiCounting: "หนึ่ง",
  thaiLetters: "ก",
  thaiNumbers: "๑",
  upperLetter: "A",
  upperRoman: "I",
  vietnameseCounting: "một"
};

describe("complete OOXML numbering formatter", () => {
  it("formats the first value of every non-bullet lexical format", () => {
    for (const [format, expected] of Object.entries(expectedFirstMarkers)) {
      expect(
        formatWordNumberingCounter(format as WordNumberingCounterFormat, 1),
        format
      ).toBe(expected);
    }
    expect(Object.keys(expectedFirstMarkers)).toHaveLength(62);
  });

  it("honors finite sequence cycles and repeated-symbol groups", () => {
    expect(formatWordNumberingCounter("aiueo", 46)).toBe("ﾝ");
    expect(formatWordNumberingCounter("aiueo", 47)).toBe("ｱ");
    expect(formatWordNumberingCounter("arabicAbjad", 29)).toBe("أأ");
    expect(formatWordNumberingCounter("chicago", 5)).toBe("**");
    expect(formatWordNumberingCounter("chicago", 121)).toBe("*");
    expect(formatWordNumberingCounter("hebrew2", 23)).toBe("את");
    expect(formatWordNumberingCounter("hindiConsonants", 17)).toBe("अं");
    expect(formatWordNumberingCounter("thaiLetters", 42)).toBe("กก");
  });

  it("honors script-digit upper boundaries and wrap bounds", () => {
    expect(formatWordNumberingCounter("hindiNumbers", 32_768)).toBe("१");
    expect(formatWordNumberingCounter("japaneseDigitalTenThousand", 9_999))
      .toBe("九九九九");
    expect(formatWordNumberingCounter("ideographDigital", 101)).toBe("一〇一");
    expect(formatWordNumberingCounter("japaneseDigitalTenThousand", 10_000))
      .toBe("");
    expect(formatWordNumberingCounter("koreanDigital2", 999_999))
      .toBe("九九九九九九");
    expect(formatWordNumberingCounter("koreanDigital2", 1_000_000)).toBe("");
    expect(formatWordNumberingCounter("thaiNumbers", 32_768)).toBe("๑");
  });

  it("keeps legal and positional glyph tuples coherent", () => {
    expect(formatWordNumberingCounter("ideographLegalTraditional", 10_001))
      .toBe("壹萬零壹");
    expect(formatWordNumberingCounter("japaneseLegal", 11)).toBe("壱拾壱");
    expect(formatWordNumberingCounter("koreanCounting", 11)).toBe("십일");
    expect(formatWordNumberingCounter("koreanLegal", 21)).toBe("스물하나");
    expect(formatWordNumberingCounter("taiwaneseCounting", 20)).toBe("二十");
    expect(formatWordNumberingCounter("taiwaneseCountingThousand", 1_001))
      .toBe("一千零一");
    expect(formatWordNumberingCounter("taiwaneseCountingThousand", 100_000))
      .toBe("一十萬");
  });

  it("formats bounded Hindi, Thai, Vietnamese, and English words", () => {
    expect(formatWordNumberingCounter("hindiCounting", 100)).toBe("एक सौ");
    expect(formatWordNumberingCounter("hindiCounting", 10_000)).toBe("एक");
    expect(formatWordNumberingCounter("thaiCounting", 21)).toBe("ยี่สิบเอ็ด");
    expect(formatWordNumberingCounter("vietnameseCounting", 101))
      .toBe("một trăm lẻ một");
    expect(formatWordNumberingCounter("vietnameseCounting", 1_001)).toBe("một");
    expect(formatWordNumberingCounter("cardinalText", 121))
      .toBe("One hundred twenty-one");
    expect(formatWordNumberingCounter("ordinalText", 121))
      .toBe("One hundred twenty-first");
  });

  it("uses marker language for numeric ordinals", () => {
    expect(formatWordNumberingCounter("ordinal", 1, {
      language: { value: "fr-FR" }
    })).toBe("1er");
    expect(formatWordNumberingCounter("ordinal", 2, {
      language: { value: "sv-SE" }
    })).toBe("2:a");
    expect(formatWordNumberingCounter("ordinal", 12, {
      language: { value: "sv-SE" }
    })).toBe("12:e");
  });

  it("executes recognized custom expressions and preserves decimal fallback", () => {
    expect(formatWordNumberingCounter("custom", 1, {
      customFormat: "α, β, γ, ..."
    })).toBe("α");
    expect(formatWordNumberingCounter("custom", 6, {
      customFormat: "α, β, γ, ..."
    })).toBe("στ");
    expect(formatWordNumberingCounter("custom", 12, {
      customFormat: "00001, 00002, 00003, ..."
    })).toBe("00012");
    expect(formatWordNumberingCounter("custom", 4, {
      customFormat: "A, Ç, Ĝ, ..."
    })).toBe("Ç");
    expect(formatWordNumberingCounter("custom", 7, {
      customFormat: "future-expression"
    })).toBe("7");
  });
});
