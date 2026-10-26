import type { SimpleInstance } from "../vendor/types";

/**
 * Joins the vendor's coalesced render queue before reading geometry or removing DOM.
 * @param instance - Live vendor instance.
 * @returns Resolution at the final layout callback, including queued rerenders.
 */
export function settleMindMapLayout(instance: SimpleInstance): Promise<void> {
  return new Promise(resolve => instance.render(resolve));
}
