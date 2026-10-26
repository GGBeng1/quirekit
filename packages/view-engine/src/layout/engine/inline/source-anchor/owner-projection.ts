import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type { QuireInlineSourceAnchor } from "@quirekit/layout/inline";
import type { QuireLayoutBox } from "../../types";
import type { QuireRect } from "@quirekit/renderer";

/** One logical source anchor paired with its exact geometry and owner authority. */
export interface QuireInlineSourceOwnerProjection {
  /** Logical non-text inline source collected from the document. */
  readonly source: QuireInlineSourceAnchor;
  /** Layout box whose text topology resolves the source geometry. */
  readonly box: QuireLayoutBox;
  /** Exact retained owner represented by the source flow. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Exact layout bounds of the box that established owner authority. */
  readonly ownerRect: QuireRect;
}

/** Mutable projection record used to preserve logical source order. */
interface MutableProjectionRecord {
  /** Stable insertion index in logical source order. */
  readonly index: number;
  /** Whether a nested flow has supplied more precise owner authority. */
  readonly nested: boolean;
  /** Current projection for the logical source. */
  readonly projection: QuireInlineSourceOwnerProjection;
}

/**
 * Projects logical inline sources onto their most precise retained owner.
 *
 * Regular children establish source order. Nested-flow fragments then replace
 * the same logical source with their exact region owner without duplicating it.
 * Multiple visual occurrences remain the responsibility of the later visual-
 * occurrence compiler rather than leaking into logical source identity.
 *
 * @param box - Layout tree containing logical sources and nested flows.
 * @param inheritedOwner - Complete owner inherited from the containing flow.
 * @returns Source projections in stable logical document order.
 */
export function projectQuireInlineSourceOwners(
  box: QuireLayoutBox,
  inheritedOwner: QuireLayoutOwnerFacts
): readonly QuireInlineSourceOwnerProjection[] {
  const records = new Map<string, MutableProjectionRecord>();
  collectRegularTree(box, inheritedOwner, box.rect, records);
  collectNestedFlows(box, records);
  return [...records.values()]
    .sort((left, right) => left.index - right.index)
    .map((record) => record.projection);
}

/**
 * Collects source order and inherited ownership from the regular layout tree.
 *
 * @param box - Current regular layout box.
 * @param inheritedOwner - Complete owner inherited from the parent box.
 * @param inheritedOwnerRect - Bounds of the box that established inherited ownership.
 * @param records - Mutable projections keyed by logical source id.
 * @returns Nothing.
 */
function collectRegularTree(
  box: QuireLayoutBox,
  inheritedOwner: QuireLayoutOwnerFacts,
  inheritedOwnerRect: QuireRect,
  records: Map<string, MutableProjectionRecord>
): void {
  const owner = box.layoutOwner ?? inheritedOwner;
  const ownerRect = box.layoutOwner === undefined ? inheritedOwnerRect : box.rect;
  appendBoxSources(box, owner, ownerRect, false, records);

  for (const child of readChildren(box)) {
    collectRegularTree(child, owner, ownerRect, records);
  }
}

/**
 * Reprojects sources represented by nested flows onto their exact root owner.
 *
 * @param box - Current layout box that may own sub-layout fragments.
 * @param records - Mutable projections keyed by logical source id.
 * @returns Nothing.
 */
function collectNestedFlows(
  box: QuireLayoutBox,
  records: Map<string, MutableProjectionRecord>
): void {
  for (const entry of box.subLayoutFragments ?? []) {
    const projection = entry.subLayout;
    const ownership = projection.view.root.ownership;
    const sourceBoxes = projection.view.fragmentSources.map(
      (source) => source.sourceBox
    );
    const hasSources = sourceBoxes.some(containsInlineSource);

    if (hasSources && ownership.status !== "resolved") {
      throw new RangeError(
        `Sub-layout fragment "${projection.geometry.id}" contains inline sources without exact owner facts.`
      );
    }
    if (ownership.status === "resolved") {
      for (const sourceBox of sourceBoxes) {
        collectNestedSourceTree(
          sourceBox,
          ownership.owner,
          projection.geometry.root.placement.rect,
          records
        );
      }
    }
  }

  for (const child of readChildren(box)) {
    collectNestedFlows(child, records);
  }
}

/**
 * Collects one nested source subtree using fragment-root owner authority.
 *
 * @param box - Source box represented by the nested fragment.
 * @param owner - Exact nested-flow owner facts.
 * @param ownerRect - Exact nested-flow root bounds.
 * @param records - Mutable projections keyed by logical source id.
 * @returns Nothing.
 */
function collectNestedSourceTree(
  box: QuireLayoutBox,
  owner: QuireLayoutOwnerFacts,
  ownerRect: QuireRect,
  records: Map<string, MutableProjectionRecord>
): void {
  appendBoxSources(box, owner, ownerRect, true, records);
  for (const child of readChildren(box)) {
    collectNestedSourceTree(child, owner, ownerRect, records);
  }
}

/**
 * Adds or refines logical sources owned by one layout box.
 *
 * @param box - Layout box containing logical sources.
 * @param owner - Exact owner to pair with the sources.
 * @param ownerRect - Exact bounds of the owner-establishing layout box.
 * @param nested - Whether this projection comes from a nested-flow root.
 * @param records - Mutable projections keyed by logical source id.
 * @returns Nothing.
 */
function appendBoxSources(
  box: QuireLayoutBox,
  owner: QuireLayoutOwnerFacts,
  ownerRect: QuireRect,
  nested: boolean,
  records: Map<string, MutableProjectionRecord>
): void {
  for (const source of box.sourceAnchors ?? []) {
    const current = records.get(source.id);
    if (current !== undefined && (!nested || current.nested)) {
      continue;
    }
    records.set(source.id, {
      index: current?.index ?? records.size,
      nested,
      projection: { source, box, owner, ownerRect }
    });
  }
}

/**
 * Reports whether one layout subtree contains logical inline sources.
 *
 * @param box - Layout subtree to inspect.
 * @returns Whether at least one logical source anchor exists.
 */
function containsInlineSource(box: QuireLayoutBox): boolean {
  return (box.sourceAnchors?.length ?? 0) > 0
    || readChildren(box).some(containsInlineSource);
}

/**
 * Reads regular child boxes without widening the public layout-box contract.
 *
 * @param box - Layout box to inspect.
 * @returns Regular child boxes, or an empty list for a leaf.
 */
function readChildren(box: QuireLayoutBox): readonly QuireLayoutBox[] {
  return "children" in box && Array.isArray(box.children) ? box.children : [];
}
