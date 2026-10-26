import type { EditorFontSizeOption, EditorFontSizeOptionValue } from "./types";

const minimumFontSize = 1;
const maximumFontSize = 300;
const chineseOptionPrefix = "zh:";
const customOptionPrefix = "custom:";

const defaultWesternFontSizes = Object.freeze([
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96
]);

const chineseWesternFontSizes = Object.freeze([
  5, 5.5, 6.5, 7.5, 8, 9, 10, 10.5, 11, 12, 14, 15, 16, 18, 20, 22, 24,
  26, 28, 36, 42, 48, 72, 96
]);

const chineseFontSizeAliases = Object.freeze([
  ["初号", 42],
  ["小初", 36],
  ["一号", 26],
  ["小一", 24],
  ["二号", 22],
  ["小二", 18],
  ["三号", 16],
  ["小三", 15],
  ["四号", 14],
  ["小四", 12],
  ["五号", 10.5],
  ["小五", 9],
  ["六号", 7.5],
  ["小六", 6.5],
  ["七号", 5.5],
  ["八号", 5]
] as const);

/**
 * Creates the ordered font-size menu for one product locale.
 *
 * @param locale - Active Classic product locale.
 * @returns Stable localized options whose values resolve to canonical points.
 */
export function createEditorFontSizeOptions(
  locale: "zh-CN" | "en"
): readonly EditorFontSizeOption[] {
  if (locale !== "zh-CN") {
    return createWesternOptions(defaultWesternFontSizes);
  }
  return Object.freeze([
    ...chineseFontSizeAliases.map(([label, points]) => Object.freeze({
      label,
      value: `${chineseOptionPrefix}${points}`,
      points
    })),
    ...createWesternOptions(chineseWesternFontSizes)
  ]);
}

/**
 * Resolves the select value that should represent one canonical point size.
 *
 * @param locale - Active Classic product locale.
 * @param points - Canonical current point size, or null for mixed/unset state.
 * @returns Chinese alias identity, numeric value, or null.
 */
export function resolveEditorFontSizeControlValue(
  locale: "zh-CN" | "en",
  points: number | null
): EditorFontSizeOptionValue | null {
  if (points === null) return null;
  if (locale === "zh-CN" && hasChineseAlias(points)) {
    return `${chineseOptionPrefix}${points}`;
  }
  return points;
}

/**
 * Creates the temporary public Select option for one manually entered label.
 *
 * @param label - Raw editable-select input.
 * @returns Temporary option whose identity cannot collide with presets.
 */
export function createEditorFontSizeCustomOption(
  label: string
): Readonly<{ label: string; value: string }> {
  return Object.freeze({
    label,
    value: `${customOptionPrefix}${label}`
  });
}

/**
 * Resolves a product select identity to a valid, committed point value.
 *
 * @param value - Preset identity, numeric preset, or custom option identity.
 * @returns Canonical points normalized to a half-point, or null when invalid.
 */
export function resolveEditorFontSizeSelection(
  value: string | number | null
): number | null {
  if (value === null) return null;
  if (typeof value === "number") {
    return normalizeEditorFontSizeInput(value);
  }
  if (value.startsWith(chineseOptionPrefix)) {
    const points = Number(value.slice(chineseOptionPrefix.length));
    return hasChineseAlias(points) ? points : null;
  }
  const input = value.startsWith(customOptionPrefix)
    ? value.slice(customOptionPrefix.length)
    : value;
  return normalizeEditorFontSizeInput(input);
}

/**
 * Parses one manual product input and projects it to OOXML half-point precision.
 *
 * @param input - Raw numeric input or an already parsed number.
 * @returns A 1–300 pt value on the 0.5 pt grid, or null when invalid.
 */
export function normalizeEditorFontSizeInput(
  input: string | number
): number | null {
  const raw = typeof input === "number" ? input : parseNumericInput(input);
  if (
    raw === null
    || !Number.isFinite(raw)
    || raw < minimumFontSize
    || raw > maximumFontSize
  ) {
    return null;
  }
  return Math.round(raw * 2) / 2;
}

/**
 * Builds numeric options without exposing a mutable preset array.
 *
 * @param sizes - Ordered point sizes.
 * @returns Frozen numeric select options.
 */
function createWesternOptions(
  sizes: readonly number[]
): readonly EditorFontSizeOption[] {
  return Object.freeze(sizes.map((points) => Object.freeze({
    label: String(points),
    value: points,
    points
  })));
}

/**
 * Tests whether one point value has an exact Simplified Chinese alias.
 *
 * @param points - Candidate canonical point value.
 * @returns Whether the named-size table contains the exact value.
 */
function hasChineseAlias(points: number): boolean {
  return chineseFontSizeAliases.some(([, candidate]) => candidate === points);
}

/**
 * Parses the restricted decimal syntax accepted by the editable control.
 *
 * @param input - Raw editable text.
 * @returns Parsed finite candidate, or null for unsupported syntax.
 */
function parseNumericInput(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\+?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
