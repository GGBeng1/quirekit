import type { QuireLayoutBox } from "../engine/types";
import type { QuireBlockLayoutInput } from "../engine/block-types";
import type { QuireRetainedBlockLayoutRecord } from "./types";
import type { QuireLayoutHeightIndexEntry } from "./height-index";
import {
  resolveQuireBlockFlowAdditionalBefore,
  resolveQuireBlockFlowDistance,
  resolveQuireBlockFlowLeadingDistance,
  resolveQuireBlockFlowTrailingDistance
} from "@quirekit/layout/block-flow";

/**
 * Resolves leading flow spacing before the first retained block.
 *
 * @param inputs - Current top-level block inputs.
 * @returns Non-negative leading inset.
 */
export function resolveQuireRetainedFlowLeadingSpacing(
  inputs: readonly QuireBlockLayoutInput[]
): number {
  return resolveQuireBlockFlowLeadingDistance(inputs[0]);
}

/**
 * Creates indexed flow extents from retained intrinsic heights and spacing.
 *
 * Each extent reaches from one block top to the next block top. The final
 * extent ends after the last block's trailing spacing and owns no sibling gap.
 *
 * @param records - Current retained records in document order.
 * @param inputs - Current block inputs matching the records.
 * @param blockGap - Gap inserted between sibling blocks.
 * @returns Stable-id height-index entries.
 */
export function createQuireRetainedFlowHeightEntries(
  records: readonly QuireRetainedBlockLayoutRecord[],
  inputs: readonly QuireBlockLayoutInput[],
  blockGap: number
): readonly QuireLayoutHeightIndexEntry[] {
  return records.map((record, index) => ({
    id: record.id,
    extent:
      record.intrinsicHeight +
      resolveQuireBlockFlowTrailingDistance(inputs[index]!) +
      (index + 1 < records.length
        ? blockGap + resolveQuireBlockFlowAdditionalBefore(
            inputs[index + 1]!,
            inputs[index]
          )
        : 0)
  }));
}

/**
 * Resolves the visual height owned by one projected block box.
 *
 * @param input - Current block input.
 * @param nextInput - Following input whose leading spacing belongs to this box.
 * @returns Extra height beyond intrinsic block geometry.
 */
export function resolveQuireRetainedProjectedExtraHeight(
  input: QuireBlockLayoutInput,
  nextInput: QuireBlockLayoutInput | undefined
): number {
  return resolveQuireBlockFlowTrailingDistance(input) +
    (nextInput === undefined
      ? 0
      : resolveQuireBlockFlowAdditionalBefore(nextInput, input));
}

/**
 * Extends one projected box without moving its content.
 *
 * @param box - Box to extend.
 * @param extraHeight - Additional flow height.
 * @returns Extended layout box.
 */
export function extendQuireRetainedBlockHeight(
  box: QuireLayoutBox,
  extraHeight: number
): QuireLayoutBox {
  return {
    ...box,
    rect: { ...box.rect, height: box.rect.height + extraHeight }
  };
}

/**
 * Counts records absent from the next atomic graph state.
 *
 * @param previous - Previously committed records.
 * @param next - Next records waiting to commit.
 * @returns Number of removed records.
 */
export function countRemovedQuireRetainedBlocks(
  previous: ReadonlyMap<string, QuireRetainedBlockLayoutRecord>,
  next: ReadonlyMap<string, QuireRetainedBlockLayoutRecord>
): number {
  let removed = 0;
  for (const id of previous.keys()) {
    if (!next.has(id)) {
      removed += 1;
    }
  }
  return removed;
}
