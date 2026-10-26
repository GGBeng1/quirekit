import type { QuireBlockLayoutInput } from "../engine/block-types";
import type { QuireLayoutBox } from "../engine/types";
import { translateQuireLayoutBox, translateQuireRect } from "../engine/pagination/projection/translate";
import { shiftCanvasLeafBlockLayoutBox } from "../cache/block/layout-shift";
import type { QuireRetainedBlockOriginalPlacement } from "./types";

/** Exact build products retained only while their immutable local boxes live. */
const originalPlacements = new WeakMap<QuireLayoutBox, QuireRetainedBlockOriginalPlacement>();

/**
 * Normalizes a completed document placement while retaining its exact origin.
 *
 * Projection returns the original box while the record keeps its origin, so
 * the local subtree is translated only when a moved origin first reads it.
 * The local rectangle is eager because the record's height comes from it.
 *
 * @param box - Complete result from the current block builder.
 * @param x - Document X origin used by the builder.
 * @param y - Document Y origin used by the builder.
 * @returns Local geometry for future indexed placement.
 */
export function normalizeQuireRetainedBlockLayout(
  box: QuireLayoutBox,
  x: number,
  y: number
): QuireLayoutBox {
  const local = x === 0 && y === 0 ? box : createLazyLocalBox(box, x, y);
  originalPlacements.set(local, { box, x, y });
  return local;
}

/**
 * Creates a local view whose fields translate the complete subtree on first read.
 *
 * Exposes exactly the own enumerable fields an eager translation would copy.
 *
 * @param box - Complete absolute result.
 * @param x - Document X origin removed from the result.
 * @param y - Document Y origin removed from the result.
 * @returns Local box with the eager translation's field values.
 */
function createLazyLocalBox(box: QuireLayoutBox, x: number, y: number): QuireLayoutBox {
  let translated: QuireLayoutBox | undefined;
  const local = {} as Record<PropertyKey, unknown>;
  for (const key of Reflect.ownKeys(box)) {
    if (!Object.prototype.propertyIsEnumerable.call(box, key)) continue;
    Object.defineProperty(local, key, {
      configurable: true,
      enumerable: true,
      get: () => (translated ??= translateQuireLayoutBox(box, { dx: -x, dy: -y }))[key as keyof QuireLayoutBox]
    });
  }
  Object.defineProperty(local, "rect", {
    configurable: true,
    enumerable: true,
    value: translateQuireRect(box.rect, { dx: -x, dy: -y })
  });
  return local as unknown as QuireLayoutBox;
}

/**
 * Projects one retained local block into the current document flow.
 *
 * Leaf records may also remap document ranges after an edit above them.
 * Structured records are reused only when their ranges remain exact because
 * nested source identity must never be guessed.
 *
 * @param localBox - Retained layout box measured from local origin.
 * @param retainedInput - Input that produced the retained box.
 * @param currentInput - Current block input being projected.
 * @param x - Current absolute horizontal origin.
 * @param y - Current absolute vertical origin.
 * @returns Projected box, or undefined when safe range remapping is unavailable.
 */
export function projectQuireRetainedBlockLayout(
  localBox: QuireLayoutBox,
  retainedInput: QuireBlockLayoutInput,
  currentInput: QuireBlockLayoutInput,
  x: number,
  y: number
): QuireLayoutBox | undefined {
  const rangeDelta = currentInput.range.from - retainedInput.range.from;
  const sameRangeLength =
    currentInput.range.to - currentInput.range.from ===
    retainedInput.range.to - retainedInput.range.from;

  if (!sameRangeLength) return undefined;
  // The height index remains the placement authority. Only its exact original
  // origin can reuse the completed tree; moved blocks still translate fully.
  const original = originalPlacements.get(localBox);
  const positioned = original !== undefined && original.x === x && original.y === y
    ? original.box
    : translateQuireLayoutBox(localBox, { dx: x, dy: y });

  if (rangeDelta !== 0) {
    return shiftCanvasLeafBlockLayoutBox(positioned, currentInput, 0, rangeDelta);
  }

  return positioned;
}
