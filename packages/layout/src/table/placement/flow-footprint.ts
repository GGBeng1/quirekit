import type {
  QuireTableFloatingFlowFootprint,
  QuireTableFloatingFlowFootprintInput
} from "./types";

const floatingInlineObstructionEpsilon = 0.5;

/** Shared zero-footprint result for non-sequential floating tables. */
const noFloatingFlowFootprint: QuireTableFloatingFlowFootprint = {
  kind: "none",
  height: 0
};

/**
 * Derives the sequential block footprint of one floating table.
 *
 * Only text-anchored tables whose clearance-expanded width obstructs the
 * complete containing inline extent are admitted. Narrower tables retain their
 * out-of-flow behavior until the page-local line-slot wrapping phase exists.
 *
 * @param input - Placement, measured visual extent, and containing inline size.
 * @returns Zero footprint or a block footprint ending at the visual clearance bottom.
 */
export function resolveQuireTableFloatingFlowFootprint(
  input: QuireTableFloatingFlowFootprintInput
): QuireTableFloatingFlowFootprint {
  if (
    input.placement.vertical.reference !== "text" ||
    !doesFloatingTableObstructCompleteInlineFlow(input)
  ) {
    return noFloatingFlowFootprint;
  }

  const offset = normalizeFiniteLength(input.placement.vertical.offset ?? 0);
  const tableHeight = normalizeNonNegativeLength(input.tableHeight);
  const bottomClearance = normalizeNonNegativeLength(
    input.placement.clearances.bottom
  );

  return {
    kind: "block",
    height: Math.max(0, offset + tableHeight + bottomClearance)
  };
}

/**
 * Reports whether a floating table leaves no horizontal body slot beside it.
 *
 * @param input - Placement, table width, and containing inline size.
 * @returns Whether the clearance-expanded table covers the complete inline extent.
 */
function doesFloatingTableObstructCompleteInlineFlow(
  input: QuireTableFloatingFlowFootprintInput
): boolean {
  const containingInlineSize = normalizeNonNegativeLength(
    input.containingInlineSize
  );
  if (containingInlineSize <= 0) {
    return false;
  }

  const exclusionWidth = normalizeNonNegativeLength(input.tableWidth)
    + normalizeNonNegativeLength(input.placement.clearances.left)
    + normalizeNonNegativeLength(input.placement.clearances.right);

  return exclusionWidth >= containingInlineSize - floatingInlineObstructionEpsilon;
}

/**
 * Normalizes one derived extent to the non-negative layout domain.
 *
 * @param value - Candidate layout length.
 * @returns Finite non-negative length.
 */
function normalizeNonNegativeLength(value: number): number {
  return Math.max(0, normalizeFiniteLength(value));
}

/**
 * Normalizes one candidate layout length without changing its sign.
 *
 * @param value - Candidate layout length.
 * @returns Finite length, or zero for invalid input.
 */
function normalizeFiniteLength(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
