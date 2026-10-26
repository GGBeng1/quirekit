import type { QuireRetainedLayerContribution } from "./types";

/**
 * Resolves the document-unique display product identity of one layer contribution.
 *
 * Contribution ids are only unique within their producer, so every occurrence of
 * one provider may share an id; the owner region and source tell them apart.
 *
 * @param contribution - Retained layer contribution.
 * @returns Product id used by display ownership and command collection.
 */
export function resolveQuireLayerContributionProductId(
  contribution: Pick<QuireRetainedLayerContribution, "contributionId" | "owner">
): string {
  const { region, source } = contribution.owner;
  return JSON.stringify([
    contribution.contributionId,
    region.rootId.value,
    region.regionId.value,
    region.visualInstanceId ?? null,
    source.sourceId
  ]);
}
