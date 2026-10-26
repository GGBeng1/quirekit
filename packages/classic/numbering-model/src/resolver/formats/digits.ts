import type { WordNumberingCounterFormat } from "../../types";

const ideographicDigits = Array.from("〇一二三四五六七八九");
const koreanDigits = Array.from("영일이삼사오육칠팔구");
const traditionalDigitalDigits = Array.from("零一二三四五六七八九");
const taiwaneseDigits = Array.from("○一二三四五六七八九");

/**
 * Formats one counter by independently replacing its decimal digits.
 *
 * @param format - Script-digit OOXML format.
 * @param value - Positive counter.
 * @returns Script-specific digit sequence.
 */
export function formatScriptDigits(
  format: WordNumberingCounterFormat,
  value: number
): string {
  switch (format) {
    case "hindiNumbers":
      return mapDecimalDigits(normalize(value, 32_767), 0x0966);
    case "ideographDigital":
      return mapDigits(value, ideographicDigits);
    case "japaneseDigitalTenThousand":
      return value < 10_000 ? mapDigits(value, ideographicDigits) : "";
    case "koreanDigital":
      return mapDigits(value, koreanDigits);
    case "koreanDigital2":
      return value < 1_000_000 ? mapDigits(value, traditionalDigitalDigits) : "";
    case "taiwaneseDigital":
      return mapDigits(value, taiwaneseDigits);
    case "thaiNumbers":
      return mapDecimalDigits(normalize(value, 32_767), 0x0E50);
    default:
      throw new RangeError(`Numbering format ${format} is not a script-digit format.`);
  }
}

/**
 * Maps ASCII decimal digits through one explicit glyph table.
 *
 * @param value - Positive counter.
 * @param digits - Zero-through-nine glyphs.
 * @returns Mapped digit string.
 */
function mapDigits(value: number, digits: readonly string[]): string {
  return String(value)
    .split("")
    .map((digit) => digits[Number(digit)] ?? digit)
    .join("");
}

/**
 * Maps ASCII decimal digits into one contiguous Unicode digit block.
 *
 * @param value - Positive counter.
 * @param zeroCodePoint - Unicode code point representing zero.
 * @returns Mapped digit string.
 */
function mapDecimalDigits(value: number, zeroCodePoint: number): string {
  return String(value).replace(/\d/gu, (digit) =>
    String.fromCodePoint(zeroCodePoint + Number(digit))
  );
}

/**
 * Wraps one counter into a finite one-based cycle.
 *
 * @param value - Positive counter.
 * @param bound - Inclusive cycle length.
 * @returns Normalized positive counter.
 */
function normalize(value: number, bound: number): number {
  return ((value - 1) % bound) + 1;
}
