import type {
  ResolvedWordNumberingMarker,
  WordNumberingMarkerStyle,
  WordNumberingMarkerThemeFont
} from "../types";
import type {
  QuireDocumentFontSet,
  QuireDocumentFontTheme
} from "@quirekit/core";
import type { WordNumberingMarkerInheritanceTypography, WordNumberingMarkerTypography } from "./types";

/** Optical size multiplier for the built-in literal bullet fallback. */
const builtInBulletFontScale = 1.2;
const cssPixelsPerPoint = 96 / 72;

/** Portable display equivalents for producer-evidenced Wingdings bullet glyphs. */
const portableWingdingsBullets = new Map([
  ["\uF06C", "●"],
  ["\uF06E", "■"],
  ["\uF075", "◆"]
]);

/**
 * Resolves display text and typography for a generated Word list marker.
 *
 * @param marker - Resolved Word numbering marker semantics.
 * @param bodyFont - CSS font shorthand inherited from the paragraph.
 * @param documentFontTheme - Optional major/minor document font authority.
 * @param inheritance - Optional paragraph-mark paint typography.
 * @returns Effective marker typography used by both measurement and paint.
 */
export function resolveWordNumberingMarkerTypography(
  marker: ResolvedWordNumberingMarker,
  bodyFont: string,
  documentFontTheme?: QuireDocumentFontTheme | undefined,
  inheritance?: WordNumberingMarkerInheritanceTypography | undefined
): WordNumberingMarkerTypography {
  const style = marker.markerStyle;
  const explicitFamily = resolveMarkerFontFamily(style, documentFontTheme);
  const portableText = marker.kind === "bullet" && isWingdings(explicitFamily)
    ? projectPortableWingdingsText(marker.text)
    : null;
  let font = applyMarkerFontDelta(
    bodyFont,
    style,
    portableText === null ? explicitFamily : undefined
  );
  if (
    marker.kind === "bullet"
    && explicitFamily === undefined
    && style?.fontSizePt === undefined
  ) {
    font = scaleMarkerFont(font, builtInBulletFontScale);
  }
  const textDecoration = resolveMarkerDecoration(style, inheritance?.textDecoration);
  const textColor = style?.color === undefined || style.color === "auto"
    ? inheritance?.textColor
    : style.color;
  return {
    text: portableText ?? marker.text,
    font,
    ...(textColor === undefined ? {} : { textColor }),
    ...(textDecoration === undefined ? {} : { textDecoration })
  };
}

/**
 * Selects the explicit family using the measured Word font slot priority.
 *
 * @param style - Optional marker style delta.
 * @param documentFontTheme - Optional major/minor document font authority.
 * @returns Selected family or undefined when the paragraph family remains authoritative.
 */
function resolveMarkerFontFamily(
  style: WordNumberingMarkerStyle | undefined,
  documentFontTheme: QuireDocumentFontTheme | undefined
): string | undefined {
  const fonts = style?.fonts;
  if (fonts === undefined) return undefined;
  return resolveThemeFont(fonts.asciiTheme, documentFontTheme) ?? fonts.ascii
    ?? resolveThemeFont(fonts.highAnsiTheme, documentFontTheme) ?? fonts.highAnsi
    ?? resolveThemeFont(fonts.eastAsiaTheme, documentFontTheme) ?? fonts.eastAsia
    ?? resolveThemeFont(fonts.complexScriptTheme, documentFontTheme)
    ?? fonts.complexScript;
}

/**
 * Resolves one ST_Theme token through the canonical body or heading font set.
 *
 * @param themeFont - Exact OOXML theme-font token.
 * @param documentFontTheme - Optional major/minor document font authority.
 * @returns Logical family selected by the token, or undefined when unavailable.
 */
function resolveThemeFont(
  themeFont: WordNumberingMarkerThemeFont | undefined,
  documentFontTheme: QuireDocumentFontTheme | undefined
): string | undefined {
  if (themeFont === undefined || documentFontTheme === undefined) return undefined;
  const fontSet = themeFont.startsWith("major")
    ? documentFontTheme.heading ?? documentFontTheme.body
    : documentFontTheme.body;
  return resolveThemeFontSlot(themeFont, fontSet);
}

/**
 * Selects the script family encoded by one ST_Theme token.
 *
 * @param themeFont - Exact OOXML theme-font token.
 * @param fontSet - Canonical body or heading font set.
 * @returns Matching script family, or undefined when the set omits it.
 */
