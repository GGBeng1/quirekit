import type {
  QuireGlyphRunGlyphPlacement,
  QuirePathSegment,
  QuireTextPaintCommand
} from "../core/display-list";
import type { QuireRect } from "../core/geometry";

/**
 * Formats inline SVG text style for a text command.
 *
 * @param command - Text command whose style should be serialized.
 * @returns Inline SVG style preserving the measured font and whitespace.
 */
export function formatSvgTextStyle(command: QuireTextPaintCommand): string {
  const styles = [
    `font: ${command.font}`,
    "white-space: pre",
    "user-select: none",
    "-webkit-user-select: none"
  ];

  if (command.direction !== undefined) {
    styles.push(`direction: ${command.direction}`, "unicode-bidi: embed");
  }

  if (command.letterSpacing !== undefined) {
    styles.push(`letter-spacing: ${formatSvgNumber(command.letterSpacing)}px`);
  }

  return styles.join("; ");
}

/**
 * Formats glyph placements as a deterministic SVG data attribute value.
 *
 * @param glyphs - Glyph placements to format.
 * @returns Compact glyph placement token.
 */
export function formatSvgGlyphPlacements(
  glyphs: readonly QuireGlyphRunGlyphPlacement[]
): string {
  return glyphs.map(formatSvgGlyphPlacement).join("|");
}

/**
 * Formats path segments as SVG path data.
 *
 * @param segments - Path segments to format.
 * @returns SVG path data string.
 */
export function formatSvgPathData(segments: readonly QuirePathSegment[]): string {
  return segments.map(formatSvgPathSegment).join(" ");
}

/**
 * Formats a rectangle as an SVG viewBox value.
 *
 * @param rect - Rectangle to format.
 * @returns Space-separated SVG rectangle value.
 */
export function formatSvgRect(rect: QuireRect): string {
  return [
    formatSvgNumber(rect.x),
    formatSvgNumber(rect.y),
    formatSvgNumber(rect.width),
    formatSvgNumber(rect.height)
  ].join(" ");
}

/**
 * Formats a numeric SVG coordinate or dimension.
 *
 * @param value - Numeric value to format.
 * @returns SVG-safe numeric token.
 */
export function formatSvgNumber(value: number): string {
  return Number.isFinite(value) ? `${value}` : "0";
}

/**
 * Prefixes an SVG line with spaces.
 *
 * @param line - SVG markup line.
 * @param indent - Number of spaces to prefix.
 * @returns Indented SVG line.
 */
export function indentSvg(line: string, indent: number): string {
  return `${" ".repeat(indent)}${line}`;
}

/**
 * Sanitizes arbitrary command identifiers for SVG id usage.
 *
 * @param value - Command identifier.
 * @returns SVG id-safe token.
 */
export function sanitizeSvgId(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9_-]/g, "-");
}

/**
 * Escapes text for use inside an SVG attribute.
 *
 * @param value - Attribute value to escape.
 * @returns XML-escaped attribute value.
 */
export function escapeSvgAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Escapes text for use inside an SVG text element.
 *
 * @param value - Text value to escape.
 * @returns XML-escaped text content.
 */
export function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Formats one path segment as SVG path data.
 *
 * @param segment - Path segment to format.
 * @returns SVG path data token.
 */
function formatSvgPathSegment(segment: QuirePathSegment): string {
  switch (segment.kind) {
    case "move-to":
      return `M ${formatSvgNumber(segment.point.x)} ${formatSvgNumber(segment.point.y)}`;
    case "line-to":
      return `L ${formatSvgNumber(segment.point.x)} ${formatSvgNumber(segment.point.y)}`;
    case "quadratic-curve-to":
      return `Q ${formatSvgNumber(segment.control.x)} ${formatSvgNumber(segment.control.y)} ${formatSvgNumber(segment.point.x)} ${formatSvgNumber(segment.point.y)}`;
    case "bezier-curve-to":
      return `C ${formatSvgNumber(segment.control1.x)} ${formatSvgNumber(segment.control1.y)} ${formatSvgNumber(segment.control2.x)} ${formatSvgNumber(segment.control2.y)} ${formatSvgNumber(segment.point.x)} ${formatSvgNumber(segment.point.y)}`;
    case "close-path":
      return "Z";
  }
}

/**
 * Formats one glyph placement as a compact SVG-safe token.
 *
 * @param glyph - Glyph placement to format.
 * @returns Glyph placement token.
 */
function formatSvgGlyphPlacement(glyph: QuireGlyphRunGlyphPlacement): string {
  return [
    glyph.glyphId,
    glyph.sourceCluster,
    formatSvgNumber(glyph.x),
    formatSvgNumber(glyph.y),
    formatSvgNumber(glyph.xAdvance),
    formatSvgNumber(glyph.yAdvance),
    formatSvgNumber(glyph.xOffset),
    formatSvgNumber(glyph.yOffset),
    glyph.fontId ?? "",
    glyph.fontFamily ?? ""
  ].join(":");
}
