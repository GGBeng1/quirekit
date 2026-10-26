import type { QuireLayoutAnchor } from "../../../types";
import type { QuireLayoutTranslation } from "../types";
import { translateQuireRect } from "./rect";

/**
 * Translates a DOM overlay anchor.
 *
 * @param anchor - Layout anchor to translate.
 * @param projection - Page-body projection to apply.
 * @returns Translated anchor.
 */
export function translateQuireLayoutAnchor(
  anchor: QuireLayoutAnchor,
  projection: QuireLayoutTranslation
): QuireLayoutAnchor {
  return {
    ...anchor,
    rect: translateQuireRect(anchor.rect, projection),
    placementReferences: {
      anchor: translateQuireRect(anchor.placementReferences.anchor, projection),
      line: translateQuireRect(anchor.placementReferences.line, projection),
      paragraph: translateQuireRect(anchor.placementReferences.paragraph, projection),
      containingRegion: translateQuireRect(
        anchor.placementReferences.containingRegion,
        projection
      ),
      ...(anchor.placementReferences.column === undefined
        ? {}
        : { column: translateQuireRect(anchor.placementReferences.column, projection) }),
      ...(anchor.placementReferences.margin === undefined
        ? {}
        : { margin: translateQuireRect(anchor.placementReferences.margin, projection) }),
      ...(anchor.placementReferences.page === undefined
        ? {}
        : { page: translateQuireRect(anchor.placementReferences.page, projection) })
    }
  };
}
