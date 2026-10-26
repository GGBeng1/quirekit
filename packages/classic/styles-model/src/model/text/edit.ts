import type { WordStyleTextProperties } from "./types";

/**
 * Retires theme bindings only when an author changes their literal counterpart.
 * @param before - Current canonical delta.
 * @param after - Complete edited delta.
 * @returns Delta whose rendered values and serialized precedence agree.
 */
export function normalizeWordStyleTextEdit(before: WordStyleTextProperties, after: WordStyleTextProperties): WordStyleTextProperties {
  const result = { ...after };
  if (after.color !== before.color && JSON.stringify(after.colorReference) === JSON.stringify(before.colorReference)) delete result.colorReference;
  if (after.fontFamily !== before.fontFamily) {
    delete result.fontReferences;
    for (const field of ["fontFamilyLatin", "fontFamilyHighAnsi", "fontFamilyEastAsia", "fontFamilyComplexScript"] as const) {
      if (after[field] === before[field]) delete result[field];
    }
  }
  else if (result.fontReferences) {
    const references = { ...result.fontReferences };
    for (const [field, slot] of [["fontFamilyLatin", "latin"], ["fontFamilyHighAnsi", "highAnsi"],
      ["fontFamilyEastAsia", "eastAsia"], ["fontFamilyComplexScript", "complexScript"]] as const) {
      if (after[field] !== before[field] && references[slot] === before.fontReferences?.[slot]) delete references[slot];
    }
    if (Object.keys(references).length) result.fontReferences = references; else delete result.fontReferences;
  }
  return result;
}
