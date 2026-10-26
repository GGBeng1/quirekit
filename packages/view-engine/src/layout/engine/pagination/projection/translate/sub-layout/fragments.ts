import type {
  QuireChildFlowFragment,
  QuireChildFlowPlacement,
  QuireChildFlowResult,
  QuireChildFlowRoot
} from "@quirekit/layout/child-flow";
import type {
  QuireLayoutBoxSubLayoutFragment,
  QuireSubLayoutProjection
} from "../../../../sub-layout";
import type { QuireLayoutBox } from "../../../../types";
import type { QuireLayoutTranslation } from "../../types";
import { translateQuireRect } from "../rect";
import {
  translateQuireSubLayoutDisplayChunks,
  translateQuireSubLayoutQueryProducts
} from "./products";
import { translateQuireTextFragments } from "../text";
import { translateQuireRetainedRegionProducts } from "../region-products";

/** Function used to project retained child source boxes without creating an import cycle. */
export type QuireLayoutBoxProjectionTranslator = (
  box: QuireLayoutBox,
  projection: QuireLayoutTranslation
) => QuireLayoutBox;

/**
 * Translates retained sub-layout fragments with their owning layout box.
 *
 * @param fragments - Retained sub-layout fragments to translate.
 * @param projection - Document-space translation to apply.
 * @param translateBox - Layout-box translator used for explicit View sources.
 * @returns Retained sub-layout fragments in translated document coordinates.
 */
export function translateQuireLayoutBoxSubLayoutFragments(
  fragments: readonly QuireLayoutBoxSubLayoutFragment[],
  projection: QuireLayoutTranslation,
  translateBox: QuireLayoutBoxProjectionTranslator
): readonly QuireLayoutBoxSubLayoutFragment[] {
  if (projection.dx === 0 && projection.dy === 0) {
    return fragments;
  }

  return fragments.map((fragment) => ({
    ...fragment,
    subLayout: translateQuireSubLayoutProjection(
      fragment.subLayout,
      projection,
      translateBox
    )
  }));
}

/**
 * Translates canonical geometry and its View sidecar without merging ownership.
 *
 * @param source - Child-flow geometry and View sidecar to translate.
 * @param projection - Document-space translation to apply.
 * @param translateBox - Layout-box translator used for explicit View sources.
 * @returns Projection whose geometry and View products share translated coordinates.
 */
function translateQuireSubLayoutProjection(
  source: QuireSubLayoutProjection,
  projection: QuireLayoutTranslation,
  translateBox: QuireLayoutBoxProjectionTranslator
): QuireSubLayoutProjection {
  const geometry = translateQuireChildFlowResult(source.geometry, projection);
  const sourceBox = source.view.root.sourceBox;
  const ownership = source.view.root.ownership;
  const translatedOwnership = ownership.status === "resolved"
    && ownership.regionProducts !== undefined
    ? {
        ...ownership,
        regionProducts: translateQuireRetainedRegionProducts(
          ownership.regionProducts,
          projection
        )
      }
    : ownership;

  return {
    geometry,
    view: {
      ...source.view,
      resultId: geometry.id,
      root: {
        ...source.view.root,
        ownership: translatedOwnership,
        ...(sourceBox === undefined
          ? {}
          : { sourceBox: translateBox(sourceBox, projection) })
      },
      fragmentSources: source.view.fragmentSources.map((entry) => ({
        fragmentId: entry.fragmentId,
        sourceBox: translateBox(entry.sourceBox, projection)
      })),
      queryProducts: translateQuireSubLayoutQueryProducts(
        source.view.queryProducts,
        projection
      ),
      displayChunks: translateQuireSubLayoutDisplayChunks(
        source.view.displayChunks,
        projection
      )
    }
  };
}

/**
 * Translates parent-owned geometry while preserving root-local source geometry.
 *
 * @param source - Canonical child-flow geometry to translate.
 * @param projection - Document-space translation to apply.
 * @returns Canonical geometry in translated document coordinates.
 */
function translateQuireChildFlowResult(
  source: QuireChildFlowResult,
  projection: QuireLayoutTranslation
): QuireChildFlowResult {
  return {
    ...source,
    root: translateQuireChildFlowRoot(source.root, projection),
    fragments: source.fragments.map((fragment) =>
      translateQuireChildFlowFragment(fragment, projection)
    ),
    localToResult: {
      x: source.localToResult.x + projection.dx,
      y: source.localToResult.y + projection.dy
    },
    contentClip: translateQuireRect(source.contentClip, projection),
    interactionClip: translateQuireRect(source.interactionClip, projection)
  };
}

/**
 * Translates one child-flow root's parent placement metadata.
 *
 * @param root - Child-flow root to translate.
 * @param projection - Document-space translation to apply.
 * @returns Root with translated parent placement.
 */
function translateQuireChildFlowRoot(
  root: QuireChildFlowRoot,
  projection: QuireLayoutTranslation
): QuireChildFlowRoot {
  return {
    ...root,
    placement: translateQuireChildFlowPlacement(root.placement, projection)
  };
}

/**
 * Translates one child-flow parent placement.
 *
 * @param placement - Parent placement to translate.
 * @param projection - Document-space translation to apply.
 * @returns Placement in translated document coordinates.
 */
function translateQuireChildFlowPlacement(
  placement: QuireChildFlowPlacement,
  projection: QuireLayoutTranslation
): QuireChildFlowPlacement {
  return {
    ...placement,
    rect: translateQuireRect(placement.rect, projection),
    contentRect: translateQuireRect(placement.contentRect, projection),
    ...(placement.clipRect === undefined
      ? {}
      : { clipRect: translateQuireRect(placement.clipRect, projection) })
  };
}

/**
 * Translates one accepted fragment while preserving its root-local rectangle.
 *
 * @param fragment - Canonical child fragment to translate.
 * @param projection - Document-space translation to apply.
 * @returns Canonical fragment in translated result coordinates.
 */
function translateQuireChildFlowFragment(
  fragment: QuireChildFlowFragment,
  projection: QuireLayoutTranslation
): QuireChildFlowFragment {
  return {
    ...fragment,
    rect: translateQuireRect(fragment.rect, projection),
    ...(fragment.clipRect === undefined
      ? {}
      : { clipRect: translateQuireRect(fragment.clipRect, projection) }),
    ...(fragment.textFragments === undefined
      ? {}
      : {
          textFragments: translateQuireTextFragments(
            fragment.textFragments,
            projection
          )
        })
  };
}
