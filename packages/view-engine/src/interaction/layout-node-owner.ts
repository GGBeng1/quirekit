import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireLayoutRegionKind } from "@quirekit/layout/identity";
import type { QuireLayoutNode } from "../layout";

/**
 * Derives query-product ownership for ordinary auxiliary-story geometry.
 *
 * Normal story block/text geometry is already in document coordinates. Its
 * logical source remains stable across repeated occurrences, while a projected
 * retained region supplies the snapshot-local fragment identity needed by
 * interaction. Body and nested-flow geometry keep their existing specialized
 * query authorities so this adapter cannot compete with table-cell products.
 *
 * @param node - Ordinary layout node carrying complete layout-owner facts.
 * @returns Query owner for interaction geometry, or undefined without ownership.
 */
export function createQuireLayoutNodeQueryProductOwner(
  node: QuireLayoutNode
): QuireLayoutQueryProductOwner | undefined {
  const owner = node.layoutOwner;

  if (owner === undefined || !isAuxiliaryStoryRegion(owner.region.kind)) {
    return undefined;
  }

  const visualInstanceId = owner.region.visualInstanceId;

  return {
    sourceRootId: owner.source.sourceId,
    ...(visualInstanceId === undefined
      ? {}
      : { sourceFragmentId: visualInstanceId }),
    coordinateSpace: "document",
    region: owner.region
  };
}

/**
 * Checks whether a retained region represents an auxiliary text story.
 *
 * @param kind - Retained layout region kind.
 * @returns Whether ordinary geometry for the region needs repeated-story identity.
 */
function isAuxiliaryStoryRegion(
  kind: QuireLayoutRegionKind
): boolean {
  return kind === "header"
    || kind === "footer"
    || kind === "footnote"
    || kind === "endnote";
}
