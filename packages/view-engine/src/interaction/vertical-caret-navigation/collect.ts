import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireLayoutNode } from "../../layout";
import { resolveQuireTextFragmentRunRect } from "@quirekit/layout/text";
import type { QuireVerticalCaretCandidate } from "./types";
import { createQuireLayoutNodeQueryProductOwner } from "../layout-node-owner";
import { resolveNavigationStoryRegion } from "./story";
import { isQuirePointerTransparentLayoutNode } from "../layout-node-role";

/**
 * Collects retained sub-layout and fallback text-fragment caret candidates.
 *
 * @param nodes - Layout nodes to inspect.
 * @param inheritedStory - Independent story surrounding nested flow.
 * @returns Ordered caret candidates.
 */
export function collectVerticalCaretCandidates(
  nodes: readonly QuireLayoutNode[],
  inheritedStory?: QuireLayoutRegionRef
): readonly QuireVerticalCaretCandidate[] {
  const candidates: QuireVerticalCaretCandidate[] = [];

  for (const node of nodes) {
    // Paint helpers have no editable visual-line identity. Story boundaries
    // are retained separately so nested tables stay in their surrounding flow.
    if (isQuirePointerTransparentLayoutNode(node)) continue;
    const storyRegion = resolveNavigationStoryRegion(node.layoutOwner?.region, inheritedStory);
    const queryOwner = createQuireLayoutNodeQueryProductOwner(node);
    candidates.push(
      ...(node.subLayoutQueryProducts?.caretStops.map((stop) => ({
        storyRegion: resolveNavigationStoryRegion(stop.queryOwner?.region, storyRegion),
        position: stop.position,
        rect: stop.rect,
        lineBaseline: stop.lineBaseline ?? readRectCenterY(stop.rect),
        ...(stop.queryOwner === undefined ? {} : { queryOwner: stop.queryOwner })
      })) ?? [])
    );

    for (const fragment of node.textFragments ?? []) {
      const runRect = resolveQuireTextFragmentRunRect(fragment);
      candidates.push(
        ...fragment.caretStops.map((stop) => ({
          storyRegion,
          queryOwner,
          position: stop.position,
          rect: {
            x: fragment.rect.x + stop.localX,
            y: runRect.y,
            width: 1,
            height: runRect.height
          },
          lineBaseline: fragment.baseline
        }))
      );
    }

    candidates.push(...collectVerticalCaretCandidates(node.children ?? [], storyRegion));
  }

  return candidates;
}

/**
 * Reads the vertical center used by legacy retained products without a baseline.
 *
 * @param rect - Retained caret rectangle to inspect.
 * @returns Vertical center in document coordinates.
 */
function readRectCenterY(
  rect: QuireVerticalCaretCandidate["rect"]
): number {
  return rect.y + rect.height / 2;
}
