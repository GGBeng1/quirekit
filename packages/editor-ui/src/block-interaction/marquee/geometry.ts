import type { QuireMountedBlockFragment } from "@quirekit/core";
import type { BlockCatalog, BlockFact, BlockRangeRef } from "@quirekit/extensions";
import type { EditorUIDragPoint } from "../../drag";
import type { EditorBlockMarqueeRect } from "./types";

/**
 * Projects the retained document anchor and a visible moving endpoint to one client rectangle.
 * @param anchor - Fixed point relative to the continuous content surface.
 * @param pointer - Latest client sample, possibly beyond the scrollport.
 * @param origin - Current client origin after scrolling.
 * @param viewport - Product clipping rectangle.
 * @returns Direction-independent client rectangle with an endpoint inside the viewport.
 */
export function createEditorBlockMarqueeRect(anchor: EditorUIDragPoint, pointer: EditorUIDragPoint,
  origin: EditorUIDragPoint, viewport: EditorBlockMarqueeRect): EditorBlockMarqueeRect {
  const insetX = Math.min(1, viewport.width / 2), insetY = Math.min(1, viewport.height / 2);
  const x = Math.max(viewport.x + insetX, Math.min(pointer.x, viewport.x + viewport.width - insetX));
  const y = Math.max(viewport.y + insetY, Math.min(pointer.y, viewport.y + viewport.height - insetY));
  const startX = anchor.x + origin.x, startY = anchor.y + origin.y;
  return { x: Math.min(startX, x), y: Math.min(startY, y), width: Math.abs(startX - x), height: Math.abs(startY - y) };
}

/**
 * Resolves whole intersecting owners without selecting children of an already owned block.
 * @param catalog - Current immutable source facts.
 * @param fragments - Rect-query results from the mounted geometry owner.
 * @returns Continuous sibling membership, or null for no hit or mixed scopes.
 */
export function resolveEditorBlockMarqueeRange(catalog: BlockCatalog,
  fragments: readonly QuireMountedBlockFragment[]): BlockRangeRef | null {
  let first: BlockFact | undefined, last: BlockFact | undefined;
  for (const fragment of fragments) {
    if (fragment.sourceDocument !== catalog.doc) continue;
    const block = catalog.byFrom.get(fragment.from);
    if (!block || block.to !== fragment.to) continue;
    if (first && first.scopeId !== block.scopeId) return null;
    if (!first || block.order < first.order) first = block;
    if (!last || block.order > last.order) last = block;
  }
  return first && last ? { anchor: first, focus: last, expectedDocumentRevision: catalog.revision } : null;
}
