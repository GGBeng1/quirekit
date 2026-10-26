import {
  create,
  type Font,
  type FontCollection
} from "fontkit";
import type { OFDTextCode } from "../model";
import type { OFDFont } from "../resources";
import type {
  OFDTextCodeLayoutOptions,
  OFDTextMeasurement,
  OFDTextMeasureOptions
} from "./types";

const parsedFonts = new WeakMap<OFDFont, Font>();

/**
 * Measures one horizontal text run from the embedded font's code-point metrics.
 *
 * This follows OFDRW's mature writer strategy: every `DeltaX` is based on the
 * preceding character's real advance. Complex shaping remains caller-owned
 * because a ligature or many-to-one source cluster cannot be represented by a
 * naive one-code-point measurement.
 *
 * @param text - Authored Unicode text.
 * @param font - Embedded OFD font resource.
 * @param options - Font size and optional letter spacing.
 * @returns Immutable per-code-point advances and aggregate metrics.
 */
export function measureOFDText(
  text: string,
  font: OFDFont,
  options: OFDTextMeasureOptions
): OFDTextMeasurement {
  assertTextMeasureOptions(text, options);
  const face = resolveFontFace(font);
  const scale = options.size / face.unitsPerEm;
  const letterSpacing = options.letterSpacing ?? 0;
  const codePoints = Array.from(text);
  const advances = codePoints.map((character, index) => {
    const codePoint = character.codePointAt(0)!;
    if (!face.hasGlyphForCodePoint(codePoint)) {
      throw new TypeError(
        `Embedded OFD font "${font.options.fontName}" does not contain ${formatCodePoint(codePoint)}.`
      );
    }
    const spacing = index < codePoints.length - 1 ? letterSpacing : 0;
    return face.glyphForCodePoint(codePoint).advanceWidth * scale + spacing;
  });

  return Object.freeze({
    advances: Object.freeze(advances),
    width: advances.reduce((total, advance) => total + advance, 0),
    ascent: face.ascent * scale,
    descent: Math.abs(face.descent * scale)
  });
}

/**
 * Creates one horizontal `TextCode` with font-derived `DeltaX` placement.
 *
 * @param text - Authored Unicode text.
 * @param font - Embedded OFD font resource.
 * @param options - Local baseline origin, size, and optional letter spacing.
 * @returns Immutable `TextCode` aligned to Unicode code points.
 */
export function createOFDTextCode(
  text: string,
  font: OFDFont,
  options: OFDTextCodeLayoutOptions
): OFDTextCode {
  const measurement = measureOFDText(text, font, options);
  return Object.freeze({
    text,
    x: options.x,
    y: options.y,
    ...(measurement.advances.length > 1
      ? { deltaX: Object.freeze(measurement.advances.slice(0, -1)) }
      : {})
  });
}

/**
 * Resolves and caches the parser-owned font face for one embedded resource.
 *
 * @param font - Font handle whose complete bytes are required.
 * @returns Parsed non-collection font.
 */
function resolveFontFace(font: OFDFont): Font {
  const cached = parsedFonts.get(font);
  if (cached) return cached;
  if (!font.data) {
    throw new TypeError(
      `Logical OFD font "${font.options.fontName}" requires explicit TextCode placement.`
    );
  }

  let parsed: Font | FontCollection;
  try {
    parsed = create(
      font.data as unknown as Parameters<typeof create>[0]
    );
  } catch (error) {
    throw new TypeError(
      `Embedded OFD font "${font.options.fontName}" cannot be parsed.`,
      { cause: error }
    );
  }
  if (isFontCollection(parsed)) {
    throw new TypeError("OFD convenience text layout requires one complete font face.");
  }
  if (!Number.isFinite(parsed.unitsPerEm) || parsed.unitsPerEm <= 0) {
    throw new TypeError("Embedded OFD font has invalid units-per-em metrics.");
  }
  parsedFonts.set(font, parsed);
  return parsed;
}

/**
 * Narrows fontkit's structurally overlapping font return types.
 *
 * @param value - Parsed font or collection.
 * @returns Whether the parser returned a collection.
 */
function isFontCollection(
  value: Font | FontCollection
): value is FontCollection {
  return "fonts" in value;
}

/**
 * Validates the finite measurement contract before parsing font bytes.
 *
 * @param text - Authored Unicode text.
 * @param options - Measurement options.
 */
function assertTextMeasureOptions(
  text: string,
  options: OFDTextMeasureOptions
): void {
  if (text.length === 0) {
    throw new TypeError("OFD text measurement requires non-empty text.");
  }
  if (!Number.isFinite(options.size) || options.size <= 0) {
    throw new TypeError("OFD text measurement requires a positive finite size.");
  }
  if (options.letterSpacing !== undefined
    && !Number.isFinite(options.letterSpacing)) {
    throw new TypeError("OFD text letter spacing must be finite.");
  }
}

/**
 * Formats one Unicode scalar for stable diagnostics.
 *
 * @param codePoint - Unicode scalar value.
 * @returns Uppercase `U+` notation.
 */
function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}
