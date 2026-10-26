import type { QuireHitTarget } from "../../../../types";
import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutDisplayChunkReference,
  QuireSubLayoutInputAnchor,
  QuireSubLayoutQueryProducts,
  QuireSubLayoutSelectionRect
} from "../../../../sub-layout";
import type { QuireLayoutTranslation } from "../../types";
import { translateQuireHitArea } from "@quirekit/renderer";
import { translateQuireRect } from "../rect";
import { translateQuireLayoutQueryProductOwner } from "./owner";

/**
 * Translates all retained query products from one sub-layout result.
 *
 * @param products - Query products to translate.
 * @param projection - Page-body projection to apply.
 * @returns Query products in projected document coordinates.
 */
export function translateQuireSubLayoutQueryProducts(
  products: QuireSubLayoutQueryProducts,
  projection: QuireLayoutTranslation
): QuireSubLayoutQueryProducts {
  return {
    selectionRects: products.selectionRects.map((rect) =>
      translateQuireSubLayoutSelectionRect(rect, projection)
    ),
    caretStops: products.caretStops.map((stop) =>
      translateQuireSubLayoutCaretStop(stop, projection)
    ),
    hitTargets: products.hitTargets.map((target) =>
      translateQuireSubLayoutHitTarget(target, projection)
    ),
    inputAnchors: products.inputAnchors.map((anchor) =>
      translateQuireSubLayoutInputAnchor(anchor, projection)
    )
  };
}

/**
 * Translates retained sub-layout display chunk references.
 *
 * @param chunks - Display chunks to translate.
 * @param projection - Page-body projection to apply.
 * @returns Display chunks in projected document coordinates.
 */
export function translateQuireSubLayoutDisplayChunks(
  chunks: readonly QuireSubLayoutDisplayChunkReference[],
  projection: QuireLayoutTranslation
): readonly QuireSubLayoutDisplayChunkReference[] {
  return chunks.map((chunk) =>
    translateQuireSubLayoutDisplayChunk(chunk, projection)
  );
}

/**
 * Translates one retained sub-layout selection rectangle.
 *
 * @param rect - Selection rectangle to translate.
 * @param projection - Page-body projection to apply.
 * @returns Selection rectangle in projected document coordinates.
 */
function translateQuireSubLayoutSelectionRect(
  rect: QuireSubLayoutSelectionRect,
  projection: QuireLayoutTranslation
): QuireSubLayoutSelectionRect {
  return {
    ...rect,
    rect: translateQuireRect(rect.rect, projection),
    ...(rect.queryOwner === undefined
      ? {}
      : {
          queryOwner: translateQuireLayoutQueryProductOwner(
            rect.queryOwner,
            projection
          )
        })
  };
}

/**
 * Translates one retained sub-layout caret stop.
 *
 * @param stop - Caret stop to translate.
 * @param projection - Page-body projection to apply.
 * @returns Caret stop in projected document coordinates.
 */
function translateQuireSubLayoutCaretStop(
  stop: QuireSubLayoutCaretStop,
  projection: QuireLayoutTranslation
): QuireSubLayoutCaretStop {
  return {
    ...stop,
    rect: translateQuireRect(stop.rect, projection),
    ...(stop.lineBaseline === undefined
      ? {}
      : { lineBaseline: stop.lineBaseline + projection.dy }),
    ...(stop.queryOwner === undefined
      ? {}
      : {
          queryOwner: translateQuireLayoutQueryProductOwner(
            stop.queryOwner,
            projection
          )
        })
  };
}

/**
 * Translates one retained sub-layout hit target.
 *
 * @param target - Hit target to translate.
 * @param projection - Page-body projection to apply.
 * @returns Hit target in projected document coordinates.
 */
function translateQuireSubLayoutHitTarget(
  target: QuireHitTarget,
  projection: QuireLayoutTranslation
): QuireHitTarget {
  return {
    ...target,
    rect: translateQuireRect(target.rect, projection),
    ...(target.hitArea === undefined
      ? {}
      : {
          hitArea: translateQuireHitArea(
            target.hitArea,
            projection.dx,
            projection.dy
          )
        }),
    ...(target.queryOwner === undefined
      ? {}
      : {
          queryOwner: translateQuireLayoutQueryProductOwner(
            target.queryOwner,
            projection
          )
        })
  };
}

/**
 * Translates one retained sub-layout input anchor.
 *
 * @param anchor - Input anchor to translate.
 * @param projection - Page-body projection to apply.
 * @returns Input anchor in projected document coordinates.
 */
function translateQuireSubLayoutInputAnchor(
  anchor: QuireSubLayoutInputAnchor,
  projection: QuireLayoutTranslation
): QuireSubLayoutInputAnchor {
  return {
    ...anchor,
    rect: translateQuireRect(anchor.rect, projection),
    ...(anchor.queryOwner === undefined
      ? {}
      : {
          queryOwner: translateQuireLayoutQueryProductOwner(
            anchor.queryOwner,
            projection
          )
        })
  };
}

/**
 * Translates one retained sub-layout display chunk reference.
 *
 * @param chunk - Display chunk to translate.
 * @param projection - Page-body projection to apply.
 * @returns Display chunk in projected document coordinates.
 */
function translateQuireSubLayoutDisplayChunk(
  chunk: QuireSubLayoutDisplayChunkReference,
  projection: QuireLayoutTranslation
): QuireSubLayoutDisplayChunkReference {
  return {
    ...chunk,
    rect: translateQuireRect(chunk.rect, projection),
    contentClip: translateQuireRect(chunk.contentClip, projection),
    interactionClip: translateQuireRect(chunk.interactionClip, projection),
    queryOwner: translateQuireLayoutQueryProductOwner(
      chunk.queryOwner,
      projection
    )
  };
}
