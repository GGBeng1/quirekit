import type { QuireInlineSourceAnchor } from "@quirekit/layout/inline";
import {
  findQuireTextCaretStopAtPosition,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireInlinePlacementReferenceSet } from "../../../../layout/engine/inline/placement-reference";
import type { ResolveQuireTextblockFlowSlotsOptions } from "./types";

/**
 * Builds paragraph-local placement references from baseline caret geometry.
 *
 * @param options - Baseline fragments and paragraph metrics.
 * @param anchor - Logical source whose caret stop supplies anchor geometry.
 * @returns Local references, or undefined when no bordering fragment exists.
 */
export function createQuireLocalPlacementReferences(
  options: ResolveQuireTextblockFlowSlotsOptions,
  anchor: QuireInlineSourceAnchor
): QuireInlinePlacementReferenceSet | undefined {
  const fragment = findAnchorFragment(options.fragments, anchor);
  if (fragment === undefined) {
    return undefined;
  }
  const stop = findQuireTextCaretStopAtPosition(fragment, anchor.position.pos);
  const paragraphHeight = Math.max(
    options.lineHeight,
    ...options.fragments.map((candidate) => candidate.rect.y + candidate.rect.height)
  );
  const paragraph = { x: 0, y: 0, width: options.width, height: paragraphHeight };

  return {
    anchor: {
      x: fragment.rect.x + stop.localX,
      y: fragment.rect.y,
      width: 0,
      height: fragment.lineHeight
    },
    line: {
      x: 0,
      y: fragment.rect.y,
      width: options.width,
      height: fragment.lineHeight
    },
    paragraph,
    column: paragraph,
    containingRegion: paragraph
  };
}

/**
 * Finds the text fragment that canonically borders one logical anchor.
 *
 * @param fragments - Baseline fragments in source/visual order.
 * @param anchor - Logical source anchor to locate.
 * @returns Exact, following, or preceding bordering fragment.
 */
function findAnchorFragment(
  fragments: readonly QuireTextFragment[],
  anchor: QuireInlineSourceAnchor
): QuireTextFragment | undefined {
  const exact = fragments.find((fragment) =>
    anchor.position.pos >= fragment.range.from
    && anchor.position.pos <= fragment.range.to
  );
  if (exact !== undefined) {
    return exact;
  }
  const following = fragments.find((fragment) => fragment.range.from >= anchor.range.to);
  if (following !== undefined) {
    return following;
  }
  for (let index = fragments.length - 1; index >= 0; index -= 1) {
    const fragment = fragments[index]!;
    if (fragment.range.to <= anchor.range.from) {
      return fragment;
    }
  }
  return undefined;
}