function resolveThemeFontSlot(
  themeFont: WordNumberingMarkerThemeFont,
  fontSet: QuireDocumentFontSet
): string | undefined {
  if (themeFont.endsWith("EastAsia")) return fontSet.eastAsia;
  if (themeFont.endsWith("Bidi")) return fontSet.complexScript;
  return fontSet.latin;
}

/**
 * Applies explicit family, weight, and style deltas to a CSS font shorthand.
 *
 * @param bodyFont - Inherited CSS font shorthand.
 * @param style - Optional marker style delta.
 * @param family - Explicit family to install, or undefined to retain the body family.
 * @returns Effective marker font shorthand.
 */
function applyMarkerFontDelta(
  bodyFont: string,
  style: WordNumberingMarkerStyle | undefined,
  family: string | undefined
): string {
  const sizeMatch = /\d+(?:\.\d+)?px(?:\/[^\s]+)?/u.exec(bodyFont);
  if (sizeMatch === null || sizeMatch.index === undefined) return bodyFont;
  let prefixes = bodyFont.slice(0, sizeMatch.index).trim().split(/\s+/u).filter(Boolean);
  if (style?.bold !== undefined) {
    prefixes = prefixes.filter((token) => !/^(?:normal|bold|bolder|lighter|[1-9]00)$/u.test(token));
  }
  if (style?.italic !== undefined) {
    prefixes = prefixes.filter((token) => !/^(?:normal|italic|oblique)$/u.test(token));
  }
  if (style?.italic === true) prefixes.unshift("italic");
  if (style?.bold === true) prefixes.push("bold");
  const size = style?.fontSizePt === undefined
    ? sizeMatch[0]
    : `${roundCssPixelSize(style.fontSizePt * cssPixelsPerPoint)}px`;
  const inheritedFamily = bodyFont.slice(sizeMatch.index + sizeMatch[0].length).trim();
  const resolvedFamily = family === undefined ? inheritedFamily : formatFontFamily(family);
  return `${prefixes.length === 0 ? "" : `${prefixes.join(" ")} `}${size} ${resolvedFamily}`;
}

/**
 * Rounds one CSS pixel size enough to keep deterministic font tokens.
 *
 * @param value - Raw CSS pixel size converted from points.
 * @returns Pixel size rounded to six fractional digits.
 */
function roundCssPixelSize(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Formats one raw family for a CSS font shorthand.
 *
 * @param family - Raw family name.
 * @returns CSS-compatible family token.
 */
function formatFontFamily(family: string): string {
  const trimmed = family.trim();
  return /\s/u.test(trimmed) && !/^['"].*['"]$/u.test(trimmed)
    ? `"${trimmed.replaceAll("\"", "\\\"")}"`
    : trimmed;
}

/**
 * Scales a marker font's pixel size without changing style or family.
 *
 * @param font - CSS font shorthand.
 * @param scale - Optical size multiplier.
 * @returns Scaled CSS font shorthand.
 */
function scaleMarkerFont(font: string, scale: number): string {
  return font.replace(
    /(\d+(?:\.\d+)?)px/u,
    (_, size: string) => `${Number(size) * scale}px`
  );
}

/**
 * Reports whether the selected family names Wingdings.
 *
 * @param family - Selected explicit family.
 * @returns Whether portable Wingdings projection may apply.
 */
function isWingdings(family: string | undefined): boolean {
  return family?.trim().replace(/^['"]|['"]$/gu, "").toLowerCase() === "wingdings";
}

/**
 * Projects only producer-evidenced Wingdings PUA bullet characters.
 *
 * @param text - Expanded canonical marker text.
 * @returns Portable Unicode marker text, or null when any glyph is unknown.
 */
function projectPortableWingdingsText(text: string): string | null {
  const projected = Array.from(text, (character) => portableWingdingsBullets.get(character));
  return projected.every((character) => character !== undefined)
    ? projected.join("")
    : null;
}

/**
 * Resolves simple marker decoration lines.
 *
 * @param style - Optional marker style delta.
 * @param inherited - Paragraph-mark decoration lines inherited by the marker.
 * @returns Decoration sequence or undefined when no line is enabled.
 */
function resolveMarkerDecoration(
  style: WordNumberingMarkerStyle | undefined,
  inherited: readonly ("underline" | "line-through")[] | undefined
): readonly ("underline" | "line-through")[] | undefined {
  const lines = new Set<"underline" | "line-through">(inherited ?? []);
  if (style?.underline === true) lines.add("underline");
  if (style?.underline === false) lines.delete("underline");
  if (style?.strike === true) lines.add("line-through");
  if (style?.strike === false) lines.delete("line-through");
  return lines.size === 0 ? undefined : [...lines];
}
