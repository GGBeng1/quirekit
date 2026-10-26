import { matchesQuireLogicalRegion } from "../../../layout/owner-facts/region";
import type { QuireLayoutCommandOwnerRef } from "@quirekit/layout/identity";
import type { QuireLayoutContainer } from "../../../layout/engine/types";

/**
 * Attaches a structural command owner to a section-neutral story source copy.
 *
 * The canonical story layout may be reused by multiple sections, so ownership
 * is attached only while creating one concrete page occurrence. Region-product
 * projection will replace matching logical region references with this owned
 * reference before the occurrence enters interaction indexes.
 *
 * @param layout - Canonical measured story layout.
 * @param commandOwner - Structural section that governs the page occurrence.
 * @returns Shallow story layout copy carrying the page-local command owner.
 */
export function attachQuireStoryCommandOwner(
  layout: QuireLayoutContainer,
  commandOwner: QuireLayoutCommandOwnerRef
): QuireLayoutContainer {
  const sourceViewRegion = layout.viewRegion;
  if (sourceViewRegion === undefined) {
    return layout;
  }

  const viewRegion = { ...sourceViewRegion, commandOwner };
  const layoutOwner = layout.layoutOwner === undefined
    ? layout.layoutOwner
    : matchesQuireLogicalRegion(layout.layoutOwner.region, sourceViewRegion)
      ? { ...layout.layoutOwner, region: viewRegion }
      : layout.layoutOwner;

  return {
    ...layout,
    viewRegion,
    ...(layoutOwner === undefined ? {} : { layoutOwner })
  };
}
