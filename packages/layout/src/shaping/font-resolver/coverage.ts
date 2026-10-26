import type { QuireGlyphRunCoverage } from "@quirekit/renderer";
import type { QuireShapedTextRun } from "../../text/types";

/**
 * Merges a shaped run's glyph coverage into accumulated resolver coverage.
 *
 * @param current - Existing combined glyph coverage.
 * @param shaped - Shaped run that was appended to the combined output.
 * @returns Updated coverage, or undefined when no glyph placements exist yet.
 */
export function mergeQuireShapedRunGlyphCoverage(
  current: QuireGlyphRunCoverage | undefined,
  shaped: QuireShapedTextRun
): QuireGlyphRunCoverage | undefined {
  if ((shaped.glyphs?.length ?? 0) === 0) {
    return current;
  }

  return mergeQuireGlyphCoverage(current, shaped.glyphCoverage ?? "partial");
}

/**
 * Merges one glyph coverage value into the accumulated value.
 *
 * @param current - Existing combined glyph coverage.
 * @param next - Next coverage value to include.
 * @returns Complete only when all merged coverage values are complete.
 */
export function mergeQuireGlyphCoverage(
  current: QuireGlyphRunCoverage | undefined,
  next: QuireGlyphRunCoverage
): QuireGlyphRunCoverage {
  if (current === undefined) {
    return next;
  }

  return current === "complete" && next === "complete"
    ? "complete"
    : "partial";
}
