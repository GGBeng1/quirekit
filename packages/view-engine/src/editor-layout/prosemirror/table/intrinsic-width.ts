import { segmentQuireTextGraphemes } from "@quirekit/layout/text";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireTableCellInlineMetrics } from "@quirekit/layout/table";
import type { QuireBlockLayoutInput } from "../../../layout/engine/block-types";
import { describeQuireLineBreakSegment } from "@quirekit/layout/inline";

/**
 * Measures intrinsic inline sizes from canonical logical text runs.
 *
 * @param children - Recursive cell block inputs carrying logical inline runs.
 * @param textMeasurer - Active shared text measurement authority.
 * @returns Minimum and maximum content widths for the semantic cell.
 */
export function measureQuireTableCellInlineMetrics(
  children: readonly QuireBlockLayoutInput[],
  textMeasurer: QuireTextMeasurer
): QuireTableCellInlineMetrics {
  let minContentWidth = 0;
  let maxContentWidth = 0;

  for (const child of children) {
    const measured = measureBlockInlineMetrics(child, textMeasurer);
    minContentWidth = Math.max(minContentWidth, measured.minContentWidth);
    maxContentWidth = Math.max(maxContentWidth, measured.maxContentWidth);
  }

  return { minContentWidth, maxContentWidth };
}

/**
 * Measures one block and its nested child flow before physical tracks exist.
 *
 * @param block - Block input to inspect.
 * @param textMeasurer - Active shared text measurement authority.
 * @returns Intrinsic sizes contributed by the block subtree.
 */
function measureBlockInlineMetrics(
  block: QuireBlockLayoutInput,
  textMeasurer: QuireTextMeasurer
): QuireTableCellInlineMetrics {
  let minContentWidth = 0;
  let maxContentWidth = 0;
  let unbreakableWidth = 0;
  let lineWidth = 0;

  for (const run of block.textRuns ?? []) {
    for (const segment of segmentQuireTextGraphemes(run.text)) {
      const breakInfo = describeQuireLineBreakSegment(segment);
      if (breakInfo.kind === "hardBreak") {
        minContentWidth = Math.max(minContentWidth, unbreakableWidth);
        maxContentWidth = Math.max(maxContentWidth, lineWidth);
        unbreakableWidth = 0;
        lineWidth = 0;
        continue;
      }

      const width = textMeasurer.measureText(segment, run.font).width;
      lineWidth += width;
      if (breakInfo.kind === "space" && !breakInfo.nonBreakingGlue) {
        minContentWidth = Math.max(minContentWidth, unbreakableWidth);
        unbreakableWidth = 0;
      } else if (breakInfo.kind === "grapheme") {
        minContentWidth = Math.max(minContentWidth, unbreakableWidth, width);
        unbreakableWidth = 0;
      } else {
        unbreakableWidth += width;
        if (breakInfo.breakAfter) {
          minContentWidth = Math.max(minContentWidth, unbreakableWidth);
          unbreakableWidth = 0;
        }
      }
    }
  }

  minContentWidth = Math.max(minContentWidth, unbreakableWidth);
  maxContentWidth = Math.max(maxContentWidth, lineWidth);
  for (const child of block.children ?? []) {
    const measured = measureBlockInlineMetrics(child, textMeasurer);
    minContentWidth = Math.max(minContentWidth, measured.minContentWidth);
    maxContentWidth = Math.max(maxContentWidth, measured.maxContentWidth);
  }

  return { minContentWidth, maxContentWidth };
}
