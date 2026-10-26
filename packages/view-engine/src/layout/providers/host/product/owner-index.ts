import type {
  QuireHitTarget,
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../engine/types";
import type { QuireSubLayoutProjection } from "../../../engine/sub-layout";
import { createQuireSubLayoutProjectionRegion } from "../../../engine/sub-layout/owner";
import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";

/** Canonical provider-product owner retained by the layout tree. */
export type QuireLayoutProviderProductOwner = QuireLayoutBox | QuireSubLayoutProjection;

/** Explicit layout owners indexed by retained identity. */
export interface QuireLayoutProviderProductOwners {
  /** Layout owners indexed by retained root id. */
  readonly roots: ReadonlyMap<string, QuireLayoutProviderProductOwner>;
  /** Layout owners indexed by retained visual region address. */
  readonly regions: ReadonlyMap<string, QuireLayoutProviderProductOwner>;
}

/**
 * Collects explicit retained owners without inferring identity from node ids.
 *
 * @param layout - Provider layout tree to inspect.
 * @returns Root and visual-region owner indexes.
 */
export function collectQuireLayoutProviderProductOwners(
  layout: QuireLayoutBox
): QuireLayoutProviderProductOwners {
  const roots = new Map<string, QuireLayoutProviderProductOwner>();
  const regions = new Map<string, QuireLayoutProviderProductOwner>();

  visitLayoutBoxes(layout, (box) => {
    // A concrete layout box owns its logical products before recursive visual
    // occurrences register additional exact addresses for query projection.
    indexRetainedOwner(box, roots, regions);
    for (const fragment of box.subLayoutFragments ?? []) {
      indexRetainedOwner(fragment.subLayout, roots, regions);
    }
  });

  return { roots, regions };
}

/**
 * Adds one explicitly annotated retained owner to both identity indexes.
 *
 * @param owner - Layout box or nested-flow root that owns retained products.
 * @param roots - Mutable root owner index.
 * @param regions - Mutable concrete-region owner index.
 */
function indexRetainedOwner(
  owner: QuireLayoutProviderProductOwner,
  roots: Map<string, QuireLayoutProviderProductOwner>,
  regions: Map<string, QuireLayoutProviderProductOwner>
): void {
  const retained = readRetainedOwner(owner);
  if (retained === undefined) {
    return;
  }
  if (!roots.has(retained.rootId)) {
    roots.set(retained.rootId, owner);
  }
  const key = createQuireLayoutProviderRegionKey(retained.region);
  if (!regions.has(key)) {
    regions.set(key, owner);
  }
  if ("geometry" in owner) {
    const concreteRegion = createQuireSubLayoutProjectionRegion(owner);
    if (concreteRegion !== undefined) {
      regions.set(createQuireLayoutProviderRegionKey(concreteRegion), owner);
    }
  }
}

/**
 * Reads explicit retained identity from a layout box or recursive projection.
 *
 * @param owner - Candidate provider-product owner.
 * @returns Resolved retained identity, or undefined when ownership is absent.
 */
function readRetainedOwner(
  owner: QuireLayoutProviderProductOwner
): { readonly rootId: string; readonly region: QuireLayoutRegionRef } | undefined {
  if ("geometry" in owner) {
    const ownership = owner.view.root.ownership;
    return ownership.status === "resolved"
      ? { rootId: ownership.root.id.value, region: ownership.owner.region }
      : undefined;
  }
  return owner.viewRoot === undefined || owner.viewRegion === undefined
    ? undefined
    : { rootId: owner.viewRoot.id.value, region: owner.viewRegion };
}

/**
 * Reads the explicit retained owner represented by one hit target.
 *
 * @param target - Canonical hit target.
 * @returns Retained region owner, or undefined when the provider root owns it.
 */
export function readQuireLayoutProviderHitTargetRegion(
  target: QuireHitTarget
): QuireLayoutRegionRef | undefined {
  return target.viewRegion
    ?? target.queryOwner?.region
    ?? target.interactionHit?.region;
}

/**
 * Creates a visual retained-region address.
 *
 * @param region - Region reference to address.
 * @returns Root, region, and visual-instance key.
 */
export function createQuireLayoutProviderRegionKey(
  region: QuireLayoutRegionRef
): string {
  return [
    region.rootId.value,
    region.regionId.value,
    region.visualInstanceId ?? ""
  ].join(":");
}

/**
 * Visits layout boxes in stable preorder.
 *
 * @param box - Current layout box.
 * @param visitor - Callback invoked for every box.
 */
function visitLayoutBoxes(
  box: QuireLayoutBox,
  visitor: (box: QuireLayoutBox) => void
): void {
  visitor(box);
  if (!isLayoutContainer(box)) {
    return;
  }
  for (const child of box.children) {
    visitLayoutBoxes(child, visitor);
  }
}

/**
 * Reports whether one layout box owns recursive children.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box is a layout container.
 */
function isLayoutContainer(box: QuireLayoutBox): box is QuireLayoutContainer {
  return Array.isArray((box as Partial<QuireLayoutContainer>).children);
}
