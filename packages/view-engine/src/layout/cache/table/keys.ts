import type { QuireTableSourceCacheRequest } from "./types";

/**
 * Creates an exact source adaptation variant key.
 *
 * @param request - Source request carrying stable table and range facts.
 * @returns String key scoped to one exact source node.
 */
export function createTableSourceVariantKey(
  request: QuireTableSourceCacheRequest
): string {
  const key = request.key;
  return `${key.tableId}\u0001${key.rangeFrom}\u0001${key.rangeTo}\u0001${key.styleVariant ?? ""}`;
}
