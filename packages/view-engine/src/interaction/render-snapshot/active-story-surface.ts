import type { QuireLayoutRegion } from "@quirekit/layout/identity";
import type { QuireRetainedLayoutSnapshot } from "../../editor-layout";
import type { QuireHitTarget } from "../../layout/engine/types";
import type { QuireRetainedLayerContribution } from "../../layout/region-products";
import { isQuireNestedStorySelectionActive } from "./nested-story-state";

/**
 * Creates bounded text-selection surfaces for active nested drawing stories.
 *
 * Drawing text remains paint-only outside editing. Once its related range owns
 * selection, this exact inner-frame target lets the shared retained-text mapper
 * resolve glyphs and blank areas to carets without exposing the story globally.
 *
 * @param snapshot - Retained layout snapshot carrying active contributions.
 * @returns Inner-frame selection targets for active drawing-text occurrences.
 */
export function createQuireActiveNestedStorySurfaceTargets(
  snapshot: QuireRetainedLayoutSnapshot
): readonly QuireHitTarget[] {
  const contributions = snapshot.layerContributions ?? [];
  if (contributions.length === 0) {
    return [];
  }
  const selection = snapshot.state.pm.selection;

  return contributions.flatMap((contribution) => {
    if (!isQuireNestedStorySelectionActive(
      contribution,
      selection.from,
      selection.to
    )) {
      return [];
    }
    const relatedRange = contribution.activation?.relatedRange;
    if (relatedRange === undefined) {
      return [];
    }
    const storyRegion = findRelatedDrawingTextRegion(
      snapshot,
      contribution,
      relatedRange
    );
    if (
      storyRegion?.source?.range === undefined
      || storyRegion.rect === undefined
      || storyRegion.capabilities === undefined
    ) {
      return [];
    }

    return [{
      id: `active-nested-story:${contribution.contributionId}`,
      range: storyRegion.source.range,
      rect: storyRegion.rect,
      ...(contribution.interactionScope === undefined
        ? {}
        : { interactionScope: contribution.interactionScope }),
      viewRegion: storyRegion.ref,
      source: storyRegion.source,
      capabilities: storyRegion.capabilities,
      layer: {
        plane: "drawing",
        ...(contribution.layer.zIndex === undefined
          ? {}
          : { zIndex: contribution.layer.zIndex })
      }
    }];
  });
}

/**
 * Resolves the drawing-text occurrence paired with one selected object.
 *
 * Drawing regions are independent roots rather than geometric descendants of
 * object regions, so occurrence identity and page identity are authoritative;
 * rectangle containment is not a valid ownership test.
 *
 * @param snapshot - Snapshot carrying retained graph regions.
 * @param contribution - Selected object occurrence contribution.
 * @param relatedRange - Nested story range activated by the contribution.
 * @returns Exact drawing-text region for the selected object occurrence.
 */
function findRelatedDrawingTextRegion(
  snapshot: QuireRetainedLayoutSnapshot,
  contribution: QuireRetainedLayerContribution,
  relatedRange: { readonly from: number; readonly to: number }
): QuireLayoutRegion | undefined {
  const objectRegionPrefix = "region:anchored-object:";
  const objectRegionId = contribution.owner.region.regionId.value;
  const objectId = objectRegionId.startsWith(objectRegionPrefix)
    ? objectRegionId.slice(objectRegionPrefix.length)
    : undefined;
  const expectedRegionId = objectId === undefined
    ? undefined
    : `region:word-drawing-text:${objectId}`;
  const selectedPage = readPageIndex(
    contribution.owner.region.visualInstanceId
  );

  return snapshot.viewGraph?.regions.find((region) => {
    if (region.ref.kind !== "drawing-text") {
      return false;
    }
    const hasExpectedObjectIdentity = expectedRegionId !== undefined;
    const matchesStoryIdentity = hasExpectedObjectIdentity
      ? region.ref.regionId.value === expectedRegionId
      : region.source?.range?.from === relatedRange.from
        && region.source.range.to === relatedRange.to;

    return matchesStoryIdentity
      && readPageIndex(region.ref.visualInstanceId) === selectedPage;
  });
}

/**
 * Reads the page occurrence from a retained visual-instance identity.
 *
 * @param visualInstanceId - Candidate single or page-projected identity.
 * @returns Zero-based page index, or null for a single occurrence.
 */
function readPageIndex(visualInstanceId: string | undefined): number | null {
  const value = visualInstanceId?.match(/^page:(\d+):/u)?.[1];
  return value === undefined ? null : Number.parseInt(value, 10);
}
