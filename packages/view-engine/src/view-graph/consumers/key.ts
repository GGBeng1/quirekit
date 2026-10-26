import type {
  QuireLayoutRegionAddress
} from "@quirekit/layout/identity";
import type { QuireViewConsumerOwnerAddress } from "./types";

/**
 * Creates a collision-safe key for one exact retained owner occurrence.
 *
 * @param owner - Root, region, and optional visual-instance identity.
 * @returns Stable exact-owner lookup key.
 */
export function createQuireViewConsumerOwnerKey(
  owner: QuireViewConsumerOwnerAddress | QuireLayoutRegionAddress
): string {
  const rootId = typeof owner.rootId === "string"
    ? owner.rootId
    : owner.rootId.value;
  const regionId = typeof owner.regionId === "string"
    ? owner.regionId
    : owner.regionId.value;

  return [rootId, regionId, owner.visualInstanceId ?? ""].join("\u0000");
}
