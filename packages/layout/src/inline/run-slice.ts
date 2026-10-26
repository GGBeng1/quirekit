import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireInlineTextRun } from "./types";

/**
 * Slices logical inline runs to a document range.
 *
 * @param runs - Logical source runs in document order.
 * @param range - Document range that should remain visible to local reflow.
 * @returns Source runs clipped to the requested document range.
 */
export function sliceQuireInlineTextRunsToRange(
  runs: readonly QuireInlineTextRun[],
  range: QuireDocumentRange
): readonly QuireInlineTextRun[] {
  const slicedRuns: QuireInlineTextRun[] = [];

  for (const run of runs) {
    const from = Math.max(run.range.from, range.from);
    const to = Math.min(run.range.to, range.to);

    if (to <= from) {
      continue;
    }

    const textFrom = Math.max(0, from - run.range.from);
    const textTo = Math.min(run.text.length, to - run.range.from);

    if (textTo <= textFrom) {
      continue;
    }

    slicedRuns.push({
      ...run,
      text: run.text.slice(textFrom, textTo),
      range: { from, to }
    });
  }

  return slicedRuns;
}
