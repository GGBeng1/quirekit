import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { resolveQuireTextblockContentWidth } from "@quirekit/view-engine";
import type { CreateMountedPaginatedGeometryFacadeOptions } from "./types";

/**
 * Reads insertion width only from the current source-backed retained snapshot.
 * @param options - Accepted render and visual-context accessors.
 * @param position - Canonical inline insertion coordinate.
 * @param sourceDocument - Exact immutable source expected by the caller.
 * @returns Unscaled document CSS-pixel width, or null before matching layout exists.
 */
export function readMountedTextblockContentWidth(options: CreateMountedPaginatedGeometryFacadeOptions,
  position: number, sourceDocument: ProseMirrorNode): number | null {
  const snapshot = options.readRenderResult()?.layoutSnapshot;
  if (snapshot?.state.pm.doc !== sourceDocument || !Number.isInteger(position)
    || position < 0 || position > sourceDocument.content.size || !sourceDocument.resolve(position).parent.inlineContent) return null;
  return resolveQuireTextblockContentWidth(snapshot, position, options.readSelectionContext());
}
