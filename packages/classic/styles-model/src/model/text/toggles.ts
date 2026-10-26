import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordStyleTextProperties, WordStyleToggle } from "./types";

/** @param text - Style delta. @param name - Toggle family. @returns Whether the delta explicitly overrides that family. */
export function hasWordStyleAbsoluteToggle(text: WordStyleTextProperties, name: WordStyleToggle): boolean {
  const fields = { bold: "fontWeight", italic: "fontStyle", boldCs: "fontWeightComplexScript", italicCs: "fontStyleComplexScript", allCaps: "textTransform", smallCaps: "fontVariantCaps", hidden: "hidden", strike: "strike", doubleStrike: "doubleStrike" } as const;
  return name in fields ? text[fields[name as keyof typeof fields]] !== undefined : text.glyphEffects !== undefined;
}

/** @param text - Effective text. @param name - Toggle family. @returns Its effective enabled state. */
export function readWordStyleBoolean(text: QuireNodeCanvasTextStyle, name: WordStyleToggle): boolean {
  if (name === "bold") return text.fontWeight === "bold";
  if (name === "italic") return text.fontStyle === "italic";
  if (name === "boldCs") return text.fontWeightComplexScript === "bold";
  if (name === "italicCs") return text.fontStyleComplexScript === "italic";
  if (name === "allCaps") return text.textTransform === "uppercase";
  if (name === "smallCaps") return text.fontVariantCaps === "small-caps";
  if (name === "hidden") return text.hidden === true;
  if (name === "strike" || name === "doubleStrike") return text.textDecoration?.includes(name === "strike" ? "line-through" : "double-line-through") ?? false;
  return text.glyphEffects?.includes(name) ?? false;
}


/**
 * Compiles UI absolute emphasis against the character-style chain, then applies
 * the resulting OOXML toggles to each paragraph occurrence. A bold character
 * style must have the same behavior before and after exporting it to Word.
 * @param text - Authored or imported character delta.
 * @param inherited - Effective character ancestors, excluding paragraph text.
 * @returns Canonical toggle delta with paragraph-only hints removed.
 */
export function characterStyleTextDelta(text: WordStyleTextProperties, inherited: QuireNodeCanvasTextStyle): WordStyleTextProperties {
  const { documentFontRole: _role, documentOutlineLevel: _outline, lineHeightScale: _line, ...delta } = text;
  const toggles = { ...delta.toggles };
  const fields = { bold: "fontWeight", italic: "fontStyle", boldCs: "fontWeightComplexScript", italicCs: "fontStyleComplexScript",
    allCaps: "textTransform", smallCaps: "fontVariantCaps", hidden: "hidden", strike: "strike", doubleStrike: "doubleStrike" } as const;
  for (const [name, field] of Object.entries(fields)) {
    const key = name as keyof typeof fields;
    if (delta[fields[key]] === undefined) continue;
    const desired = key === "strike" ? delta.strike : key === "doubleStrike" ? delta.doubleStrike : readWordStyleBoolean(delta, key);
    toggles[key] = desired !== readWordStyleBoolean(inherited, key);
    delete delta[field as typeof fields[typeof key]];
  }
  if (delta.glyphEffects !== undefined) {
    for (const name of ["outline", "shadow", "emboss", "imprint"] as const) toggles[name] = delta.glyphEffects.includes(name) !== (inherited.glyphEffects?.includes(name) ?? false);
    delete delta.glyphEffects;
  }
  return { ...delta, ...(Object.keys(toggles).length ? { toggles } : {}) };
}

/**
 * Copies only run properties between a linked pair, retaining paragraph roles.
 * @param destination - Existing destination text properties.
 * @param source - New shared run properties.
 * @param paragraph - Whether the destination owns paragraph layout hints.
 * @returns Linked definition text without leaking or erasing paragraph semantics.
 */
export function linkedStyleText(destination: WordStyleTextProperties, source: WordStyleTextProperties, paragraph: boolean): WordStyleTextProperties {
  const { documentFontRole: _role, documentOutlineLevel: _outline, lineHeightScale: _line, ...run } = source;
  return { ...run, ...(paragraph ? {
    ...(destination.documentFontRole === undefined ? {} : { documentFontRole: destination.documentFontRole }),
    ...(destination.documentOutlineLevel === undefined ? {} : { documentOutlineLevel: destination.documentOutlineLevel }),
    ...(destination.lineHeightScale === undefined ? {} : { lineHeightScale: destination.lineHeightScale })
  } : {}) };
}
