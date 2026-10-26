import type { QuireLayoutBox } from "../../types";
import { readQuireSubLayoutFragments } from "../../sub-layout";

/**
 * Reads recursive child layout boxes from a container-like layout box.
 *
 * @param box - Layout box to inspect.
 * @returns Child layout boxes, or an empty list for leaf boxes.
 */
export function readQuireLayoutBoxChildren(
  box: QuireLayoutBox
): readonly QuireLayoutBox[] {
  const candidate = box as unknown as { readonly children?: unknown };
  const direct = Array.isArray(candidate.children)
    ? candidate.children as readonly QuireLayoutBox[]
    : [];

  if (direct.length > 0) {
    return direct;
  }

  return readQuireSubLayoutFragments(box).flatMap((fragment) =>
    fragment.subLayout.view.fragmentSources.map((source) => source.sourceBox)
  );
}
