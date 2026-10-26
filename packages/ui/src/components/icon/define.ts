import type {
  DefineQuireKitIconOptions,
  QuireKitIconData
} from "./types";

/** Maximum visible geometry elements allowed in one compact interface glyph. */
export const QUIRE_KIT_ICON_COMPLEXITY_LIMIT = 16;

const forbiddenMarkup = /<(?:script|style|foreignObject|iframe|object|embed|image|text|use)\b|\son[a-z]+\s*=|\s(?:href|xlink:href|style)\s*=|url\s*\(/iu;
const svgRoot = /^\s*(?:<!--[\s\S]*?-->\s*)*<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/iu;
const viewBoxAttribute = /\bviewBox\s*=\s*(["'])([^"']+)\1/iu;
const classAttribute = /\bclass\s*=\s*(["'])([^"']*)\1/iu;
const paintAttribute = /\s(?:fill|stroke)\s*=\s*(["'])([^"']+)\1/giu;
const geometryElement = /<(?:path|rect|circle|line|polyline|polygon|ellipse)\b/giu;
const elementName = /<\/?([a-z][\w:-]*)\b/giu;
const allowedElements = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "line",
  "polyline",
  "polygon",
  "ellipse"
]);

/**
 * Normalizes one reviewed SVG into immutable renderer data.
 *
 * The admission step intentionally rejects embedded content, paint servers,
 * event handlers, fixed network references, text, and overly detailed glyphs.
 * Icons stay small enough to read at the toolbar's 16 px optical size.
 *
 * @param options - Audited SVG, source, license, and directional behavior.
 * @returns Frozen icon data safe for QuireKit framework adapters.
 */
export function defineQuireKitIcon(
  options: DefineQuireKitIconOptions
): QuireKitIconData {
  const opticalScale = options.opticalScale ?? 1;
  if (!Number.isFinite(opticalScale) || opticalScale < 0.5 || opticalScale > 1) {
    throw new RangeError("QuireKit icon opticalScale must be between 0.5 and 1.");
  }

  if (forbiddenMarkup.test(options.svg)) {
    throw new TypeError("QuireKit icons cannot contain active, external, styled, or textual SVG content.");
  }

  const match = options.svg.match(svgRoot);
  if (match === null) {
    throw new TypeError("QuireKit icons must contain exactly one complete SVG root.");
  }

  const [, rawAttributes = "", rawBody = ""] = match;
  const viewBox = rawAttributes.match(viewBoxAttribute)?.[2]?.trim();
  if (viewBox === undefined || viewBox.length === 0) {
    throw new TypeError("QuireKit icons must declare a non-empty viewBox.");
  }

  const names = [...options.svg.matchAll(elementName)].map((entry) =>
    entry[1]?.toLowerCase()
  );
  const unsupported = names.find((name) =>
    name !== undefined && !allowedElements.has(name)
  );
  if (unsupported !== undefined) {
    throw new TypeError(`QuireKit icons do not support the <${unsupported}> SVG element.`);
  }

  const unsupportedPaint = [...options.svg.matchAll(paintAttribute)]
    .map((entry) => entry[2]?.trim().toLowerCase())
    .find((paint) => paint !== undefined && paint !== "none" && paint !== "currentcolor");
  if (unsupportedPaint !== undefined) {
    throw new TypeError(
      `QuireKit icons inherit color from their owner; fixed SVG paint "${unsupportedPaint}" is not supported.`
    );
  }

  const complexity = rawBody.match(geometryElement)?.length ?? 0;
  if (complexity === 0) {
    throw new TypeError("QuireKit icons must contain visible vector geometry.");
  }
  if (complexity > QUIRE_KIT_ICON_COMPLEXITY_LIMIT) {
    throw new RangeError(
      `QuireKit icons support at most ${QUIRE_KIT_ICON_COMPLEXITY_LIMIT} geometry elements; received ${complexity}.`
    );
  }

  const existingClass = rawAttributes.match(classAttribute)?.[2]?.trim();
  const normalizedClass = existingClass === undefined || existingClass.length === 0
    ? "qk-icon__svg"
    : `qk-icon__svg ${existingClass}`;
  const normalizedAttributes = rawAttributes
    .replace(classAttribute, "")
    .replace(/\s+(?:width|height)\s*=\s*(["'])[^"']*\1/giu, "")
    .trim();
  const normalizedBody = rawBody
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/>\s+</gu, "><")
    .trim();
  const svg = `<svg ${normalizedAttributes} class="${normalizedClass}" width="100%" height="100%" aria-hidden="true" focusable="false">${normalizedBody}</svg>`;

  return Object.freeze({
    svg,
    viewBox,
    source: options.source,
    license: options.license,
    mirrorInRtl: options.mirrorInRtl ?? false,
    opticalScale,
    complexity
  });
}
