import type { WordNumberingLanguage } from "../../../types";

const ideographicPrimaryLanguages = new Set([
  "ja-JP",
  "ko-KR",
  "vi-VN",
  "zh",
  "zh-CN",
  "zh-Hans",
  "zh-Hant",
  "zh-HK",
  "zh-MO",
  "zh-SG",
  "zh-TW"
]);

/**
 * Selects the language slot used by Word text numbering.
 *
 * @param language - Numbering-level run language fields.
 * @returns Effective language tag, or the English compatibility default.
 */
export function resolveWordTextLanguage(
  language: WordNumberingLanguage | undefined
): string {
  const primary = language?.value;
  if (primary && ideographicPrimaryLanguages.has(primary)) {
    return language?.eastAsia ?? primary;
  }
  return primary ?? language?.eastAsia ?? language?.bidi ?? "en-US";
}

/**
 * Applies the mature marker sentence-casing rule.
 *
 * @param value - Lower-case lexical marker.
 * @param language - Effective language tag.
 * @returns Marker with its first Unicode character capitalized.
 */
export function sentenceCaseText(value: string, language: string): string {
  if (value === "") return "";
  const [first = "", ...rest] = Array.from(value);
  const capital = language === "tr-TR" && first === "i"
    ? "İ"
    : first.toUpperCase();
  return `${capital}${rest.join("")}`;
}
