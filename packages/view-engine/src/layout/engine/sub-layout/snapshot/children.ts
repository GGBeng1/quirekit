import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../types";
import { readQuireSubLayoutFragments } from "./fragments";

/**
 * Reads page-local source boxes retained by sub-layout child fragments.
 *
 * @param box - Engine layout box that may retain sub-layout fragments.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param intersectsClip - Predicate for filtering document-space rectangles.
 * @returns Retained child source boxes visible in the snapshot window.
 */
export function readQuireSubLayoutSourceBoxesForSnapshot(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  intersectsClip: (rect: QuireRect, clipRects: readonly QuireRect[] | undefined) => boolean
): readonly QuireLayoutBox[] {
  const fragments = readQuireSubLayoutFragments(box);
  if (fragments.length === 0) {
    return [];
  }

  const sourceBoxes: QuireLayoutBox[] = [];

  for (const fragment of fragments) {
    for (const source of fragment.subLayout.view.fragmentSources) {
      const sourceBox = source.sourceBox;
      if (intersectsClip(sourceBox.rect, snapshotClipRects)) {
        sourceBoxes.push(sourceBox);
      }
    }
  }

  return sourceBoxes;
}
