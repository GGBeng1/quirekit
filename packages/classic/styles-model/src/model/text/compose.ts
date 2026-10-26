import type { WordStyleTextProperties, WordStyleToggle } from "./types";
import { mergeWordStyleText } from "./merge";
import { hasWordStyleAbsoluteToggle, readWordStyleBoolean } from "./toggles";

const absoluteFields = { bold: "fontWeight", italic: "fontStyle", boldCs: "fontWeightComplexScript", italicCs: "fontStyleComplexScript",
  allCaps: "textTransform", smallCaps: "fontVariantCaps", hidden: "hidden" } as const;

/**
 * Composes style deltas before their document-default base is known. Toggle
 * operations combine by parity rather than by last-writer assignment.
 * @param earlier - Ancestor or lower-priority conditional layer.
 * @param later - Descendant or higher-priority conditional layer.
 * @returns A delta equivalent to applying the two inputs in order.
 */
export function composeWordStyleText(earlier: WordStyleTextProperties, later: WordStyleTextProperties): WordStyleTextProperties {
  const result = { ...earlier, ...later }, toggles = { ...earlier.toggles };
  for (const [name, enabled] of Object.entries(later.toggles ?? {})) {
    const key = name as WordStyleToggle;
    if (hasWordStyleAbsoluteToggle(later, key)) { delete toggles[key]; continue; }
    if (hasWordStyleAbsoluteToggle(earlier, key)) {
      const effective = mergeWordStyleText(mergeWordStyleText({}, earlier), { toggles: { [key]: enabled } });
      if (key === "strike" || key === "doubleStrike") result[key] = readWordStyleBoolean(effective, key);
      else if (key in absoluteFields) {
        const field = absoluteFields[key as keyof typeof absoluteFields];
        Object.assign(result, { [field]: effective[field] });
      } else if (effective.glyphEffects !== undefined) result.glyphEffects = effective.glyphEffects;
      delete toggles[key];
    } else toggles[key] = Boolean(toggles[key]) !== enabled;
  }
  for (const key of Object.keys(toggles) as WordStyleToggle[]) if (hasWordStyleAbsoluteToggle(later, key)) delete toggles[key];
  // Nested font/theme bindings inherit each slot; a whole-font override clears them.
  if (later.fontFamily === undefined) {
    if (earlier.fontReferences || later.fontReferences) result.fontReferences = { ...earlier.fontReferences, ...later.fontReferences };
  } else {
    delete result.fontFamilyLatin; delete result.fontFamilyHighAnsi; delete result.fontFamilyEastAsia; delete result.fontFamilyComplexScript;
    delete result.fontReferences; Object.assign(result, later);
  }
  if (Object.keys(toggles).length) result.toggles = toggles; else delete result.toggles;
  return result;
}
