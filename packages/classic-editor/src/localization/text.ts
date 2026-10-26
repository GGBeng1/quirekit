import type {
  ClassicEditorBilingualText,
  ClassicEditorLocale,
  ClassicEditorText
} from "../types";

/** Default product-interface locale. */
export const defaultClassicEditorLocale: ClassicEditorLocale = "zh-CN";

/**
 * Defines complete bundled bilingual copy for a product contribution.
 *
 * @param zhCN - Simplified Chinese copy.
 * @param en - English copy.
 * @returns Frozen bilingual text value.
 */
export function defineClassicEditorText(
  zhCN: string,
  en: string
): ClassicEditorBilingualText {
  if (zhCN.trim().length === 0 || en.trim().length === 0) {
    throw new RangeError("Classic Editor bilingual text must define Chinese and English copy.");
  }
  return Object.freeze({ "zh-CN": zhCN, en });
}

/**
 * Resolves language-neutral or bilingual product copy.
 *
 * @param text - Product copy supplied by the built-in preset or a plugin.
 * @param locale - Requested product-interface locale.
 * @returns Visible copy for the requested locale.
 */
export function resolveClassicEditorText(
  text: ClassicEditorText,
  locale: ClassicEditorLocale = defaultClassicEditorLocale
): string {
  return typeof text === "string" ? text : text[locale];
}
