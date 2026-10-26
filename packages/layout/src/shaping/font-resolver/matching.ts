import type { QuireLoadedShaperFont } from "../types";
import {
  isQuireGenericFontFamily,
  normalizeQuireFontFamily
} from "./request";
import type { QuireFontRequest } from "./types";

/**
 * Returns whether a loaded font is a candidate for a CSS family.
 *
 * @param font - Loaded shaper font.
 * @param family - Requested CSS family.
 * @returns Whether the font belongs to the requested family.
 */
export function doesQuireFontFamilyMatch(
  font: QuireLoadedShaperFont,
  family: string
): boolean {
  const normalizedFamily = normalizeQuireFontFamily(family);

  if (isQuireGenericFontFamily(family)) {
    // A generic family resolves only to fonts that declare that generic category,
    // so a `monospace` request shapes with a monospace font (matching advances)
    // instead of any loaded font (proportional advances overlap when painted).
    return (
      font.source.genericFamily !== undefined
      && normalizeQuireFontFamily(font.source.genericFamily) === normalizedFamily
    );
  }

  return normalizeQuireFontFamily(font.source.family) === normalizedFamily;
}

/**
 * Returns whether a font reports coverage for the whole text segment.
 *
 * @param font - Loaded shaper font.
 * @param text - Text segment requiring coverage.
 * @returns Whether the font can shape the segment.
 */
export function canQuireFontShapeText(font: QuireLoadedShaperFont, text: string): boolean {
  return font.canShapeText?.(text) ?? true;
}

/**
 * Selects the closest style and weight match from candidate fonts.
 *
 * @param candidates - Candidate loaded fonts.
 * @param request - Parsed CSS font request.
 * @returns Closest loaded font, or null.
 */
export function selectClosestQuireFont(
  candidates: readonly QuireLoadedShaperFont[],
  request: QuireFontRequest
): QuireLoadedShaperFont | null {
  return candidates
    .map((font) => ({
      font,
      score: resolveFontStyleScore(font, request) + resolveFontWeightScore(font, request)
    }))
    .sort((first, second) => first.score - second.score)[0]?.font ?? null;
}

/**
 * Scores a font style match.
 *
 * @param font - Loaded shaper font.
 * @param request - Parsed CSS font request.
 * @returns Lower score for a closer style match.
 */
function resolveFontStyleScore(font: QuireLoadedShaperFont, request: QuireFontRequest): number {
  return (font.source.style ?? "normal") === request.style ? 0 : 1_000;
}

/**
 * Scores a font weight match.
 *
 * @param font - Loaded shaper font.
 * @param request - Parsed CSS font request.
 * @returns Lower score for a closer weight match.
 */
function resolveFontWeightScore(font: QuireLoadedShaperFont, request: QuireFontRequest): number {
  return Math.abs(resolveNumericFontWeight(font.source.weight) - request.weight);
}

/**
 * Normalizes CSS font weight metadata to a numeric value.
 *
 * @param weight - Source font weight.
 * @returns Numeric CSS weight.
 */
function resolveNumericFontWeight(weight: string | number | undefined): number {
  if (typeof weight === "number") {
    return weight;
  }

  if (weight === "bold") {
    return 700;
  }

  if (weight && /^[1-9]00$/u.test(weight)) {
    return Number(weight);
  }

  return 400;
}
