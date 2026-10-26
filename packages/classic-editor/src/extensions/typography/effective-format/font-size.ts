import type { QuireEditor } from "@quirekit/core";
import type { ClassicEffectiveFormatState } from "./types";
import {
  collectClassicSelectedTextSegments,
  compareClassicEffectiveSamples,
  findClassicTextStyleMark,
  resolveClassicNodeTextStyle
} from "./selection";

/** Current shared 16 px document body base expressed in points. */
export const classicDefaultBodyFontSizePoints = 12;

/**
 * Resolves the effective point size at the caret or across the selection.
 *
 * @param editor - Mounted Core editor whose current selection should be read.
 * @returns One inherited/direct point value or an explicit mixed state.
 */
export function resolveClassicEffectiveFontSize(
  editor: QuireEditor
): ClassicEffectiveFormatState<number> {
  const samples = collectClassicSelectedTextSegments(editor).map((segment) => {
    const direct = readClassicPointSize(
      findClassicTextStyleMark(segment.marks)?.attrs.fontSize
    );
    if (direct !== null) {
      return { value: direct, hasDirect: true };
    }
    const text = resolveClassicNodeTextStyle(editor, segment.textblock);
    const absolute = readClassicPointSize(text?.fontSize);
    const scale = text?.fontScale;
    return {
      value: absolute ?? classicDefaultBodyFontSizePoints * normalizeClassicFontScale(scale),
      hasDirect: false
    };
  });

  return compareClassicEffectiveSamples(samples, sameClassicPointSize);
}

/**
 * Reads one canonical point-size mark value.
 *
 * @param value - Candidate `textStyle.fontSize` value.
 * @returns Parsed points or null when inherited/malformed.
 */
function readClassicPointSize(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)pt$/u.exec(value.trim());
  if (match?.[1] === undefined) return null;
  const points = Number(match[1]);
  return Number.isFinite(points) && points > 0 ? points : null;
}

/**
 * Normalizes one node font scale before it reaches product state.
 *
 * @param value - Candidate extension-owned scale.
 * @returns Positive finite scale or one.
 */
function normalizeClassicFontScale(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

/**
 * Compares point values using the same tolerance as mature compiled text
 * property comparison.
 *
 * @param left - First point size.
 * @param right - Second point size.
 * @returns Whether values are effectively equal.
 */
function sameClassicPointSize(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001;
}
