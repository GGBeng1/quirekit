import type {
  HorizontalRuleAlignment,
  HorizontalRuleStyle,
  HorizontalRuleVariant
} from "../types";
import { resolveIndentAlignment, resolveWidthPercent } from "./geometry";

/** Style id used by the interoperable paragraph-border projection. */
export const horizontalRuleStyleId = "QuireKitHorizontalRule";

const defaultCodecHorizontalRuleStyle: HorizontalRuleStyle = {
  variant: "single",
  color: "#111827",
  thicknessPt: 1.5,
  widthPercent: 100,
  alignment: "center"
};

/**
 * Reads canonical style fields from modeled attributes or paragraph borders.
 *
 * @param attrs - Source LitAST node attributes.
 * @param sectionBodyWidthDxa - Available section body width in twentieths of a point.
 * @returns Complete canonical style.
 */
export function readHorizontalRuleStyleFromLitAst(
  attrs: Readonly<Record<string, unknown>> | undefined,
  sectionBodyWidthDxa?: number
): HorizontalRuleStyle {
  const bottom = readRecord(readRecord(attrs?.borders)?.bottom);
  const indent = readRecord(attrs?.indent);
  const derivedWidth = resolveWidthPercent(indent, sectionBodyWidthDxa);
  const derivedAlignment = readAlignment(attrs?.alignment)
    ?? readAlignment(attrs?.textAlign)
    ?? resolveIndentAlignment(indent);
  return normalizeCodecHorizontalRuleStyle({
    variant: readVariant(attrs?.variant)
      ?? mapOoxmlBorderToVariant(bottom),
    color: readHexColor(attrs?.color)
      ?? readHexColor(bottom?.color),
    thicknessPt: readPositiveNumber(attrs?.thicknessPt)
      ?? divideBorderSize(bottom?.sz),
    widthPercent: readPositiveNumber(attrs?.widthPercent)
      ?? derivedWidth,
    alignment: derivedAlignment
  });
}

/**
 * Normalizes canonical style fields at the codec boundary.
 *
 * @param value - Untrusted canonical or derived style fields.
 * @returns Complete validated horizontal-rule style.
 */
export function normalizeCodecHorizontalRuleStyle(
  value: Readonly<Record<string, unknown>> | undefined
): HorizontalRuleStyle {
  return {
    variant: readVariant(value?.variant) ?? defaultCodecHorizontalRuleStyle.variant,
    color: readHexColor(value?.color) ?? defaultCodecHorizontalRuleStyle.color,
    thicknessPt: clampNumber(
      value?.thicknessPt,
      defaultCodecHorizontalRuleStyle.thicknessPt,
      0.25,
      24
    ),
    widthPercent: clampNumber(
      value?.widthPercent,
      defaultCodecHorizontalRuleStyle.widthPercent,
      1,
      100
    ),
    alignment: readAlignment(value?.alignment)
      ?? defaultCodecHorizontalRuleStyle.alignment
  };
}

/**
 * Maps a canonical variant to the paragraph-border vocabulary.
 *
 * @param variant - Canonical rule variant.
 * @returns OOXML border token.
 */
export function mapVariantToOoxmlBorder(variant: HorizontalRuleVariant): string {
  return variant === "single" || variant === "shaded" ? "single" : variant;
}

/**
 * Reads a CSS or OOXML hexadecimal color.
 *
 * @param value - Candidate color.
 * @returns Canonical hash-prefixed color.
 */
function readHexColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/iu.test(normalized)
    ? `#${normalized.toUpperCase()}`
    : undefined;
}

/**
 * Reads a positive finite number.
 *
 * @param value - Candidate number.
 * @returns Positive number or undefined.
 */
function readPositiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/**
 * Reads a non-empty string.
 *
 * @param value - Candidate value.
 * @returns Non-empty string or undefined.
 */
export function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

/**
 * Reads a record while rejecting arrays.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
export function readRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

/**
 * Clamps one numeric style field to its public value space.
 *
 * @param value - Candidate numeric value.
 * @param fallback - Value used when the candidate is not finite.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Finite clamped number.
 */
function clampNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}

/**
 * Maps a paragraph border to the closest canonical variant.
 *
 * @param border - LitAST paragraph-border attributes.
 * @returns Canonical variant when recognized.
 */
function mapOoxmlBorderToVariant(
  border: Readonly<Record<string, unknown>> | undefined
): HorizontalRuleVariant | undefined {
  if (border?.shadow === true) return "shaded";
  const value = border?.val;
  return value === "double" || value === "dotted" || value === "dashed"
    ? value
    : value === "single"
      ? "single"
      : undefined;
}

/**
 * Converts an OOXML eighth-point border size into points.
 *
 * @param value - Border size.
 * @returns Positive point value when valid.
 */
function divideBorderSize(value: unknown): number | undefined {
  const size = readPositiveNumber(value);
  return size === undefined ? undefined : size / 8;
}

/**
 * Reads a supported canonical variant.
 *
 * @param value - Candidate value.
 * @returns Supported variant or undefined.
 */
function readVariant(value: unknown): HorizontalRuleVariant | undefined {
  return value === "single"
    || value === "double"
    || value === "dotted"
    || value === "dashed"
    || value === "shaded"
    ? value
    : undefined;
}

/**
 * Reads a supported canonical alignment.
 *
 * @param value - Candidate value.
 * @returns Supported alignment or undefined.
 */
function readAlignment(value: unknown): HorizontalRuleAlignment | undefined {
  return value === "left" || value === "center" || value === "right"
    ? value
    : undefined;
}
