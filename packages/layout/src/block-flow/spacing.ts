import type { QuireBlockFlowInput } from "./types";

/**
 * Resolves one optional block-flow distance to a finite non-negative extent.
 *
 * @param value - Candidate CSS-pixel distance.
 * @returns Finite non-negative distance.
 */
export function resolveQuireBlockFlowDistance(
  value: number | undefined
): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

/**
 * Resolves the leading distance before the first block's intrinsic content.
 *
 * @param input - First block input in one flow scope.
 * @returns Collapsible before spacing plus its non-collapsing start inset.
 */
export function resolveQuireBlockFlowLeadingDistance(
  input: QuireBlockFlowInput | undefined
): number {
  if (input === undefined) return 0;
  return resolveQuireBlockFlowDistance(input.spacingBefore)
    + resolveQuireBlockFlowDistance(input.blockStartInset);
}

/**
 * Resolves the additional distance inserted immediately before one block.
 *
 * Adjacent before/after spacing collapses to the larger value. Block-edge
 * insets remain additive so borders and other owned geometry cannot disappear
 * into paragraph spacing.
 *
 * @param input - Current block input.
 * @param previous - Previous sibling input, when one exists.
 * @returns Distance not already contributed by the previous block.
 */
export function resolveQuireBlockFlowAdditionalBefore(
  input: QuireBlockFlowInput,
  previous: QuireBlockFlowInput | undefined
): number {
  const startInset = resolveQuireBlockFlowDistance(input.blockStartInset);
  const before = resolveQuireBlockFlowDistance(input.spacingBefore);
  if (previous === undefined) return startInset + before;
  const previousAfter = resolveQuireBlockFlowDistance(previous.spacingAfter);
  return startInset + Math.max(0, before - previousAfter);
}

/**
 * Resolves the trailing distance owned after one block's intrinsic content.
 *
 * @param input - Current block input.
 * @returns Non-collapsing end inset plus collapsible after spacing.
 */
export function resolveQuireBlockFlowTrailingDistance(
  input: QuireBlockFlowInput
): number {
  return resolveQuireBlockFlowDistance(input.blockEndInset)
    + resolveQuireBlockFlowDistance(input.spacingAfter);
}
