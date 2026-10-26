import type {
  ClassicEditorLocale,
  ClassicEditorText
} from "../../types";

/**
 * Resolves product copy without consulting global document language.
 *
 * @param value - Language-neutral or bilingual product text.
 * @param locale - Mounted product locale.
 * @returns Localized visible copy.
 */
export function localizeClassicEditorInsertText(
  value: ClassicEditorText,
  locale: ClassicEditorLocale
): string {
  return typeof value === "string" ? value : value[locale] ?? value.en;
}

/**
 * Enumerates every language variant for locale-independent catalog search.
 *
 * @param value - Language-neutral or bilingual product text.
 * @returns Searchable text variants.
 */
export function getClassicEditorInsertTextVariants(
  value: ClassicEditorText
): readonly string[] {
  return typeof value === "string"
    ? Object.freeze([value])
    : Object.freeze([value["zh-CN"], value.en]);
}
