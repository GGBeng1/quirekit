import type { QuireLayoutRegion } from "@quirekit/layout/identity";
import type { QuireLayoutBox, QuireLayoutDocument } from "../../../layout/engine/types";

/**
 * Collects accepted object regions from body and recursive provider flows.
 *
 * Word sections retain their paragraphs as child-flow projections, so drawing
 * regions can be owned by a nested projection rather than the top-level anchor
 * product bundle. This traversal reads existing accepted products only; it
 * does not recreate placement or infer occurrence identity.
 *
 * @param document - Paginated document with direct and nested retained products.
 * @returns Unique floating-object regions in stable layout order.
 */
export function collectAcceptedObjectRegions(
  document: QuireLayoutDocument
): readonly QuireLayoutRegion[] {
  const regions: QuireLayoutRegion[] = [];
  const seen = new Set<string>();

  /**
   * Appends object regions from one retained product list.
   *
   * @param candidates - Candidate retained regions.
   * @returns Nothing.
   */
  function append(candidates: readonly QuireLayoutRegion[]): void {
    for (const region of candidates) {
      if (readAnchoredObjectId(region) === null) {
        continue;
      }
      const rect = region.rect;
      const key = [
        region.ref.rootId.value,
        region.ref.regionId.value,
        region.ref.visualInstanceId ?? "single",
        rect?.x ?? "",
        rect?.y ?? ""
      ].join(":");
      if (!seen.has(key)) {
        seen.add(key);
        regions.push(region);
      }
    }
  }

  /**
   * Visits one layout box and its retained child-flow projections.
   *
   * @param box - Layout box to inspect.
   * @returns Nothing.
   */
  function visit(box: QuireLayoutBox): void {
    append(box.regionProducts?.regions ?? []);
    for (const fragment of box.subLayoutFragments ?? []) {
      const ownership = fragment.subLayout.view.root.ownership;
      if (ownership.status === "resolved") {
        append(ownership.regionProducts?.regions ?? []);
      }
      for (const source of fragment.subLayout.view.fragmentSources) {
        visit(source.sourceBox);
      }
    }
    if ("children" in box && Array.isArray(box.children)) {
      for (const child of box.children) {
        visit(child);
      }
    }
  }

  append(document.anchorRegionProducts.regions);
  visit(document);
  return regions;
}

/**
 * Reads the logical object id from an exact anchored-object region.
 *
 * @param region - Candidate retained region product.
 * @returns Object id, or null for unrelated regions.
 */
export function readAnchoredObjectId(region: QuireLayoutRegion): string | null {
  const prefix = "region:anchored-object:";
  const regionId = region.ref.regionId.value;
  return region.ref.kind === "floating-object" && regionId.startsWith(prefix)
    ? regionId.slice(prefix.length)
    : null;
}
