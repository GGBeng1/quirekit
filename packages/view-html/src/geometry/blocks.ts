import type { QuireMountedBlockFragment } from "@quirekit/core";
import { queryQuireLayoutInteractionQueryIndexInRect, resolveQuireLayoutInteractionQueryEntryNode } from "@quirekit/view-engine";
import type { HtmlFlowRenderResult } from "./types";

/**
 * Projects only nearby, realized DOM block boxes from the published continuous-flow index.
 * @param result - Current source-bound geometry, with no estimated page products.
 * @param surface - Mounted CSS coordinate origin; reread after scrolling.
 * @param clientY - Pointer height in client CSS pixels.
 * @returns Complete continuous block occurrences near the pointer.
 */
export function queryHtmlBlockFragments(result: HtmlFlowRenderResult | undefined, surface: HTMLElement, clientY: number): readonly QuireMountedBlockFragment[] {
  const origin = surface.getBoundingClientRect();
  return queryHtmlBlockFragmentsInRect(result, surface, {
    x: origin.left, y: clientY - 160, width: origin.width, height: 320
  }, origin);
}

/**
 * Queries the retained index in document coordinates, then projects exact owners to client space.
 * @param result - Published source-backed geometry.
 * @param surface - Continuous-flow origin, refreshed after scrolling.
 * @param rect - Client CSS rectangle, not restricted to the visible viewport.
 * @param origin - Optional origin already read by a sibling query.
 * @returns Intersecting complete block occurrences, without per-node DOM reads.
 */
export function queryHtmlBlockFragmentsInRect(result: HtmlFlowRenderResult | undefined, surface: HTMLElement,
  rect: QuireMountedBlockFragment["rect"], origin = surface.getBoundingClientRect()): readonly QuireMountedBlockFragment[] {
  const snapshot = result?.layoutSnapshot;
  const index = snapshot?.interactionQueryIndex, version = snapshot?.viewGraph?.version;
  if (!snapshot || !index || version === undefined || rect.width <= 0 || rect.height <= 0) return [];
  const entries = queryQuireLayoutInteractionQueryIndexInRect(index, {
    x: rect.x - origin.left, y: rect.y - origin.top, width: rect.width, height: rect.height
  });
  return entries.flatMap(entry => {
    const node = resolveQuireLayoutInteractionQueryEntryNode(snapshot.root, entry);
    if (!node || node === snapshot.root || node.kind !== "block") return [];
    const source = snapshot.state.doc.nodeAt(node.range.from);
    if (!source?.isBlock || node.range.to !== node.range.from + source.nodeSize) return [];
    return [{ from: node.range.from, to: node.range.to, occurrenceId: entry.entryId,
      sourceDocument: snapshot.state.doc, geometryVersion: version, first: true, last: true,
      documentRect: node.rect,
      rect: { x: origin.left + node.rect.x, y: origin.top + node.rect.y, width: node.rect.width, height: node.rect.height }
    }];
  });
}
