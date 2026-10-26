import type { WordParagraphEastAsianLayout } from "../types";

const fields = new Set(["autoSpaceLatin", "autoSpaceNumber", "wordWrap", "kinsoku", "overflowPunctuation", "compressLineStartPunctuation"]);

/**
 * Validates only specified switches, so a mixed selection retains each paragraph's other settings.
 * @param value - Optional partial East Asian formatting patch.
 * @returns Whether all supplied keys and values are canonical; null resets an individual field.
 */
export function isEastAsianLayoutPatch(value: unknown): value is Partial<WordParagraphEastAsianLayout> | undefined {
  if (value === undefined) return true;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value).every(([key, flag]) => fields.has(key) && (flag === null || typeof flag === "boolean"));
}
