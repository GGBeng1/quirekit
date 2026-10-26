import type { QuireRect } from "@quirekit/renderer";
import {
  mergeQuireRetainedRegionProductSets,
  type QuireRetainedRegionProducts
} from "../../../region-products";
import type { QuireLayoutBox } from "../../types";
import { readQuireSubLayoutFragments } from "./fragments";

/**
 * Collects canonical retained products from visible nested-flow roots.
 *
 * Provider declarations are compiled before pagination. Snapshot adaptation
 * only gathers those owner-local products; it must not recreate declarations
 * or invent visual-instance identity after the layout authority has run.
 *
 * @param box - Layout box that may retain nested-flow fragments.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param intersectsClip - Predicate for filtering document-space rectangles.
 * @returns Merged products from visible nested-flow roots, when any.
 */
export function collectQuireSubLayoutRegionProductsForSnapshot(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  intersectsClip: (
    rect: QuireRect,
    clipRects: readonly QuireRect[] | undefined
  ) => boolean
): QuireRetainedRegionProducts | undefined {
  return mergeQuireRetainedRegionProductSets(
    readQuireSubLayoutFragments(box)
      .map((fragment) => fragment.subLayout)
      .filter((projection) =>
        intersectsClip(projection.geometry.interactionClip, snapshotClipRects)
      )
      .map((projection) => projection.view.root.ownership)
      .map((ownership) => ownership.status === "resolved"
        ? ownership.regionProducts
        : undefined)
  );
}
