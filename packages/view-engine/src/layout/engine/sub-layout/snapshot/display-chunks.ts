import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../types";
import type { QuireSubLayoutDisplayChunkReference } from "../types";
import { readQuireSubLayoutFragments } from "./fragments";

/**
 * Adapts retained sub-layout display chunk references onto a snapshot node.
 *
 * @param box - Engine layout box that may retain sub-layout fragments.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param intersectsClip - Predicate for filtering document-space rectangles.
 * @returns Retained display chunk references, or undefined when none are visible.
 */
export function adaptQuireSubLayoutDisplayChunksForSnapshot(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  intersectsClip: (rect: QuireRect, clipRects: readonly QuireRect[] | undefined) => boolean
): readonly QuireSubLayoutDisplayChunkReference[] | undefined {
  const chunks = readQuireSubLayoutFragments(box)
    .flatMap((fragment) => fragment.subLayout.view.displayChunks)
    .filter((chunk) => intersectsClip(chunk.rect, snapshotClipRects));

  return chunks.length === 0 ? undefined : chunks;
}
