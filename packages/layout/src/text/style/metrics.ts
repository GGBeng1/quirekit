import { parseQuireFontPixelSize } from "../../shaping";
import { roundQuireCssPixelSize } from "../fonts";
import type { QuireResolvedTextMetricStyle, QuireTextMetricStyle } from "./types";

/**
 * Resolves independent metric fields from inherited-to-direct style deltas.
 * @param styles - Adapter-ordered neutral styles; invalid fields do not override earlier values.
 * @returns Last valid values, with CSS spacing converted into layout pixels.
 */
export function resolveQuireTextMetricStyle(
  styles: readonly QuireTextMetricStyle[]
): QuireResolvedTextMetricStyle {
  let spacing: number | undefined;
  let shift: number | undefined;
  let scale: number | undefined;
  let characterGrid: boolean | undefined;

  // Consume adapter precedence once. Keep the em shift unresolved until each
  // script run has its final font, and never multiply tracking by glyph scale.
  for (const delta of styles) {
    if (typeof delta.characterGrid === "boolean") characterGrid = delta.characterGrid;
    if (typeof delta.letterSpacing === "string") {
      const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(pt|px)$/u.exec(delta.letterSpacing.trim());
      if (match && Number.isFinite(Number(match[1]))) {
        spacing = Number(match[1]) * (match[2] === "pt" ? 96 / 72 : 1);
      }
    }
    if (typeof delta.baselineShiftEm === "number" && Number.isFinite(delta.baselineShiftEm)) {
      shift = delta.baselineShiftEm;
    }
    if (delta.horizontalScale !== undefined && Number.isFinite(delta.horizontalScale) && delta.horizontalScale > 0) {
      scale = delta.horizontalScale;
    }
  }
  return {
    ...(characterGrid === undefined ? {} : { characterGrid }),
    ...(spacing === undefined ? {} : { letterSpacing: roundQuireCssPixelSize(spacing) }),
    ...(shift === undefined ? {} : { baselineShiftEm: shift }),
    ...(scale === undefined ? {} : { horizontalScale: scale })
  };
}

/**
 * Converts an already resolved em displacement using the actual run font.
 * @param shift - Resolved em displacement, or undefined when no value was declared.
 * @param font - Final CSS font shorthand after script-specific font selection.
 * @returns Signed CSS-pixel displacement, or undefined for no shift or an unknown font size.
 */
export function resolveQuireTextBaselineShift(shift: number | undefined, font: string): number | undefined {
  if (shift === undefined || shift === 0) return undefined;
  const size = parseQuireFontPixelSize(font);
  return size === null ? undefined : size * shift;
}
