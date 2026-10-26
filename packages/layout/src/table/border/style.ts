import type { QuireTableBorder } from "../types";

/** Default document border color used when the source declares automatic color. */
export const defaultQuireTableBorderStyle = "#000000";

/** Default C1 table border width in CSS pixels. */
export const defaultQuireTableBorderWidth = 1;

const borderStylePriorities = new Map<string, number>([
  ["single", 1],
  ["thick", 2],
  ["double", 3],
  ["dotted", 4],
  ["dashed", 5],
  ["dotdash", 6],
  ["dotdotdash", 7],
  ["triple", 8],
  ["thinthicksmallgap", 9],
  ["thickthinsmallgap", 10],
  ["thinthickthingap", 11],
  ["thinthickmediumgap", 12],
  ["thickthinmediumgap", 13],
  ["thinthickthinmediumgap", 14],
  ["thinthicklargegap", 15],
  ["thickthinlargegap", 16],
  ["thinthickthinlargegap", 17],
  ["wave", 18],
  ["doublewave", 19],
  ["dashsmallgap", 20],
  ["dashdotstroked", 21],
  ["threedemboss", 22],
  ["threedengrave", 23],
  ["outset", 24],
  ["inset", 25]
]);

/**
 * Checks whether a normalized table border paints a visible line.
 *
 * @param border - Border to inspect.
 * @returns True when the border has a visible style.
 */
export function isConcreteQuireTableBorder(
  border: QuireTableBorder | null
): border is QuireTableBorder {
  if (!border) {
    return false;
  }

  const style = border.style.trim().toLowerCase();
  return style !== "" && style !== "nil" && style !== "none";
}

/**
 * Resolves a normalized border width into CSS pixels.
 *
 * @param border - Visible normalized border.
 * @returns Border width in CSS pixels.
 */
export function resolveQuireTableBorderWidth(
  border: QuireTableBorder
): number {
  return typeof border.width === "number" &&
    Number.isFinite(border.width) &&
    border.width > 0
    ? border.width
    : defaultQuireTableBorderWidth;
}

/**
 * Resolves a normalized border color into a CSS-like stroke style.
 *
 * @param border - Visible normalized border.
 * @returns Stroke color.
 */
export function resolveQuireTableBorderColor(
  border: QuireTableBorder
): string {
  const color = border.color;

  if (!color || color === "auto") {
    return defaultQuireTableBorderStyle;
  }

  return /^[0-9a-f]{6}$/iu.test(color) ? `#${color}` : color;
}

/**
 * Resolves a normalized border style into deterministic conflict priority.
 *
 * @param border - Visible normalized border.
 * @returns Style priority used after width tie-breaks.
 */
export function resolveQuireTableBorderStylePriority(
  border: QuireTableBorder
): number {
  const normalized = normalizeQuireTableBorderStyleName(border.style);

  return borderStylePriorities.get(normalized) ?? 1000;
}

/**
 * Resolves a normalized border style into a renderer-neutral dash pattern.
 *
 * Multi-line styles such as `double` and `triple` are expanded by the
 * table paint model; this helper only maps single-stroke dashed and dotted
 * families onto the existing line command.
 *
 * @param border - Visible normalized border.
 * @returns Dash pattern in CSS pixels, or undefined for solid single-stroke paint.
 */
export function resolveQuireTableBorderLineDash(
  border: QuireTableBorder
): readonly number[] | undefined {
  const normalized = normalizeQuireTableBorderStyleName(border.style);
  const width = Math.max(resolveQuireTableBorderWidth(border), 1);

  switch (normalized) {
    case "dotted":
      return [width, width * 2];
    case "dashsmallgap":
      return [width * 3, width];
    case "dashed":
      return [width * 3, width * 2];
    case "dotdash":
      return [width * 3, width * 2, width, width * 2];
    case "dotdotdash":
      return [width * 3, width * 2, width, width * 2, width, width * 2];
    default:
      return undefined;
  }
}

/**
 * Normalizes a border style name for lookup.
 *
 * @param style - Source style name.
 * @returns Lowercase alphanumeric style key.
 */
export function normalizeQuireTableBorderStyleName(style: string): string {
  return style.trim().toLowerCase().replace(/[^a-z0-9]/gu, "");
}
