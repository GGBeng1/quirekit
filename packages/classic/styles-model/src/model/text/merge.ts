import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordStyleTextProperties, WordStyleToggle } from "./types";

/** Word highlight colors, kept separate from paragraph/run shading. */
const highlights: Readonly<Record<string, string>> = {
  black: "#000000", blue: "#0000ff", cyan: "#00ffff", green: "#00ff00", magenta: "#ff00ff",
  red: "#ff0000", yellow: "#ffff00", white: "#ffffff", darkBlue: "#000080", darkCyan: "#008080",
  darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000",
  darkGray: "#808080", lightGray: "#c0c0c0"
};

/**
 * Applies one Word text delta without flattening the persisted style definition.
 * @param inherited - Effective parent text properties.
 * @param delta - One document/table/named-style delta.
 * @returns Effective neutral typography, with independent decoration families.
 */
export function mergeWordStyleText(inherited: QuireNodeCanvasTextStyle, delta: WordStyleTextProperties): QuireNodeCanvasTextStyle {
  const { toggles, fontReferences: _fonts, colorReference: _color, fontFamilyHighAnsi, highlight,
    strike, doubleStrike, verticalAlignment, fontHint, ...absolute } = delta;
  let result = { ...inherited };
  for (const [name, enabled] of Object.entries(toggles ?? {})) {
    if (enabled) result = toggle(result, name as WordStyleToggle);
  }
  // A whole-font edit is an atomic replacement of inherited script slots.
  if (absolute.fontFamily !== undefined) {
    delete result.fontFamilyLatin; delete result.fontFamilyEastAsia; delete result.fontFamilyComplexScript;
  }
  if (absolute.fontScale !== undefined && absolute.fontSize === undefined) delete result.fontSize;
  result = { ...result, ...absolute };
  if (fontHint !== undefined) result.fontSelectionHint = fontHint;
  if (fontFamilyHighAnsi !== undefined && absolute.fontFamilyLatin === undefined) result.fontFamilyLatin = fontFamilyHighAnsi;
  if (strike !== undefined) setDecoration(result, "line-through", strike);
  if (doubleStrike !== undefined) setDecoration(result, "double-line-through", doubleStrike);
  if (delta.underline !== undefined) setDecoration(result, "underline", delta.underline.style !== "none");
  if (highlight !== undefined) result.highlightColor = highlight === "none" ? null : highlights[highlight] ?? null;
  if (verticalAlignment !== undefined) {
    result.glyphScale = verticalAlignment === "baseline" ? 1 : 0.7;
    result.baselineShiftEm = verticalAlignment === "superscript" ? 0.4 : verticalAlignment === "subscript" ? -0.2 : 0;
  }
  return result;
}

/** @param value - Effective properties. @param name - OOXML toggle. @returns Flipped effective properties. */
function toggle(value: QuireNodeCanvasTextStyle, name: WordStyleToggle): QuireNodeCanvasTextStyle {
  const result = { ...value };
  if (name === "bold") result.fontWeight = value.fontWeight === "bold" ? "normal" : "bold";
  else if (name === "italic") result.fontStyle = value.fontStyle === "italic" ? "normal" : "italic";
  else if (name === "boldCs") result.fontWeightComplexScript = value.fontWeightComplexScript === "bold" ? "normal" : "bold";
  else if (name === "italicCs") result.fontStyleComplexScript = value.fontStyleComplexScript === "italic" ? "normal" : "italic";
  else if (name === "allCaps") result.textTransform = value.textTransform === "uppercase" ? "none" : "uppercase";
  else if (name === "smallCaps") result.fontVariantCaps = value.fontVariantCaps === "small-caps" ? "normal" : "small-caps";
  else if (name === "hidden") result.hidden = !value.hidden;
  else if (name === "strike" || name === "doubleStrike") {
    const decoration = name === "strike" ? "line-through" : "double-line-through";
    setDecoration(result, decoration, !value.textDecoration?.includes(decoration));
  } else {
    const effects = new Set(value.glyphEffects ?? []);
    if (effects.has(name)) effects.delete(name); else effects.add(name);
    result.glyphEffects = [...effects];
  }
  return result;
}

/** @param target - Mutable effective style. @param line - Decoration family. @param enabled - Absolute state. */
function setDecoration(target: { textDecoration?: QuireNodeCanvasTextStyle["textDecoration"] }, line: NonNullable<QuireNodeCanvasTextStyle["textDecoration"]>[number], enabled: boolean): void {
  const lines = new Set(target.textDecoration ?? []);
  if (enabled) lines.add(line); else lines.delete(line);
  target.textDecoration = [...lines];
}
