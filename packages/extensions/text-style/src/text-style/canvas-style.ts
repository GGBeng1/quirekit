import { readTextScale } from "../text-scale/value";
import type { QuireMarkCanvasStyle } from "@quirekit/core";
import type { Mark } from "@quirekit/pm";
import { isTextStyleEmphasisMark } from "../style-attributes";
import { readTextStylePreservation } from "../docx/preservation";

/**
 * Projects canonical direct character fields without flattening absent effect overrides.
 * @param mark - Canonical textStyle occurrence.
 * @returns Renderer-neutral style delta, or null when no direct property exists.
 */
export function resolveTextStyleCanvasStyle(mark: Mark): QuireMarkCanvasStyle | null {
  const style: { -readonly [Key in keyof QuireMarkCanvasStyle]: QuireMarkCanvasStyle[Key] } = {};
  const hint = readTextStylePreservation(mark.attrs.litAstTextStylePreservation)?.attributes.fontHint;
  if (hint !== undefined) style.fontSelectionHint = hint;
  const fontFamily = mark.attrs.fontFamily;
  const fontFamilyLatin = mark.attrs.fontFamilyLatin;
  const fontFamilyEastAsia = mark.attrs.fontFamilyEastAsia;
  const fontFamilyComplexScript = mark.attrs.fontFamilyComplexScript;
  const fontSize = mark.attrs.fontSize;
  const fontSizeComplexScript = mark.attrs.fontSizeComplexScript;
  const letterSpacing = mark.attrs.letterSpacing;
  if (typeof mark.attrs.characterGrid === "boolean") style.characterGrid = mark.attrs.characterGrid;
  const textScale = readTextScale(mark.attrs);
  if (textScale !== undefined) style.horizontalScale = textScale / 100;
  const bold = mark.attrs.bold;
  const italic = mark.attrs.italic;
  const allCaps = mark.attrs.allCaps;
  const smallCaps = mark.attrs.smallCaps;
  const boldCs = mark.attrs.boldCs;
  const italicCs = mark.attrs.italicCs;
  const rightToLeft = mark.attrs.rightToLeft;
  const hidden = mark.attrs.hidden;
  const languageLatin = mark.attrs.languageLatin;
  const languageEastAsia = mark.attrs.languageEastAsia;
  const languageComplexScript = mark.attrs.languageComplexScript;
  const color = mark.attrs.color;
  const backgroundColor = mark.attrs.backgroundColor;
  const emphasisMark = mark.attrs.emphasisMark;
  const outline = mark.attrs.outline;
  const shadow = mark.attrs.shadow;
  const emboss = mark.attrs.emboss;
  const imprint = mark.attrs.imprint;

  if (typeof fontFamily === "string" && fontFamily.trim().length > 0) {
    style.fontFamily = fontFamily.trim();
  }
  if (typeof fontFamilyLatin === "string" && fontFamilyLatin.trim().length > 0) {
    style.fontFamilyLatin = fontFamilyLatin.trim();
  }
  if (typeof fontFamilyEastAsia === "string" && fontFamilyEastAsia.trim().length > 0) {
    style.fontFamilyEastAsia = fontFamilyEastAsia.trim();
  }
  if (
    typeof fontFamilyComplexScript === "string"
    && fontFamilyComplexScript.trim().length > 0
  ) {
    style.fontFamilyComplexScript = fontFamilyComplexScript.trim();
  }
  if (typeof fontSize === "string" && fontSize.trim().length > 0) {
    style.fontSize = fontSize.trim();
  }
  if (
    typeof fontSizeComplexScript === "string"
    && fontSizeComplexScript.trim().length > 0
  ) {
    style.fontSizeComplexScript = fontSizeComplexScript.trim();
  }
  if (typeof letterSpacing === "string" && letterSpacing.trim().length > 0) {
    style.letterSpacing = letterSpacing.trim();
  }
  if (typeof bold === "boolean") {
    style.fontWeight = bold ? "bold" : "normal";
  }
  if (typeof italic === "boolean") {
    style.fontStyle = italic ? "italic" : "normal";
  }
  if (allCaps === true) {
    style.textTransform = "uppercase";
  } else if (smallCaps === true) {
    style.fontVariantCaps = "small-caps";
  }
  if (typeof boldCs === "boolean") {
    style.fontWeightComplexScript = boldCs ? "bold" : "normal";
  }
  if (typeof italicCs === "boolean") {
    style.fontStyleComplexScript = italicCs ? "italic" : "normal";
  }
  if (typeof rightToLeft === "boolean") {
    style.rightToLeft = rightToLeft;
  }
  if (typeof hidden === "boolean") {
    style.hidden = hidden;
  }
  if (typeof languageLatin === "string" && languageLatin.trim().length > 0) {
    style.languageLatin = languageLatin.trim();
  }
  if (
    typeof languageEastAsia === "string"
    && languageEastAsia.trim().length > 0
  ) {
    style.languageEastAsia = languageEastAsia.trim();
  }
  if (
    typeof languageComplexScript === "string"
    && languageComplexScript.trim().length > 0
  ) {
    style.languageComplexScript = languageComplexScript.trim();
  }
  if (typeof color === "string" && color.trim().length > 0) {
    style.color = color.trim();
  }
  if (
    typeof backgroundColor === "string"
    && backgroundColor.trim().length > 0
  ) {
    style.backgroundColor = backgroundColor.trim();
  }
  if (isTextStyleEmphasisMark(emphasisMark)) {
    style.emphasisMark = emphasisMark;
  }
  if ([outline, shadow, emboss, imprint].some((value) => typeof value === "boolean")) {
    // Preserve absence separately from false so unrelated style effects still inherit.
    style.glyphEffectOverrides = {
      ...(typeof outline === "boolean" ? { outline } : {}),
      ...(typeof shadow === "boolean" ? { shadow } : {}),
      ...(typeof emboss === "boolean" ? { emboss } : {}),
      ...(typeof imprint === "boolean" ? { imprint } : {})
    };
  }

  return Object.keys(style).length === 0 ? null : style;
}
