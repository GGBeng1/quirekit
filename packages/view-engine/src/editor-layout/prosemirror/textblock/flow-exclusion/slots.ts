import type { QuireRect, QuireTextLineSlot } from "@quirekit/renderer";
import { resolveQuireBlockFlowRowSlots } from "../../../../layout/engine/flow-exclusion";
import type {
  QuireLocalTextblockFlowExclusion,
  QuireTextblockExclusionExpansion
} from "./types";

/**
 * Resolves one row's physical slots through the shared rectangle kernel.
 *
 * @param width - Full paragraph width.
 * @param lineHeight - Nominal row height.
 * @param rowIndex - Zero-based visual row index.
 * @param exclusions - Locally resolved exclusions.
 * @returns Ordered physical slots allowed by rectangle and side policy.
 */
export function resolveQuireTextblockRowSlots(
  width: number,
  lineHeight: number,
  rowIndex: number,
  exclusions: readonly QuireLocalTextblockFlowExclusion[]
): readonly QuireTextLineSlot[] {
  return resolveQuireBlockFlowRowSlots(
    width,
    lineHeight,
    rowIndex,
    exclusions.map((exclusion) => ({
      sourceAnchorId: exclusion.participant.sourceAnchorId,
      objectId: exclusion.participant.objectId,
      rect: exclusion.rect,
      geometry: exclusion.geometry
    }))
  );
}

/**
 * Expands one placement rectangle by logical clearance.
 *
 * @param input - Accepted rectangle and surrounding clearance.
 * @returns Clearance-expanded paragraph-local rectangle.
 */
export function expandQuireTextblockExclusionRect(
  input: QuireTextblockExclusionExpansion
): QuireRect {
  const { rect, clearance } = input;
  return {
    x: rect.x - clearance.inlineStart,
    y: rect.y - clearance.blockStart,
    width: rect.width + clearance.inlineStart + clearance.inlineEnd,
    height: rect.height + clearance.blockStart + clearance.blockEnd
  };
}
