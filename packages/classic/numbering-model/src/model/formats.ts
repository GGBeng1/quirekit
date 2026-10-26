import type { WordNumberingFormat } from "../types";

/** Canonical Word numbering formats with native QuireKit semantics. */
export const wordNumberingFormats: ReadonlySet<WordNumberingFormat> = new Set([
  "aiueo",
  "aiueoFullWidth",
  "arabicAbjad",
  "arabicAlpha",
  "bahtText",
  "bullet",
  "cardinalText",
  "chicago",
  "chineseCounting",
  "chineseCountingThousand",
  "chineseLegalSimplified",
  "chosung",
  "custom",
  "decimal",
  "decimalEnclosedCircle",
  "decimalEnclosedCircleChinese",
  "decimalEnclosedFullstop",
  "decimalEnclosedParen",
  "decimalFullWidth",
  "decimalFullWidth2",
  "decimalHalfWidth",
  "decimalZero",
  "dollarText",
  "ganada",
  "hebrew1",
  "hebrew2",
  "hex",
  "hindiConsonants",
  "hindiCounting",
  "hindiNumbers",
  "hindiVowels",
  "ideographDigital",
  "ideographEnclosedCircle",
  "ideographLegalTraditional",
  "ideographTraditional",
  "ideographZodiac",
  "ideographZodiacTraditional",
  "iroha",
  "irohaFullWidth",
  "japaneseCounting",
  "japaneseDigitalTenThousand",
  "japaneseLegal",
  "koreanCounting",
  "koreanDigital",
  "koreanDigital2",
  "koreanLegal",
  "lowerLetter",
  "lowerRoman",
  "none",
  "numberInDash",
  "ordinal",
  "ordinalText",
  "russianLower",
  "russianUpper",
  "taiwaneseCounting",
  "taiwaneseCountingThousand",
  "taiwaneseDigital",
  "thaiCounting",
  "thaiLetters",
  "thaiNumbers",
  "upperLetter",
  "upperRoman",
  "vietnameseCounting"
]);

/**
 * Reports whether one value names a natively represented numbering format.
 *
 * @param value - Candidate source or persisted format.
 * @returns Whether the canonical numbering model accepts the value.
 */
export function isWordNumberingFormat(
  value: unknown
): value is WordNumberingFormat {
  return typeof value === "string"
    && wordNumberingFormats.has(value as WordNumberingFormat);
}
