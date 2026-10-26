import type { QuireTextBaseDirection } from "./bidi";
import type { QuireTextLineSlot } from "./types";

/**
 * Creates the fixed-width single-slot specialization beyond declared rows.
 *
 * @param maxWidth - Fixed text width.
 * @returns One slot starting at the local inline origin.
 */
function createDefaultLineSlots(maxWidth: number): readonly QuireTextLineSlot[] {
  return [{ x: 0, width: maxWidth }];
}

/**
 * Resolves and validates one visual row's slots in logical inline progression.
 *
 * @param lineIndex - Zero-based visual row index.
 * @param maxWidth - Fixed-width fallback used after explicitly declared rows.
 * @param declaredRows - Optional leading row slot declarations.
 * @param baseDirection - Paragraph base direction controlling slot consumption.
 * @returns Valid slots ordered in logical inline progression.
 */
export function resolveQuireTextLineSlots(
  lineIndex: number,
  maxWidth: number,
  declaredRows: readonly (readonly QuireTextLineSlot[])[] | undefined,
  baseDirection: QuireTextBaseDirection | undefined
): readonly QuireTextLineSlot[] {
  const declared = declaredRows?.[lineIndex];
  if (declared === undefined) {
    return createDefaultLineSlots(maxWidth);
  }

  const slots = declared.map((slot) => validateQuireTextLineSlot(slot, lineIndex));
  slots.sort((left, right) => left.x - right.x);
  validateQuireTextLineSlotSeparation(slots, lineIndex);
  return baseDirection === "rtl" ? slots.reverse() : slots;
}

/**
 * Rejects overlapping slots so callers cannot create ambiguous inline space.
 *
 * Touching slots remain valid because the wrapping authority may intentionally
 * preserve a region boundary even when no excluded gap separates the regions.
 *
 * @param slots - Slots ordered by physical x coordinate.
 * @param lineIndex - Owning visual row used in diagnostics.
 */
function validateQuireTextLineSlotSeparation(
  slots: readonly QuireTextLineSlot[],
  lineIndex: number
): void {
  for (let index = 1; index < slots.length; index += 1) {
    const previous = slots[index - 1]!;
    const current = slots[index]!;
    if (current.x < previous.x + previous.width) {
      throw new RangeError(
        `Text line slots on row ${lineIndex} must not overlap.`
      );
    }
  }
}

/**
 * Validates a caller-provided slot without normalizing invalid geometry.
 *
 * @param slot - Slot declaration to validate.
 * @param lineIndex - Owning visual row used in diagnostics.
 * @returns The unchanged valid slot.
 */
function validateQuireTextLineSlot(
  slot: QuireTextLineSlot,
  lineIndex: number
): QuireTextLineSlot {
  if (!Number.isFinite(slot.x)
    || !Number.isFinite(slot.width)
    || slot.width <= 0) {
    throw new RangeError(
      `Text line slot on row ${lineIndex} must have finite x and positive width.`
    );
  }
  return slot;
}
