import type { ShapedRunData } from "../shaping";
import type { QuireTextLayoutOptions, QuireTextLineMetricContribution } from "../types";
import type { LineRun } from "../wrap";
import type { TextLineExtents, TextLineVerticalMetrics } from "./types";

/**
 * Prepares natural run metrics once, then resolves only participants of each line.
 * @param options - Natural fallback metrics and the paragraph's spacing policy.
 * @param shapedData - Optional shaped font metrics keyed by source run.
 * @returns Per-line baseline and advance resolver.
 */
export function createLineSpacingResolver(
  options: QuireTextLayoutOptions,
  shapedData: ReadonlyMap<number, ShapedRunData>
): (line: LineRun, index: number, count: number) => TextLineVerticalMetrics {
  const fallback = {
    ascent: options.lineSpacing?.fallbackMetrics?.ascent ?? options.baselineOffset,
    descent: options.lineSpacing?.fallbackMetrics?.descent
      ?? Math.max(0, options.lineHeight - options.baselineOffset)
  };
  const metrics = options.runs.map((run, index) => {
    const shaped = shapedData.get(index);
    const ascent = run.ascent ?? shaped?.ascent ?? fallback.ascent;
    const descent = run.descent ?? shaped?.descent ?? fallback.descent;
    const leading = Math.max(0, (run.lineHeight ?? 0) - ascent - descent) / 2;
    return { ascent: ascent + leading, descent: descent + leading };
  });

  /**
   * @param line - Source participants after wrapping.
   * @param index - Current visual line index.
   * @param count - Total visual line count before pagination.
   * @returns Resolved line geometry; glyph ink is deliberately not a minimum advance.
   */
  return (line, index, count) => {
    const participants = new Set(line.graphemes.map(item => item.run));
    if (participants.size === 0) participants.add(line.end.run);
    let text: TextLineExtents = { ascent: 0, descent: 0 };
    let content: TextLineExtents = { ascent: 0, descent: 0 };
    let hasText = false;
    for (const index of participants) {
      const run = options.runs[index];
      const natural = metrics[index] ?? fallback;
      if (run?.replacement === undefined) {
        text = unionExtents(text, natural);
        hasText = true;
      }
      const shift = run?.baselineShift ?? 0;
      content = unionExtents(content, {
        ascent: Math.max(0, natural.ascent + shift),
        descent: Math.max(0, natural.descent - shift)
      });
    }
    // The paragraph mark is a text participant, so its natural metrics must be
    // included before multiplying. Floating/inline objects only grow content.
    const endMark = index === count - 1 ? options.finalLineMetricContribution : undefined;
    if (endMark !== undefined) {
      text = unionExtents(text, endMark);
      content = unionExtents(content, endMark);
      hasText = true;
    }
    if (!hasText) text = fallback;
    content = unionExtents(content, options.lineMetricContributions?.[index]);
    const naturalHeight = content.ascent + content.descent;
    const policy = options.lineSpacing!;
    const height = policy.mode === "multiple"
      ? naturalHeight + (text.ascent + text.descent) * (policy.value - 1)
      : policy.mode === "at-least" ? Math.max(naturalHeight, policy.value) : policy.value;
    const extra = height - naturalHeight;
    // Automatic leading belongs after the current line; compressed automatic
    // lines advance their baseline upward. Fixed boxes keep their clipping rule.
    // A profile may anchor a fixed box independently from font extents. Resolve
    // it here so paint, caret and selection retain the same baseline authority.
    const ascent = policy.mode === "exact" && policy.exactBaselineRatio !== undefined
      ? height * policy.exactBaselineRatio
      : content.ascent + (
          policy.mode === "multiple" ? Math.min(0, extra)
            : policy.mode === "exact" && extra < 0 ? extra : extra / 2
        );
    return { height, ascent, descent: height - ascent };
  };
}

/**
 * @param current - Accumulated baseline-relative bounds.
 * @param contribution - Optional participant bounds.
 * @returns Union without introducing a paragraph-wide minimum.
 */
function unionExtents(
  current: TextLineExtents,
  contribution: QuireTextLineMetricContribution | undefined
): TextLineExtents {
  return {
    ascent: Math.max(current.ascent, contribution?.ascent ?? 0),
    descent: Math.max(current.descent, contribution?.descent ?? 0)
  };
}
