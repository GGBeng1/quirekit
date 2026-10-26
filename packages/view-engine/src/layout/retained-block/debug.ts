import type { QuireLayoutHeightIndex } from "./height-index";
import { resolveQuireRetainedProjectedExtraHeight } from "./flow";
import type {
  QuireRetainedBlockLayoutRecord,
  QuireRetainedBlockReconcileOptions
} from "./types";

/**
 * Compares indexed flow queries with an independent linear full-flow baseline.
 *
 * @param records - Current retained records.
 * @param options - Current reconciliation inputs.
 * @param leadingSpacing - Leading inset before the first block.
 * @param heightIndex - Candidate index used by production projection.
 * @param indexedTotalHeight - Total height reported by the candidate index.
 * @returns Nothing.
 */
export function compareQuireRetainedFullFlow(
  records: readonly QuireRetainedBlockLayoutRecord[],
  options: QuireRetainedBlockReconcileOptions,
  leadingSpacing: number,
  heightIndex: QuireLayoutHeightIndex,
  indexedTotalHeight: number
): void {
  let linearTop = 0;
  for (let index = 0; index < records.length; index += 1) {
    const indexedTop = heightIndex.blockTop(index);
    if (indexedTop !== linearTop) {
      throw new Error(
        `Retained height-index mismatch at ${index}: ${indexedTop} !== ${linearTop}.`
      );
    }
    const input = options.children[index]!;
    linearTop += records[index]!.intrinsicHeight +
      resolveQuireRetainedProjectedExtraHeight(
        input,
        options.children[index + 1]
      ) +
      (index + 1 < records.length
        ? options.blockGap
        : 0);
  }
  const linearTotalHeight = leadingSpacing + linearTop;
  if (indexedTotalHeight !== linearTotalHeight) {
    throw new Error(
      `Retained height-index total mismatch: ${indexedTotalHeight} !== ${linearTotalHeight}.`
    );
  }
}
