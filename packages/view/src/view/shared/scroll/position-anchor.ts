import type { Node as PMNode } from "@quirekit/pm";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import { createQuireInteractionGeometryAuthority } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import { mapPositionByShape } from "./shape-map";
import type { MountedViewScrollAnchor } from "./types";

/**
 * Picks the reading position to keep on screen across the next render.
 *
 * The anchor is the line at the top of the visible region, found in the body of
 * the first page that reaches below that edge; a top inside a page margin or the
 * gap between pages anchors the next body line instead. No anchor is taken while
 * the start of the document is visible, so content added at the start shows.
 *
 * @param renderResult - Render result whose geometry is on screen.
 * @param visible - Visible region in document coordinates.
 * @returns Anchor, or null when nothing should be kept in place.
 */
export function captureMountedViewScrollAnchor(
  renderResult: QuireViewRenderResult | undefined,
  visible: QuireRect
): MountedViewScrollAnchor | null {
  if (renderResult === undefined || visible.y <= 0) return null;
  const point = probeVisibleTop(renderResult.layoutSnapshot.pages ?? [], visible.y);
  if (point === null) return null;
  const snapshot = renderResult.interactionSnapshot;
  try {
    const authority = createQuireInteractionGeometryAuthority({ snapshot });
    const hit = authority.posAtCoords(point);
    if (hit.kind === "miss") return null;
    const pos = hit.position.pos;
    return { doc: snapshot.state.doc, pos, top: authority.coordsAtPos(pos, 1).rect.y };
  } catch {
    return null;
  }
}

/**
 * Measures how far the anchored line moved in a new render.
 *
 * @param anchor - Anchor captured from the previous render.
 * @param renderResult - Newly committed render result.
 * @returns Document-space distance the line moved down, or null when it cannot be followed.
 */
export function resolveMountedViewScrollAnchorShift(
  anchor: MountedViewScrollAnchor,
  renderResult: QuireViewRenderResult
): number | null {
  const snapshot = renderResult.interactionSnapshot;
  const pos = mapAnchorPosition(anchor.doc, snapshot.state.doc, anchor.pos);
  if (pos === null) return null;
  try {
    const top = createQuireInteractionGeometryAuthority({ snapshot }).coordsAtPos(pos, 1).rect.y;
    return Number.isFinite(top) ? top - anchor.top : null;
  } catch {
    return null;
  }
}

/**
 * Scrolls so the anchored line returns to where it was on screen.
 *
 * Called after the new document height is applied and before visible pages are
 * resolved, so frames realize at the corrected position and no jump is painted.
 *
 * @param anchor - Anchor captured before the render, or null.
 * @param renderResult - Newly committed render result.
 * @param scrollByDocument - Scrolls the viewport by a document-space distance.
 * @returns Whether the viewport was scrolled.
 */
export function restoreMountedViewScrollAnchor(
  anchor: MountedViewScrollAnchor | null,
  renderResult: QuireViewRenderResult,
  scrollByDocument: (deltaY: number) => boolean
): boolean {
  if (anchor === null) return false;
  const shift = resolveMountedViewScrollAnchorShift(anchor, renderResult);
  // Sub-pixel shifts come from rounding, not from content above the viewport.
  return shift !== null && Math.abs(shift) >= 0.5 && scrollByDocument(shift);
}

/**
 * Follows a position from one frame document to the next.
 *
 * Frames differ by committed edits, collaborators' changes and overlay steps
 * alike, so the documents are compared by shape rather than through the
 * transactions between them.
 *
 * @param before - Previous frame document.
 * @param after - New frame document.
 * @param pos - Position in `before`.
 * @returns Position in `after`, or null when the anchored content itself changed.
 */
export function mapAnchorPosition(before: PMNode, after: PMNode, pos: number): number | null {
  return before === after ? pos : mapPositionByShape(before.content, after.content, pos);
}

/**
 * Chooses the document point to hit-test for the line at the visible top.
 *
 * @param pages - Layout pages in document order.
 * @param top - Visible top in document coordinates.
 * @returns Point inside the first body reaching below the top, or null past the last page.
 */
function probeVisibleTop(pages: readonly { readonly bodyRect: QuireRect }[], top: number): QuirePoint | null {
  for (const { bodyRect } of pages) {
    if (bodyRect.y + bodyRect.height <= top) continue;
    return { x: bodyRect.x + bodyRect.width / 2, y: Math.max(top, bodyRect.y) + 1 };
  }
  return null;
}
