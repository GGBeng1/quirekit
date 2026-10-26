import {
  intersectQuireDocumentRanges,
  intersectQuireRects
} from "@quirekit/renderer";
import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutNode,
  QuireSubLayoutQueryProducts
} from "../../layout";
import type {
  QuireSelectionGeometryContext,
  QuireSelectionRangeGeometry
} from "../types";
import { filterQuireSelectionGeometryDuplicateCandidatesByContext } from "../selection/geometry-context-filter";
import { readQuireSubLayoutTextCaretStops } from "./text-geometry";
import type {
  QuireSubLayoutSelectionRect
} from "./types";

/**
 * Builds range geometry for one node's retained sub-layout query products.
 *
 * @param node - Layout node that may expose retained sub-layout products.
 * @param selectionRange - Selected document range.
 * @param visibleClip - Visible rectangle inherited from the layout tree.
 * @param selectionContext - Optional active selection context for repeated visual instances.
 * @returns Selection ranges produced by the node's sub-layout products.
 */
export function buildQuireSubLayoutRangeGeometriesForNode(
  node: QuireLayoutNode,
  selectionRange: QuireDocumentRange,
  visibleClip: QuireRect,
  selectionContext?: QuireSelectionGeometryContext | undefined
): readonly QuireSelectionRangeGeometry[] {
  const products = node.subLayoutQueryProducts;

  if (!products) {
    return [];
  }

  const geometries: QuireSelectionRangeGeometry[] = [];
  const selectionRects = filterQuireSelectionGeometryDuplicateCandidatesByContext(
    products.selectionRects,
    selectionContext,
    (rect) => rect
  );

  for (const selectionRect of selectionRects) {
    const overlap = intersectQuireDocumentRanges(selectionRect.range, selectionRange);

    if (!overlap) {
      continue;
    }

    const rect = resolveQuireSubLayoutSelectionRect(
      products,
      selectionRect,
      overlap
    );
    const clippedRect = rect === null ? null : intersectQuireRects(rect, visibleClip);

    if (clippedRect) {
      geometries.push({
        range: overlap,
        rect: clippedRect,
        ...(selectionRect.queryOwner === undefined
          ? {}
          : { queryOwner: selectionRect.queryOwner })
      });
    }
  }

  return geometries;
}

/**
 * Resolves a selection rectangle, using caret stops to trim partial ranges.
 *
 * @param products - Query products that own the selection rectangle.
 * @param selectionRect - Full selection rectangle for one retained fragment.
 * @param overlap - Selected subrange inside the retained fragment.
 * @returns Exact selection rectangle, or null when partial endpoints are absent.
 */
function resolveQuireSubLayoutSelectionRect(
  products: QuireSubLayoutQueryProducts,
  selectionRect: QuireSubLayoutSelectionRect,
  overlap: QuireDocumentRange
): QuireRect | null {
  if (overlap.from === selectionRect.range.from && overlap.to === selectionRect.range.to) {
    return selectionRect.rect;
  }
  const stops = readQuireSubLayoutTextCaretStops(products, selectionRect);
  const fromStop = stops.find((stop) => stop.position.pos === overlap.from);
  const toStop = stops.find((stop) => stop.position.pos === overlap.to);

  if (!fromStop || !toStop) {
    return null;
  }

  const startX = Math.min(fromStop.rect.x, toStop.rect.x);
  const endX = Math.max(fromStop.rect.x, toStop.rect.x);

  // Query endpoints can extend beyond a projected clip; only the accepted line
  // band may paint. Preserve source precision without resurrecting clipped ink.
  return intersectQuireRects({
    x: startX,
    y: selectionRect.rect.y,
    width: endX - startX,
    height: selectionRect.rect.height
  }, selectionRect.rect);
}
