import type { ShapedRunData } from "../shaping";
import type { RunGrapheme } from "../units";
import type { QuireTextLayoutOptions } from "../types";

/**
 * Measures a grapheme sequence. A grapheme whose run was shaped contributes the
 * shaper's cluster advance (already kerned; the same value buildLayout uses, so
 * line breaks match the rendered geometry); contiguous unshaped graphemes fall
 * back to a same-font `measureText` segment, which keeps within-run kerning.
 *
 * @param graphemes - Run-tagged graphemes to measure.
 * @param measureText - Measurer used for unshaped runs.
 * @param shapedData - Per-run shaping data providing cluster advances.
 * @returns Total advance width of the sequence.
 */
export function measureRunGraphemes(
  graphemes: readonly RunGrapheme[],
  measureText: QuireTextLayoutOptions["measureText"],
  shapedData: ReadonlyMap<number, ShapedRunData>
): number {
  let total = 0;
  let segment: RunGrapheme[] = [];
  let segmentFont: string | null = null;

  /** Measures the pending same-font segment before changing its shaping authority. */
  const flush = (): void => {
    if (segmentFont !== null && segment.length > 0) {
      let prefix = "";
      let measuredPrefix = 0;
      for (const grapheme of segment) {
        const before = measuredPrefix;
        prefix += grapheme.text;
        measuredPrefix = readMeasuredAdvance(
          measureText(prefix, segmentFont).width,
          "grapheme segment"
        );
        total += adjustGraphemeAdvance(measuredPrefix - before, grapheme);
      }
    }
    segment = [];
    segmentFont = null;
  };

  for (const grapheme of graphemes) {
    const shaped = shapedAdvanceOf(grapheme, shapedData);
    if (shaped !== undefined) {
      flush();
      total += adjustGraphemeAdvance(shaped, grapheme);
      continue;
    }
    if (segmentFont !== null && (grapheme.font !== segmentFont || grapheme.run !== segment[0]?.run)) {
      flush();
    }
    segmentFont = grapheme.font;
    segment.push(grapheme);
  }
  flush();

  return readMeasuredAdvance(total, "grapheme sequence");
}

/**
 * Adds signed tracking to one grapheme while preserving monotonic widths.
 *
 * @param baseAdvance - Measured or shaped grapheme advance.
 * @param grapheme - Grapheme carrying optional character spacing.
 * @returns Non-negative final advance.
 */
export function adjustGraphemeAdvance(
  baseAdvance: number,
  grapheme: RunGrapheme
): number {
  return Math.max(baseAdvance * (grapheme.horizontalScale ?? 1) + (grapheme.letterSpacing ?? 0), 0);
}

/**
 * Resolves a grapheme's shaped cluster advance, or undefined when its run was not
 * shaped (no shaper). Mirrors `measureGraphemeAdvances`: non-first offsets of a
 * multi-grapheme cluster resolve to 0 so the cluster advance is counted once.
 *
 * @param grapheme - Run-tagged grapheme to resolve.
 * @param shapedData - Per-run shaping data.
 * @returns Shaped advance, or undefined when the run was not shaped.
 */
export function shapedAdvanceOf(
  grapheme: RunGrapheme,
  shapedData: ReadonlyMap<number, ShapedRunData>
): number | undefined {
  const run = shapedData.get(grapheme.run);
  if (run === undefined || !run.shapedAdvances) {
    return undefined;
  }
  return readMeasuredAdvance(
    run.advanceByOffset.get(grapheme.offset) ?? 0,
    "shaped cluster"
  );
}

/**
 * Rejects invalid external measurement data before the wrapping seek loop can
 * turn an unordered `NaN` comparison into unbounded empty rows.
 *
 * @param width - Measured or shaped inline advance.
 * @param source - Human-readable measurement source used in diagnostics.
 * @returns The unchanged valid advance.
 */
export function readMeasuredAdvance(width: number, source: string): number {
  if (!Number.isFinite(width) || width < 0) {
    throw new RangeError(
      `Text ${source} advance must be a non-negative finite number.`
    );
  }
  return width;
}
