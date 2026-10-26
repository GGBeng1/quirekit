import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutSelectionRect
} from "./types";
import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";

/** Immutable owners retain value keys only for their own snapshot lifetime. */
const ownerKeys = new WeakMap<QuireLayoutQueryProductOwner, string>();

/**
 * Identifies one accepted text fragment within its exact retained occurrence.
 *
 * Geometry does not establish identity: different columns, pages, or repeated
 * stories may share source positions and pixel coordinates.
 *
 * @param product - Line rectangle or caret carrying accepted text ownership.
 * @returns Stable association key scoped to the current query-product snapshot.
 */
export function getQuireSubLayoutTextOccurrenceKey(
  product: QuireSubLayoutSelectionRect | QuireSubLayoutCaretStop
): string {
  return JSON.stringify([
    product.textFragmentId,
    getQuireSubLayoutQueryOwnerKey(product.queryOwner)
  ]);
}

/**
 * Identifies the retained source and coordinate occurrence of a query product.
 * @param owner - Explicit retained owner, or undefined for unclaimed products.
 * @returns Value key shared by products with the same retained ownership facts.
 */
export function getQuireSubLayoutQueryOwnerKey(
  owner: QuireLayoutQueryProductOwner | undefined
): string {
  if (owner === undefined) {
    return "unclaimed";
  }
  const cached = ownerKeys.get(owner);
  if (cached !== undefined) {
    return cached;
  }
  const key = JSON.stringify([
    owner?.sourceRootId,
    owner?.sourceFragmentId,
    owner?.coordinateSpace,
    owner?.sourceCoordinateSpace,
    owner?.root?.id.value,
    owner?.region?.rootId.value,
    owner?.region?.regionId.value,
    owner?.region?.visualInstanceId
  ]);
  ownerKeys.set(owner, key);
  return key;
}
