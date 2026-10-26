import type { QuireSubLayoutQueryProducts } from "../../layout";
import { getQuireSubLayoutTextOccurrenceKey } from "../../layout/engine/sub-layout/text-identity";
import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutSelectionRect,
  QuireSubLayoutTextGeometryIndex
} from "./types";

/** Geometry associations expire with the immutable snapshot products. */
const indexes = new WeakMap<QuireSubLayoutQueryProducts, QuireSubLayoutTextGeometryIndex>();

/**
 * Reads the line fragment explicitly owning a Run-sized caret.
 *
 * @param products - Immutable retained products containing the caret.
 * @param stop - Caret occurrence whose line geometry is needed.
 * @returns Associated text rectangle, or null for an incomplete association.
 */
export function readQuireSubLayoutCaretTextRectangle(
  products: QuireSubLayoutQueryProducts,
  stop: QuireSubLayoutCaretStop
): QuireSubLayoutSelectionRect | null {
  return readTextGeometryIndex(products).rectanglesByStop.get(stop) ?? null;
}

/**
 * Reads caret occurrences belonging to exactly one text fragment and owner.
 *
 * @param products - Immutable retained products containing the fragment.
 * @param rectangle - Selection rectangle identifying the text occurrence.
 * @returns Fragment-local stops, preserving distinct positions and affinities.
 */
export function readQuireSubLayoutTextCaretStops(
  products: QuireSubLayoutQueryProducts,
  rectangle: QuireSubLayoutSelectionRect
): readonly QuireSubLayoutCaretStop[] {
  return readTextGeometryIndex(products).stopsByRectangle.get(rectangle) ?? [];
}

/**
 * Compiles source membership once without comparing Run and line rectangles.
 *
 * @param products - Immutable products whose associations are being queried.
 * @returns Cached text-fragment geometry associations.
 */
function readTextGeometryIndex(
  products: QuireSubLayoutQueryProducts
): QuireSubLayoutTextGeometryIndex {
  const cached = indexes.get(products);
  if (cached !== undefined) {
    return cached;
  }

  // Source identity establishes membership before geometry is consumed. Duplicate
  // identities are ambiguous; they must never borrow endpoints by pixel proximity.
  const rectangles = new Map<string, QuireSubLayoutSelectionRect | null>();
  const rectanglesByStop = new Map<QuireSubLayoutCaretStop, QuireSubLayoutSelectionRect>();
  const stopsByRectangle = new Map<QuireSubLayoutSelectionRect, QuireSubLayoutCaretStop[]>();
  for (const rectangle of products.selectionRects) {
    const key = getQuireSubLayoutTextOccurrenceKey(rectangle);
    rectangles.set(key, rectangles.has(key) ? null : rectangle);
    stopsByRectangle.set(rectangle, []);
  }

  for (const stop of products.caretStops) {
    const rectangle = rectangles.get(getQuireSubLayoutTextOccurrenceKey(stop));
    if (rectangle !== undefined && rectangle !== null) {
      rectanglesByStop.set(stop, rectangle);
      stopsByRectangle.get(rectangle)!.push(stop);
    }
  }

  const index = { rectanglesByStop, stopsByRectangle };
  indexes.set(products, index);
  return index;
}
