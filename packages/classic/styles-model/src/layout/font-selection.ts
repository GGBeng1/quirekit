import type { QuireFontSlotResolver, QuireMarkCanvasStyle } from "@quirekit/core";

/** Latin-1 exceptions from the published MS-OI29500 rFonts character table. */
const eastAsianLatinSymbols = /[\u00a1\u00a4\u00a7\u00a8\u00aa\u00ad\u00af-\u00b4\u00b6-\u00ba\u00bc-\u00bf\u00d7\u00f7]/u;
/** Additional Latin letters selected by an East Asian hint with Chinese language. */
const chineseLatinLetters = /[\u00e0\u00e1\u00e8-\u00ea\u00ec\u00ed\u00f2\u00f3\u00f9\u00fa\u00fc\u0100-\u02af\u1e00-\u1eff]/u;
/** Ambiguous ranges whose font slot is affected by the East Asian hint. */
const eastAsianHintRanges = /[\u02b0-\u04ff\u2000-\u27bf\ue000-\uf8ff\ufb00-\ufb1c]/u;

/**
 * Resolves source font hints once before neutral inline itemization.
 *
 * Font names and glyph coverage do not determine this choice. The source hint
 * and East Asian language inherit independently, including explicit default.
 * @param styles - Inherited appearance followed by direct run style deltas.
 * @returns An override for ambiguous characters, or no additional classifier.
 */
export function resolveWordFontSelection(styles: readonly QuireMarkCanvasStyle[]): QuireFontSlotResolver | undefined {
  let hint: unknown;
  let language: string | undefined;
  for (const style of styles) {
    if (style.fontSelectionHint !== undefined) hint = style.fontSelectionHint;
    if (style.languageEastAsia !== undefined) language = style.languageEastAsia;
  }
  if (hint !== "eastAsia") return undefined;
  const chinese = /^zh(?:-|$)/iu.test(language ?? "");
  /** @param character - Scalar to classify. @returns Override only for admitted ambiguous ranges. */
  return character => eastAsianLatinSymbols.test(character)
    || eastAsianHintRanges.test(character)
    || (chinese && chineseLatinLetters.test(character))
    ? "eastAsia" : undefined;
}
