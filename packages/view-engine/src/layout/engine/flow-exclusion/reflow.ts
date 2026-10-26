import type { QuireRect } from "@quirekit/renderer";
import { translateQuireInlineExclusionGeometry } from "@quirekit/layout/inline";
import type {
  QuireBlockFlowExclusion,
  QuireBlockLayoutInput
} from "../block-types";
import {
  createQuireBlockFlowSlotSignature,
  resolveQuireBlockFlowRowSlots
} from "./slots";

/** One accepted exclusion translated into the current sibling-flow scope. */
export interface QuireActiveBlockFlowExclusion extends QuireBlockFlowExclusion {
  /** Clearance-expanded rectangle in the sibling container's local coordinates. */
  readonly rect: QuireRect;
}

/**
 * Projects exclusions owned by one textblock into sibling-flow coordinates.
 *
 * @param exclusions - Textblock-local accepted exclusions.
 * @param blockY - Current textblock origin inside the sibling flow.
 * @param fragmentBlockSize - Optional page/body fragment extent.
 * @returns Active exclusions clipped to their owning fragment occurrence.
 */
export function createOwnedActiveExclusions(
  exclusions: readonly QuireBlockFlowExclusion[],
  blockY: number,
  fragmentBlockSize: number | undefined
): readonly QuireActiveBlockFlowExclusion[] {
  return exclusions.flatMap((exclusion) => {
    const rect = {
      ...exclusion.rect,
      y: exclusion.rect.y + blockY
    };
    const clipped = clipExclusionToFragment(
      rect,
      blockY,
      fragmentBlockSize
    );

    return clipped.height <= 0 ? [] : [{
      ...exclusion,
      rect: clipped,
      geometry: translateQuireInlineExclusionGeometry(
        exclusion.geometry,
        0,
        blockY
      )
    }];
  });
}

/**
 * Reshapes one input when active exclusions remove space from any of its rows.
 *
 * @param input - Current source block input.
 * @param activeExclusions - Accepted exclusions in sibling-flow coordinates.
 * @param blockY - Current textblock origin inside the sibling flow.
 * @param width - Shared inline extent of the flow scope.
 * @returns Original input or a reflowed clone with an exact cache signature.
 */
export function reflowInputAgainstActiveExclusions(
  input: QuireBlockLayoutInput,
  activeExclusions: readonly QuireActiveBlockFlowExclusion[],
  blockY: number,
  width: number
): QuireBlockLayoutInput {
  const reflow = input.textFlowReflow;
  if (reflow === undefined || activeExclusions.length === 0) {
    return input;
  }

  const localExclusions = activeExclusions.flatMap((exclusion) => {
    const rect = { ...exclusion.rect, y: exclusion.rect.y - blockY };
    return rect.y + rect.height <= 0 ? [] : [{
      ...exclusion,
      rect,
      geometry: translateQuireInlineExclusionGeometry(
        exclusion.geometry,
        0,
        -blockY
      )
    }];
  });
  if (localExclusions.length === 0) {
    return input;
  }

  const lastRow = Math.max(
    0,
    ...localExclusions.map((exclusion) =>
      Math.ceil((exclusion.rect.y + exclusion.rect.height) / reflow.lineHeight) - 1
    )
  );
  const lineSlots = Array.from({ length: lastRow + 1 }, (_, rowIndex) =>
    resolveQuireBlockFlowRowSlots(
      width,
      reflow.lineHeight,
      rowIndex,
      localExclusions
    )
  );
  if (!hasConstrainedFlowSlot(lineSlots, width)) {
    return input;
  }

  const slotSignature = createQuireBlockFlowSlotSignature(lineSlots);
  const result = reflow.reflow(lineSlots, slotSignature);

  return {
    ...input,
    textFragments: result.textFragments,
    localFlowExclusions: result.localFlowExclusions,
    layoutSignature: `${input.layoutSignature ?? input.id}\u0000flow-scope:${slotSignature}`
  };
}

/**
 * Reports whether any row differs from the ordinary full-width slot.
 *
 * @param lineSlots - Materialized physical slots.
 * @param width - Full flow-scope inline extent.
 * @returns Whether reflow can change fragment placement.
 */
function hasConstrainedFlowSlot(
  lineSlots: readonly (readonly { readonly x: number; readonly width: number }[])[],
  width: number
): boolean {
  return lineSlots.some((slots) =>
    slots.length !== 1 || slots[0]?.x !== 0 || slots[0]?.width !== width
  );
}

/**
 * Clips one active exclusion to the page/body fragment containing its origin.
 *
 * @param rect - Sibling-flow exclusion rectangle.
 * @param ownerBlockY - Sibling-flow origin of the anchor-owning block.
 * @param fragmentBlockSize - Optional fragment extent.
 * @returns Rectangle that cannot remove space from the next fragment occurrence.
 */
function clipExclusionToFragment(
  rect: QuireRect,
  ownerBlockY: number,
  fragmentBlockSize: number | undefined
): QuireRect {
  if (fragmentBlockSize === undefined || fragmentBlockSize <= 0) {
    return rect;
  }

  const fragmentIndex = Math.max(0, Math.floor(ownerBlockY / fragmentBlockSize));
  const fragmentStart = fragmentIndex * fragmentBlockSize;
  const fragmentEnd = (fragmentIndex + 1) * fragmentBlockSize;
  const clippedStart = Math.max(rect.y, fragmentStart);
  const clippedEnd = Math.min(rect.y + rect.height, fragmentEnd);
  return {
    ...rect,
    y: clippedStart,
    height: Math.max(0, clippedEnd - clippedStart)
  };
}

/**
 * Measures the block extent used by the canonical neutral flow pass.
 *
 * @param input - Exact or estimated block input.
 * @returns Non-negative local block extent.
 */
export function resolveBlockInputExtent(input: QuireBlockLayoutInput): number {
  const textExtent = input.textFragments?.reduce(
    (extent, fragment) => Math.max(extent, fragment.rect.y + fragment.lineHeight),
    0
  ) ?? 0;

  return Math.max(0, input.minHeight ?? 0, textExtent);
}
