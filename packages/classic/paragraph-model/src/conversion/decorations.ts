import type {
  WordParagraphBorder,
  WordParagraphBorders,
  WordParagraphDirection,
  WordParagraphShading
} from "../types";
import { readRecord } from "./attribute-values";

/** Empty logical border topology used while importing partial OOXML sides. */
const emptyBorders: WordParagraphBorders = Object.freeze({
  top: null,
  start: null,
  bottom: null,
  end: null,
  between: null,
  bar: null
});

/**
 * Converts LitAST physical paragraph border sides into logical Word sides.
 *
 * @param value - Candidate LitAST `borders` attribute.
 * @param direction - Effective direct paragraph direction.
 * @returns Logical border topology or null when no supported side exists.
 */
export function litAstParagraphBordersToWord(
  value: unknown,
  direction: WordParagraphDirection | null
): WordParagraphBorders | null {
  const source = readRecord(value);
  if (source === undefined) return null;
  const left = readBorder(source.left);
  const right = readBorder(source.right);
  const result: WordParagraphBorders = {
    top: readBorder(source.top),
    start: direction === "rtl" ? right : left,
    bottom: readBorder(source.bottom),
    end: direction === "rtl" ? left : right,
    between: readBorder(source.between),
    bar: readBorder(source.bar)
  };
  return Object.values(result).some((border) => border !== null)
    ? result
    : null;
}

/**
 * Writes logical paragraph border sides back to LitAST physical sides.
 *
 * @param value - Canonical logical border topology.
 * @param direction - Effective direct paragraph direction.
 * @returns LitAST border object or null when no side exists.
 */
export function wordParagraphBordersToLitAst(
  value: WordParagraphBorders | null,
  direction: WordParagraphDirection | null
): Record<string, unknown> | null {
  if (value === null) return null;
  const left = direction === "rtl" ? value.end : value.start;
  const right = direction === "rtl" ? value.start : value.end;
  const result: Record<string, unknown> = {};
  writeBorder(result, "top", value.top);
  writeBorder(result, "left", left);
  writeBorder(result, "bottom", value.bottom);
  writeBorder(result, "right", right);
  writeBorder(result, "between", value.between);
  writeBorder(result, "bar", value.bar);
  return Object.keys(result).length === 0 ? null : result;
}

/**
 * Converts LitAST paragraph shading into the canonical Word value.
 *
 * @param shadingValue - Candidate structured shading attribute.
 * @param backgroundColor - Legacy direct fill attribute.
 * @returns Canonical paragraph shading or null when absent.
 */
export function litAstParagraphShadingToWord(
  shadingValue: unknown,
  backgroundColor: unknown
): WordParagraphShading | null {
  const shading = readRecord(shadingValue);
  const legacyFill = readColor(backgroundColor);
  if (shading === undefined && legacyFill === null) return null;
  return {
    pattern: typeof shading?.val === "string" ? shading.val : "clear",
    color: readColor(shading?.color),
    fill: readColor(shading?.fill) ?? legacyFill,
    themeColor: readString(shading?.themeColor),
    themeFill: readString(shading?.themeFill),
    themeFillTint: readString(shading?.themeFillTint),
    themeFillShade: readString(shading?.themeFillShade)
  };
}

/**
 * Writes canonical paragraph shading to the LitAST structured value.
 *
 * @param value - Canonical paragraph shading.
 * @returns Structured LitAST shading or null when inherited.
 */
export function wordParagraphShadingToLitAst(
  value: WordParagraphShading | null
): Record<string, unknown> | null {
  if (value === null) return null;
  return compactRecord({
    val: value.pattern,
    color: writeColor(value.color),
    fill: writeColor(value.fill),
    themeColor: value.themeColor,
    themeFill: value.themeFill,
    themeFillTint: value.themeFillTint,
    themeFillShade: value.themeFillShade
  });
}

/**
 * Sanitizes unknown border state from persisted editor JSON.
 *
 * @param value - Candidate logical border topology.
 * @returns Valid logical topology or null.
 */
