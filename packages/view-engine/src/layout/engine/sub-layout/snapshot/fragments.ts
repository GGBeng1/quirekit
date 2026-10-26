import type { QuireLayoutBox } from "../../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../types";

/**
 * Reads retained sub-layout fragments from a layout box.
 *
 * @param box - Layout box that may carry retained sub-layout fragments.
 * @returns Retained fragments in page-local source order.
 */
export function readQuireSubLayoutFragments(
  box: Pick<QuireLayoutBox, "subLayoutFragments">
): readonly QuireLayoutBoxSubLayoutFragment[] {
  return box.subLayoutFragments ?? [];
}
