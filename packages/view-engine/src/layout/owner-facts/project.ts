import { matchesQuireRegionOccurrence } from "./region";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../engine/types";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";

/**
 * Projects complete retained owner facts through one layout subtree.
 *
 * A box-local owner or exact compiled region replaces the inherited owner.
 * Missing or source-less region products remain gaps and never read root facts.
 *
 * @param box - Layout subtree to project.
 * @param inheritedOwner - Explicit owner supplied by the containing flow.
 * @returns Layout subtree whose exact boxes carry region-owned facts.
 */
export function projectQuireLayoutOwnerFacts<Box extends QuireLayoutBox>(
  box: Box,
  inheritedOwner?: QuireLayoutOwnerFacts | undefined
): Box {
  const owner = box.layoutOwner
    ?? readQuireLayoutBoxRegionOwner(box)
    ?? inheritedOwner;
  const projected = owner === undefined
    ? box
    : { ...box, layoutOwner: owner };

  if (!isQuireLayoutContainer(projected)) {
    return projected as Box;
  }

  // Descendants receive only an already-complete owner from this layout phase.
  return {
    ...projected,
    children: projected.children.map((child) =>
      projectQuireLayoutOwnerFacts(child, owner)
    )
  } as Box;
}

/**
 * Reads owner facts from the exact compiled region assigned to one box.
 *
 * @param box - Layout box carrying installed retained products.
 * @returns Complete region owner, or undefined when any fact is absent.
 */
function readQuireLayoutBoxRegionOwner(
  box: QuireLayoutBox
): QuireLayoutOwnerFacts | undefined {
  if (box.viewRegion === undefined) {
    return undefined;
  }

  const region = box.regionProducts?.regions.find((candidate) =>
    matchesQuireRegionOccurrence(candidate.ref, box.viewRegion!)
  );

  return region?.source === undefined
    ? undefined
    : {
        region: region.ref,
        source: region.source,
        capabilities: region.capabilities
      };
}


/**
 * Checks whether a layout box owns child boxes.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a layout container.
 */
function isQuireLayoutContainer(
  box: QuireLayoutBox
): box is QuireLayoutContainer {
  return "children" in box && Array.isArray(box.children);
}
