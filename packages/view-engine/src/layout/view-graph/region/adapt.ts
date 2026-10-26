import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireLayoutNode } from "../../types";
import type { QuireLayoutViewGraphProductionGap } from "../types";

/**
 * Adapts one fully annotated layout node into a retained region.
 *
 * @param node - Layout node to adapt.
 * @param rootsById - Explicit roots known to the candidate graph.
 * @param gaps - Mutable production gap list.
 * @returns Retained region, or null when the node is unannotated or incomplete.
 */
export function adaptQuireLayoutNodeRegion(
  node: QuireLayoutNode,
  rootsById: ReadonlyMap<string, QuireLayoutRoot>,
  gaps: QuireLayoutViewGraphProductionGap[]
): QuireLayoutRegion | null {
  const hasViewGraphAnnotation =
    node.viewRoot !== undefined
    || node.viewRegion !== undefined
    || node.viewCapabilities !== undefined
    || node.exportFallbacks !== undefined;

  if (!hasViewGraphAnnotation) {
    return null;
  }

  if (node.viewRegion === undefined) {
    gaps.push({
      code: "missing-view-region",
      message: `Layout node "${node.id}" does not declare a retained view region.`,
      nodeId: node.id,
      range: node.range
    });
    return null;
  }

  if (!rootsById.has(node.viewRegion.rootId.value)) {
    gaps.push({
      code: "missing-view-root",
      message: `Layout node "${node.id}" references view root "${node.viewRegion.rootId.value}" without declaring that root.`,
      nodeId: node.id,
      range: node.range
    });
    return null;
  }

  if (node.viewCapabilities === undefined) {
    gaps.push({
      code: "missing-view-capabilities",
      message: `Layout node "${node.id}" does not declare view capabilities.`,
      nodeId: node.id,
      range: node.range
    });
    return null;
  }

  const layoutOwner = node.layoutOwner;
  if (
    layoutOwner === undefined
    || layoutOwner.region.rootId.value !== node.viewRegion.rootId.value
    || layoutOwner.region.regionId.value !== node.viewRegion.regionId.value
    || layoutOwner.region.visualInstanceId !== node.viewRegion.visualInstanceId
  ) {
    gaps.push({
      code: "missing-view-source",
      message: `Layout node "${node.id}" does not declare an exact region-owned source.`,
      nodeId: node.id,
      range: node.range
    });
    return null;
  }

  const installedRegion = findExactInstalledRegion(node);
  if (
    installedRegion !== undefined
    && hasMatchingNodeAuthority(
      installedRegion,
      layoutOwner.source,
      node.viewCapabilities
    )
  ) {
    return installedRegion;
  }

  return {
    ref: node.viewRegion,
    source: layoutOwner.source,
    rect: node.rect,
    coordinateSpace: "document",
    capabilities: node.viewCapabilities,
    exportFallbacks: node.exportFallbacks
  };
}

/**
 * Finds the installed retained region for one exact node-owned address.
 *
 * @param node - Annotated layout node carrying optional retained products.
 * @returns Exact installed region, or undefined when the product is absent.
 */
function findExactInstalledRegion(
  node: QuireLayoutNode
): QuireLayoutRegion | undefined {
  const reference = node.viewRegion;
  if (reference === undefined) {
    return undefined;
  }

  return node.regionProducts?.regions.find((candidate) =>
    candidate.ref.rootId.value === reference.rootId.value
    && candidate.ref.regionId.value === reference.regionId.value
    && candidate.ref.visualInstanceId === reference.visualInstanceId
    && candidate.ref.kind === reference.kind
  );
}

/**
 * Checks that an installed region preserves the node's non-geometric authority.
 *
 * Geometry may intentionally differ because the node rectangle is a flow
 * footprint while the retained region is the exact visual area. Source and
 * capabilities must still match or duplicate validation must surface the gap.
 *
 * @param region - Installed retained region candidate.
 * @param source - Exact source declared by the node owner.
 * @param capabilities - Capabilities declared by the layout node.
 * @returns Whether the installed product can canonically represent the node.
 */
function hasMatchingNodeAuthority(
  region: QuireLayoutRegion,
  source: NonNullable<QuireLayoutNode["layoutOwner"]>["source"],
  capabilities: NonNullable<QuireLayoutNode["viewCapabilities"]>
): boolean {
  return region.source?.sourceId === source.sourceId
    && region.source.range?.from === source.range?.from
    && region.source.range?.to === source.range?.to
    && region.capabilities.editable === capabilities.editable
    && region.capabilities.selectable === capabilities.selectable
    && region.capabilities.focusable === capabilities.focusable
    && region.capabilities.copyable === capabilities.copyable
    && region.capabilities.commandable === capabilities.commandable
    && region.capabilities.accessible === capabilities.accessible;
}
