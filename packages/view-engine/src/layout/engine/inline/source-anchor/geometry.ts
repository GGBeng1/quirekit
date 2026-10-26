import {
  findQuireTextCaretStopAtPosition,
  resolveQuireTextFragmentRunRect,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type { QuireInlineSourceAnchor } from "@quirekit/layout/inline";
import type { QuireLayoutAnchor, QuireLayoutBox } from "../../types";
import { projectQuireInlineSourceOwners } from "./owner-projection";

/**
 * Collects geometry for logical inline source anchors from a layout tree.
 *
 * Source identity stays attached to the logical inline node. Geometry is
 * resolved only from the owning box's shared caret topology, so Canvas, SVG,
 * and future capability compilers cannot invent backend-specific positions.
 *
 * @param box - Layout box tree that owns measured inline source anchors.
 * @param inheritedOwner - Complete owner facts inherited from the parent flow.
 * @returns Renderer-neutral anchors in layout-tree order.
 */
export function collectQuireInlineSourceLayoutAnchors(
  box: QuireLayoutBox,
  inheritedOwner: QuireLayoutOwnerFacts
): readonly QuireLayoutAnchor[] {
  return projectQuireInlineSourceOwners(box, inheritedOwner).map(
    ({ box: sourceBox, source, owner, ownerRect }) =>
      createLayoutAnchor(sourceBox, source, owner, ownerRect)
  );
}

/**
 * Resolves one logical source anchor against its owning layout box.
 *
 * @param box - Layout box containing the logical inline source.
 * @param source - Exact source identity collected from the document node.
 * @param owner - Exact retained owner facts for the source box.
 * @param ownerRect - Exact bounds of the owner-establishing layout box.
 * @returns Layout anchor with zero-width caret-aligned geometry.
 */
function createLayoutAnchor(
  box: QuireLayoutBox,
  source: QuireInlineSourceAnchor,
  owner: QuireLayoutOwnerFacts,
  ownerRect: QuireLayoutAnchor["placementReferences"]["containingRegion"]
): QuireLayoutAnchor {
  const fragment = findAnchorFragment(box.textFragments ?? [], source);
  const rect = fragment === undefined
    ? createEmptyLineAnchorRect(box)
    : createFragmentAnchorRect(fragment, source);

  return {
    id: source.id,
    sourceAnchorId: source.id,
    kind: "inline-source",
    nodeType: source.nodeType,
    range: source.range,
    position: source.position,
    affinity: source.affinity,
    occurrence: { kind: "single" },
    rect,
    placementReferences: {
      anchor: rect,
      line: fragment?.rect ?? box.rect,
      paragraph: box.rect,
      containingRegion: ownerRect
    },
    owner
  };
}

/**
 * Builds exact empty-line anchor geometry from the measured textblock box.
 *
 * @param box - Empty textblock that owns the inline source.
 * @returns Zero-width line-start anchor rectangle.
 */
function createEmptyLineAnchorRect(box: QuireLayoutBox): QuireLayoutAnchor["rect"] {
  return {
    x: box.rect.x,
    y: box.rect.y,
    width: 0,
    height: box.rect.height
  };
}

/**
 * Finds the text fragment that canonically borders an inline source position.
 *
 * @param fragments - Measured fragments owned by the source textblock.
 * @param source - Logical inline source to position.
 * @returns Exact, preceding, or following fragment nearest the source.
 */
function findAnchorFragment(
  fragments: readonly QuireTextFragment[],
  source: QuireInlineSourceAnchor
): QuireTextFragment | undefined {
  // An inline replacement owns the same document range as its logical source.
  // Resolve that exact owner before inclusive caret-boundary matching: the
  // preceding text fragment ends at the replacement start and would otherwise
  // move a wrapped object's paint back to the previous line.
  const sourceFragment = fragments.find((fragment) =>
    fragment.range.from === source.range.from
    && fragment.range.to === source.range.to
  );
  if (sourceFragment !== undefined) {
    return sourceFragment;
  }

  const exact = fragments.find((fragment) =>
    source.position.pos >= fragment.range.from
    && source.position.pos <= fragment.range.to
  );
  if (exact !== undefined) {
    return exact;
  }

  const following = fragments.find((fragment) => fragment.range.from >= source.range.to);
  if (following !== undefined) {
    return following;
  }

  for (let index = fragments.length - 1; index >= 0; index -= 1) {
    const fragment = fragments[index];
    if (fragment !== undefined && fragment.range.to <= source.range.from) {
      return fragment;
    }
  }

  return undefined;
}

/**
 * Builds zero-width geometry from the shared caret stops of a text fragment.
 *
 * @param fragment - Text fragment bordering the source anchor.
 * @param source - Logical source whose document position selects the caret stop.
 * @returns Caret-aligned layout rectangle.
 */
function createFragmentAnchorRect(
  fragment: QuireTextFragment,
  source: QuireInlineSourceAnchor
): QuireLayoutAnchor["rect"] {
  const stop = findQuireTextCaretStopAtPosition(fragment, source.position.pos);
  const runRect = resolveQuireTextFragmentRunRect(fragment);

  return {
    x: fragment.rect.x + stop.localX,
    y: runRect.y,
    width: 0,
    height: runRect.height
  };
}