export function resolveWordParagraphBorders(
  value: unknown
): WordParagraphBorders | null {
  const source = readRecord(value);
  if (source === undefined) return null;
  const result: WordParagraphBorders = {
    ...emptyBorders,
    top: readCanonicalBorder(source.top),
    start: readCanonicalBorder(source.start),
    bottom: readCanonicalBorder(source.bottom),
    end: readCanonicalBorder(source.end),
    between: readCanonicalBorder(source.between),
    bar: readCanonicalBorder(source.bar)
  };
  return Object.values(result).some((border) => border !== null)
    ? result
    : null;
}

/**
 * Sanitizes unknown paragraph shading from persisted editor JSON.
 *
 * @param value - Candidate canonical shading value.
 * @returns Valid shading or null.
 */
export function resolveWordParagraphShading(
  value: unknown
): WordParagraphShading | null {
  const source = readRecord(value);
  if (source === undefined || typeof source.pattern !== "string") return null;
  return {
    pattern: source.pattern,
    color: readColor(source.color),
    fill: readColor(source.fill),
    themeColor: readString(source.themeColor),
    themeFill: readString(source.themeFill),
    themeFillTint: readString(source.themeFillTint),
    themeFillShade: readString(source.themeFillShade)
  };
}

/** Reads one LitAST physical border record. */
function readBorder(value: unknown): WordParagraphBorder | null {
  const source = readRecord(value);
  if (source === undefined || typeof source.val !== "string") return null;
  return {
    style: source.val,
    color: readColor(source.color),
    themeColor: readString(source.themeColor),
    themeTint: readString(source.themeTint),
    themeShade: readString(source.themeShade),
    sizeEighthPoints: readNonNegativeInteger(source.sz),
    spacePoints: readNonNegativeNumber(source.space),
    shadow: readNullableBoolean(source.shadow),
    frame: readNullableBoolean(source.frame)
  };
}

/** Reads one canonical logical border record. */
function readCanonicalBorder(value: unknown): WordParagraphBorder | null {
  const source = readRecord(value);
  if (source === undefined || typeof source.style !== "string") return null;
  return {
    style: source.style,
    color: readColor(source.color),
    themeColor: readString(source.themeColor),
    themeTint: readString(source.themeTint),
    themeShade: readString(source.themeShade),
    sizeEighthPoints: readNonNegativeInteger(source.sizeEighthPoints),
    spacePoints: readNonNegativeNumber(source.spacePoints),
    shadow: readNullableBoolean(source.shadow),
    frame: readNullableBoolean(source.frame)
  };
}

/** Writes one canonical border to a LitAST side. */
function writeBorder(
  target: Record<string, unknown>,
  side: string,
  value: WordParagraphBorder | null
): void {
  if (value === null) return;
  target[side] = compactRecord({
    val: value.style,
    color: writeColor(value.color),
    themeColor: value.themeColor,
    themeTint: value.themeTint,
    themeShade: value.themeShade,
    sz: value.sizeEighthPoints,
    space: value.spacePoints,
    shadow: value.shadow,
    frame: value.frame
  });
}

/** Reads a direct color token and normalizes RGB values with a leading hash. */
function readColor(value: unknown): string | "auto" | null {
  if (value === "auto") return "auto";
  if (typeof value !== "string" || value.length === 0) return null;
  return value.startsWith("#") ? value : `#${value}`;
}

/** Removes the canonical hash before LitAST/OOXML generation. */
function writeColor(value: string | "auto" | null): string | null {
  if (value === null) return null;
  return value.startsWith("#") ? value.slice(1) : value;
}

/** Reads one nullable string. */
function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Reads one nullable non-negative integer. */
function readNonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

/** Reads one nullable non-negative finite number. */
function readNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** Reads one nullable boolean without conflating absence with false. */
function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Drops nullish properties from one JSON-safe record. */
function compactRecord(
  value: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, candidate]) => candidate !== null)
  );
}
