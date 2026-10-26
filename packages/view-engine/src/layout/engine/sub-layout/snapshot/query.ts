import { intersectQuireRects, type QuireRect } from "@quirekit/renderer";
import type { QuireHitTarget, QuireLayoutBox } from "../../types";
import {
  normalizeQuireViewInteractionHitLayerFacts,
  resolveQuireViewLayerTargetFacts
} from "../../../../view-graph";
import { createQuireSubLayoutQueryProductOwner } from "../owner";
import { getQuireSubLayoutTextOccurrenceKey } from "../text-identity";
import { clipQuireSubLayoutTextLine } from "../text-line-clip";
import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutInputAnchor,
  QuireSubLayoutProjection,
  QuireSubLayoutQueryProducts,
  QuireSubLayoutSelectionRect
} from "../types";
import { readQuireSubLayoutFragments } from "./fragments";

/**
 * Adapts retained sub-layout query products onto the mounted snapshot node.
 *
 * @param box - Engine layout box that may retain sub-layout fragments.
 * @param snapshotClipRects - Active snapshot clip rectangles, or undefined.
 * @param intersectsClip - Predicate for filtering document-space rectangles.
 * @returns Aggregated query products, or undefined when none are retained.
 */
export function adaptQuireSubLayoutQueryProductsForSnapshot(
  box: QuireLayoutBox,
  snapshotClipRects: readonly QuireRect[] | undefined,
  intersectsClip: (rect: QuireRect, clipRects: readonly QuireRect[] | undefined) => boolean
): QuireSubLayoutQueryProducts | undefined {
  const fragments = readQuireSubLayoutFragments(box);

  if (fragments.length === 0) {
    return undefined;
  }

  // Select line fragments first so viewport clipping cannot retain a visible
  // line while removing its shorter run caret rectangles or horizontal endpoints.
  const visibleFragments = fragments.map((fragment) => {
    const projection = fragment.subLayout;
    const selectionRects = projection.view.queryProducts.selectionRects.flatMap((product) => {
      const rect = clipQuireSubLayoutTextLine(product.rect, projection.geometry.interactionClip);
      return rect === null ? [] : [{ ...product, rect }];
    }).filter(
      (rect) => intersectsClip(rect.rect, snapshotClipRects)
        || (rect.rect.width === 0 && snapshotClipRects?.some((clip) =>
          clipQuireSubLayoutTextLine(rect.rect, clip) !== null
        ) === true)
    );
    return {
      projection,
      selectionRects,
      textOccurrenceKeys: new Set(selectionRects.map(getQuireSubLayoutTextOccurrenceKey))
    };
  });
  const products: QuireSubLayoutQueryProducts = {
    selectionRects: visibleFragments.flatMap(({ projection, selectionRects }) =>
      selectionRects.map((rect) =>
        normalizeQuireSubLayoutSelectionRectForSnapshot(rect, projection)
      )
    ),
    caretStops: visibleFragments.flatMap(({ projection, textOccurrenceKeys }) =>
      projection.view.queryProducts.caretStops
        .filter((stop) => textOccurrenceKeys.has(getQuireSubLayoutTextOccurrenceKey(stop)))
        .map((stop) =>
          normalizeQuireSubLayoutCaretStopForSnapshot(stop, projection)
        )
    ),
    hitTargets: fragments.flatMap((fragment) =>
      fragment.subLayout.view.queryProducts.hitTargets
        .flatMap(target => {
          const rect = intersectQuireRects(target.rect, fragment.subLayout.geometry.interactionClip);
          return rect === null ? [] : [{ ...target, rect }];
        })
        .filter((target) => intersectsClip(target.rect, snapshotClipRects))
        .map((target) =>
          normalizeQuireSubLayoutHitTargetForSnapshot(target, fragment.subLayout)
        )
    ),
    inputAnchors: fragments.flatMap((fragment) =>
      fragment.subLayout.view.queryProducts.inputAnchors
        .flatMap(anchor => {
          const rect = intersectQuireRects(anchor.rect, fragment.subLayout.geometry.interactionClip);
          return rect === null ? [] : [{ ...anchor, rect }];
        })
        .filter((anchor) => intersectsClip(anchor.rect, snapshotClipRects))
        .map((anchor) =>
          normalizeQuireSubLayoutInputAnchorForSnapshot(anchor, fragment.subLayout)
        )
    )
  };

  // Retained ownership remains authoritative even when every product is clipped.
  return products;
}

/**
 * Normalizes a sub-layout selection rectangle for mounted snapshot query consumers.
 *
 * @param rect - Sub-layout selection rectangle to normalize.
 * @param result - Sub-layout result that owns the product.
 * @returns Selection rectangle with retained ownership facts.
 */
function normalizeQuireSubLayoutSelectionRectForSnapshot(
  rect: QuireSubLayoutSelectionRect,
  result: QuireSubLayoutProjection
): QuireSubLayoutSelectionRect {
  return {
    ...rect,
    queryOwner: rect.queryOwner ??
      createQuireSubLayoutQueryProductOwner(result)
  };
}

/**
 * Normalizes a sub-layout caret stop for mounted snapshot query consumers.
 *
 * @param stop - Sub-layout caret stop to normalize.
 * @param result - Sub-layout result that owns the product.
 * @returns Caret stop with retained ownership facts.
 */
function normalizeQuireSubLayoutCaretStopForSnapshot(
  stop: QuireSubLayoutCaretStop,
  result: QuireSubLayoutProjection
): QuireSubLayoutCaretStop {
  return {
    ...stop,
    queryOwner: stop.queryOwner ??
      createQuireSubLayoutQueryProductOwner(result)
  };
}

/**
 * Normalizes a sub-layout hit target for mounted snapshot query consumers.
 *
 * @param target - Sub-layout hit target to normalize.
 * @param result - Sub-layout result that owns the query product.
 * @returns Hit target with inherited retained region, layer, and pointer policy.
 */
function normalizeQuireSubLayoutHitTargetForSnapshot(
  target: QuireHitTarget,
  result: QuireSubLayoutProjection
): QuireHitTarget {
  const facts = resolveQuireViewLayerTargetFacts(target);
  const queryOwner = target.queryOwner ??
    createQuireSubLayoutQueryProductOwner(result);
  const ownership = result.view.root.ownership;
  const owner = ownership.status === "resolved" ? ownership.owner : undefined;

  return {
    ...target,
    queryOwner,
    ...(target.viewRegion !== undefined || queryOwner.region === undefined
      ? {}
      : { viewRegion: queryOwner.region }),
    ...(target.source !== undefined || owner === undefined
      ? {}
      : { source: owner.source }),
    ...(target.capabilities !== undefined || owner === undefined
      ? {}
      : { capabilities: owner.capabilities }),
    layer: facts.layer,
    pointerPolicy: facts.pointerPolicy,
    ...(target.interactionHit === undefined
      ? {}
      : {
          interactionHit: normalizeQuireViewInteractionHitLayerFacts(
            target.interactionHit,
            facts
          )
        })
  };
}

/**
 * Normalizes a sub-layout input anchor for mounted snapshot query consumers.
 *
 * @param anchor - Sub-layout input anchor to normalize.
 * @param result - Sub-layout result that owns the product.
 * @returns Input anchor with retained ownership facts.
 */
function normalizeQuireSubLayoutInputAnchorForSnapshot(
  anchor: QuireSubLayoutInputAnchor,
  result: QuireSubLayoutProjection
): QuireSubLayoutInputAnchor {
  return {
    ...anchor,
    queryOwner: anchor.queryOwner ??
      createQuireSubLayoutQueryProductOwner(result)
  };
}
