import type { QuireMountedTextRangeRect } from "@quirekit/core";
import { projectEditorUIAnchorGeometry, resolveEditorUIAnchorGeometry } from "@quirekit/editor-ui";
import type { Node } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { CreateMountedPaginatedGeometryFacadeOptions } from "./types";

/**
 * Reads an explicit remote/annotation range from current retained text products.
 * @param options - Committed frame and surface authorities; local selection context is unused.
 * @param range - Half-open canonical text range.
 * @param sourceDocument - Exact source identity against which the caller resolved its anchors.
 * @returns Separate client-space line bands, or null before matching geometry exists.
 */
export function readMountedTextRangeRects(options: CreateMountedPaginatedGeometryFacadeOptions,
  range: QuireDocumentRange, sourceDocument: Node): readonly QuireMountedTextRangeRect[] | null {
  const result = options.readRenderResult();
  if (!result || result.layoutSnapshot.state.pm.doc !== sourceDocument
    || result.interactionSnapshot.state.pm.doc !== sourceDocument
    || !Number.isInteger(range.from) || !Number.isInteger(range.to)
    || range.from < 0 || range.to > sourceDocument.content.size || range.from >= range.to) return null;
  const version = result.interactionSnapshot.viewGraph?.version;
  if (version === undefined) return null;

  // Resolve all visual line segments without borrowing the local caret's Story/occurrence owner.
  // Only the mounted surface converts document CSS pixels to client CSS pixels (including zoom).
  const geometry = resolveEditorUIAnchorGeometry({ snapshot: result.interactionSnapshot,
    request: { kind: "text", range, expectedSnapshotVersion: version } });
  const surface = options.readSurface();
  const projected = projectEditorUIAnchorGeometry({ geometry, surfaceClientRect: surface.clientRect,
    surfaceBounds: surface.surfaceBounds });
  return projected.status === "ready" ? projected.rects : null;
}
