import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";

/**
 * Creates a snapshot-unique retained region key.
 *
 * @param region - Region reference whose identity should be serialized.
 * @returns Stable region key.
 */
export function createQuireRetainedRegionRegionKey(
  region: QuireLayoutRegionRef
): string {
  return `${region.rootId.value}:${region.regionId.value}:${region.visualInstanceId ?? ""}`;
}
