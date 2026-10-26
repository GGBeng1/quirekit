import type { QuireNodeCanvasTextStyle } from "@quirekit/core";

/**
 * Projects the CSS-representable text subset; the canonical delta remains the DOCX authority.
 * @param text - Effective neutral typography.
 * @returns Ordered safe CSS properties, excluding unsupported glyph-effect approximations.
 */
export function wordStyleTextCss(text: QuireNodeCanvasTextStyle): Readonly<Record<string, string>> {
  const css: Record<string, string> = {};
  const families = [...new Set([text.fontFamilyLatin, text.fontFamilyEastAsia, text.fontFamilyComplexScript, text.fontFamily].filter((value): value is string => Boolean(value)))];
  if (families.length) css["font-family"] = families.map(value => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(/[\n\r\f]/gu, " ")}"`).join(", ");
  if (text.fontSize && /^[\d.]+(?:pt|px)$/u.test(text.fontSize)) css["font-size"] = text.fontSize;
  else if (text.fontScale !== undefined && text.fontScale > 0) css["font-size"] = `${Math.round(text.fontScale * 10000) / 10000}em`;
  for (const [property, value] of [["color", text.color], ["background-color", text.highlightColor ?? text.backgroundColor]]) {
    if (value && (/^#[\da-f]{6}$/iu.test(value) || value === "currentColor")) css[property!] = value;
  }
  if (text.fontWeight) css["font-weight"] = text.fontWeight;
  if (text.fontStyle) css["font-style"] = text.fontStyle;
  if (text.fontVariantCaps) css["font-variant-caps"] = text.fontVariantCaps;
  if (text.textTransform) css["text-transform"] = text.textTransform;
  if (text.letterSpacing && /^-?[\d.]+(?:pt|px)$/u.test(text.letterSpacing)) css["letter-spacing"] = text.letterSpacing;
  if (text.rightToLeft !== undefined) css.direction = text.rightToLeft ? "rtl" : "ltr";
  if (text.hidden === true) css.display = "none";
  if (text.textDecoration !== undefined || text.underline !== undefined) {
    const lines = new Set((text.textDecoration ?? []).map(line => line === "double-line-through" ? "line-through" : line));
    if (text.underline?.style === "none") lines.delete("underline");
    css["text-decoration-line"] = [...lines].join(" ") || "none";
    const underline = text.underline?.style;
    if (underline && /wave/iu.test(underline)) css["text-decoration-style"] = "wavy";
    else if (underline && /double/iu.test(underline)) css["text-decoration-style"] = "double";
    else if (underline && /dot/iu.test(underline)) css["text-decoration-style"] = "dotted";
    else if (underline && /dash/iu.test(underline)) css["text-decoration-style"] = "dashed";
    if (text.underline?.color && /^#[\da-f]{6}$/iu.test(text.underline.color)) css["text-decoration-color"] = text.underline.color;
  }
  if (text.baselineShiftEm !== undefined) css["vertical-align"] = `${text.baselineShiftEm}em`;
  if (text.glyphScale !== undefined && text.glyphScale !== 1) css["font-size"] = `calc(${css["font-size"] ?? "1em"} * ${text.glyphScale})`;
  return css;
}

/** @param properties - Safe CSS fields. @returns Declaration list. */
export function wordStyleCssText(properties: Readonly<Record<string, string>>): string {
  return Object.entries(properties).map(([name, value]) => `${name}: ${value}`).join("; ");
}
