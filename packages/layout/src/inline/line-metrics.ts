import { collectQuireMetricSamplesByFont } from "../text/metric-samples";
import { parseQuireFontPixelSize } from "../shaping/font-size";
import type { QuireTextMeasurer, QuireTextMetrics } from "../text";
import type { QuireInlineTextRun } from "./types";

/**
 * Measures the natural font box for the scripts that a run actually paints.
 * @param run - Source run before line wrapping.
 * @param measureText - Layout-scoped memoized font measurer.
 * @returns Natural extents and font leading, without paragraph spacing.
 */
export function measureInlineNaturalLineMetrics(
  run: QuireInlineTextRun,
  measureText: QuireTextMeasurer["measureText"]
): QuireTextMetrics {
  const samples = collectQuireMetricSamplesByFont([run], run.font, "Hg");
  const fontSize = parseQuireFontPixelSize(run.font) ?? 16;
  let ascent = 0;
  let descent = 0;
  let lineHeight = 0;
  for (const sample of samples.get(run.font) ?? []) {
    const measured = measureText(sample, run.font);
    ascent = Math.max(ascent, measured.ascent ?? fontSize * 0.8);
    descent = Math.max(descent, measured.descent ?? (fontSize - fontSize * 0.8));
    lineHeight = Math.max(lineHeight, measured.lineHeight ?? 0);
  }
  return { width: 0, ascent, descent, lineHeight: Math.max(lineHeight, ascent + descent) };
}
