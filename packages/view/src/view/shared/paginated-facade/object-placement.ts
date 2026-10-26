import type { QuireMountedReadyObjectAnchor } from "@quirekit/core";
import type { QuireViewRenderResult } from "../../types";

/**
 * Reads exact accepted reference origins without reversing client projection or rotated bounds.
 * @param result - Committed render result, never speculative pointer preview.
 * @param targetIds - Retained semantic target ids already resolved by object anchoring.
 * @returns Clone-safe placement tuple, or undefined without unique authority.
 */
export function readMountedObjectPlacement(result: QuireViewRenderResult | undefined, targetIds: readonly string[]): QuireMountedReadyObjectAnchor["placement"] {
  const snapshot = result?.layoutSnapshot;
  if (!snapshot) return undefined;
  const target = result?.interactionSnapshot.hitTargets.find(item => targetIds.includes(item.id));
  if (!target?.source) return undefined;
  const anchors = snapshot.placementAnchors?.filter(anchor => anchor.sourceAnchorId === target.source?.sourceId
    && (target.viewRegion?.visualInstanceId === undefined || (anchor.occurrence.kind === "page" && anchor.occurrence.visualInstanceId === target.viewRegion.visualInstanceId)));
  if (anchors?.length !== 1) return undefined;
  const anchor = anchors[0]!;
  const references = anchor.placementReferences;
  const contribution = snapshot.layerContributions?.find(item => item.paintSurface === "content"
    && item.owner.source.sourceId === anchor.sourceAnchorId
    && item.owner.region.visualInstanceId === target.viewRegion?.visualInstanceId);
  if (!references.page || !references.column || !contribution) return undefined;
  return { coordinateSpace: "document", rect: { ...contribution.rect }, page: { ...references.page }, column: { ...references.column }, paragraph: { ...references.paragraph } };
}
