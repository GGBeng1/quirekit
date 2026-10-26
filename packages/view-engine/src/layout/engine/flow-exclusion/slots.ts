import { subtractQuireInlineExclusionGeometries } from "@quirekit/layout/inline";
import type { QuireTextLineSlot } from "@quirekit/renderer";
import type { QuireBlockFlowExclusion } from "../block-types";

/**
 * Resolves one visual row's physical slots through the shared exclusion kernel.
 *
 * @param width - Full flow-scope inline width.
 * @param lineHeight - Nominal visual row height.
 * @param rowIndex - Zero-based row index inside the current textblock.
 * @param exclusions - Textblock-local exclusions intersecting this flow scope.
 * @returns Ordered physical slots allowed by every active geometry and side policy.
 */
export function resolveQuireBlockFlowRowSlots(
  width: number,
  lineHeight: number,
  rowIndex: number,
  exclusions: readonly QuireBlockFlowExclusion[]
): readonly QuireTextLineSlot[] {
  const line = { x: 0, y: rowIndex * lineHeight, width, height: lineHeight };
  const active = exclusions.filter((exclusion) =>
    exclusion.rect.y < line.y + line.height
    && exclusion.rect.y + exclusion.rect.height > line.y
  );
  const subtraction = subtractQuireInlineExclusionGeometries(
    line,
    active.map((exclusion) => exclusion.geometry)
  );

  return subtraction.intervals.map((interval) => ({
    x: interval.from,
    width: interval.to - interval.from
  }));
}

/**
 * Creates the exact geometry signature for a sequence of physical row slots.
 *
 * @param lineSlots - Ordered slots for every materialized visual row.
 * @returns Stable signature suitable for text-shape and retained-block caches.
 */
export function createQuireBlockFlowSlotSignature(
  lineSlots: readonly (readonly QuireTextLineSlot[])[]
): string {
  return lineSlots.map((slots) => slots
    .map((slot) => `${slot.x}:${slot.width}`)
    .join(","))
    .join(";");
}
