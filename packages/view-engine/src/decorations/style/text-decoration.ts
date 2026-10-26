import type { DecorationAttrs } from "@quirekit/pm";
import {
  parseDecorationPositiveNumber,
  readDecorationStringAttr
} from "./parse";
import type { QuireDecorationLine } from "../types";

/**
 * Resolves CSS text-decoration declarations into line descriptors.
 *
 * @param attrs - Decoration attributes to inspect.
 * @param styleMap - Parsed inline style map.
 * @param fallbackColor - Text color used when line color is omitted.
 * @returns Text-decoration line descriptors.
 */
export function resolveTextDecoration(
  attrs: DecorationAttrs,
  styleMap: ReadonlyMap<string, string>,
  fallbackColor: string | undefined
): readonly QuireDecorationLine[] {
  const explicitLine =
    readDecorationStringAttr(attrs, "data-qk-decoration-line") ??
    readDecorationStringAttr(attrs, "data-qk-text-decoration-line") ??
    styleMap.get("text-decoration-line") ??
    styleMap.get("text-decoration");
  const color =
    readDecorationStringAttr(attrs, "data-qk-decoration-line-color") ??
    readDecorationStringAttr(attrs, "data-qk-text-decoration-color") ??
    styleMap.get("text-decoration-color") ??
    fallbackColor ??
    "currentColor";
  const width =
    parseDecorationPositiveNumber(
      readDecorationStringAttr(attrs, "data-qk-decoration-line-width") ??
        readDecorationStringAttr(attrs, "data-qk-text-decoration-width") ??
        styleMap.get("text-decoration-thickness")
    ) ?? 1;
  const style =
    readDecorationStringAttr(attrs, "data-qk-decoration-line-style") ??
    readDecorationStringAttr(attrs, "data-qk-text-decoration-style") ??
    styleMap.get("text-decoration-style");
  const paintSurface = resolveTextDecorationPaintSurface(
    readDecorationStringAttr(attrs, "data-qk-decoration-line-surface")
  );
  const lines = resolveTextDecorationLineKinds(explicitLine);

  return lines.map((kind) => ({
    kind,
    color,
    width,
    ...(style === undefined ? {} : { style: normalizeTextDecorationStyle(style) }),
    ...(paintSurface === undefined ? {} : { paintSurface })
  }));
}

/**
 * Resolves the optional last-mile paint surface for a decoration line.
 *
 * @param value - Untrusted decoration attribute value.
 * @returns Supported paint surface, or undefined for the content default.
 */
function resolveTextDecorationPaintSurface(
  value: string | undefined
): QuireDecorationLine["paintSurface"] {
  return value === "content" || value === "overlay" ? value : undefined;
}

/**
 * Resolves text-decoration line kinds from CSS shorthand-ish input.
 *
 * @param value - Text decoration declaration value.
 * @returns Supported text-decoration line kinds.
 */
function resolveTextDecorationLineKinds(
  value: string | undefined
): readonly QuireDecorationLine["kind"][] {
  if (!value || value === "none") {
    return [];
  }

  const lower = value.toLowerCase();
  const kinds: QuireDecorationLine["kind"][] = [];

  if (lower.includes("underline")) {
    kinds.push("underline");
  }

  if (lower.includes("line-through") || lower.includes("strikethrough")) {
    kinds.push("strikethrough");
  }

  if (lower.includes("overline")) {
    kinds.push("overline");
  }

  return kinds;
}

/**
 * Normalizes a CSS text-decoration style token.
 *
 * @param value - CSS style value.
 * @returns Supported renderer-neutral line style.
 */
function normalizeTextDecorationStyle(
  value: string
): QuireDecorationLine["style"] {
  const lower = value.toLowerCase();

  if (lower.includes("wavy")) {
    return "wavy";
  }

  if (lower.includes("double")) {
    return "double";
  }

  if (lower.includes("dashed")) {
    return "dashed";
  }

  if (lower.includes("dotted")) {
    return "dotted";
  }

  return "solid";
}
