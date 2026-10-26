import type { DecorationAttrs } from "@quirekit/pm";

/** Parsed CSS declaration map keyed by lowercase property names. */
export type QuireDecorationStyleMap = ReadonlyMap<string, string>;

/**
 * Parses a CSS declaration string into a lowercase property map.
 *
 * @param style - CSS declaration string.
 * @returns Lowercase CSS property map.
 */
export function parseDecorationStyleAttribute(
  style: string | undefined
): QuireDecorationStyleMap {
  const result = new Map<string, string>();

  if (!style) {
    return result;
  }

  for (const declaration of style.split(";")) {
    const separatorIndex = declaration.indexOf(":");

    if (separatorIndex <= 0) {
      continue;
    }

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();

    if (property && value) {
      result.set(property, value);
    }
  }

  return result;
}

/**
 * Reads a string decoration attribute by name.
 *
 * @param attrs - Decoration attributes to inspect.
 * @param name - Attribute name to read.
 * @returns Attribute value when it is a non-empty string.
 */
export function readDecorationStringAttr(
  attrs: DecorationAttrs,
  name: string
): string | undefined {
  const value = attrs[name];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Parses a positive CSS pixel-like number.
 *
 * @param value - Value to parse.
 * @returns Positive number or undefined.
 */
export function parseDecorationPositiveNumber(
  value: string | undefined
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Splits a class attribute into individual class names.
 *
 * @param className - Class attribute value to split.
 * @returns Non-empty class names.
 */
export function splitDecorationClassNames(
  className: string | undefined
): readonly string[] {
  return (className ?? "")
    .split(/\s+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}
