import { queryQuireBlockFragments, resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import type { QuireMountedBlockFragment } from "@quirekit/core";
import type { CreateMountedPaginatedGeometryFacadeOptions } from "../paginated-facade/types";

/**
 * Projects exact retained block occurrences through the mounted coordinate authority.
 * @param options - Current surface and render products.
 * @param clientY - Pointer height in client coordinates.
 * @returns Versioned client geometry; incomplete render products provide no targets.
 */
export function queryMountedBlockFragments(options: CreateMountedPaginatedGeometryFacadeOptions, clientY: number): readonly QuireMountedBlockFragment[] {
  const result = options.readRenderResult();
  const version = result?.interactionSnapshot.viewGraph?.version;
  if (!result || version === undefined) return [];
  const surface = options.readSurface();
  const authority = resolveViewCoordinateAuthority(surface.clientRect, surface.surfaceBounds);
  const documentY = authority.documentPointFromClient({ left: surface.clientRect.left, top: clientY }).y;
  return queryQuireBlockFragments(result.layoutSnapshot, result.layoutSnapshot.state.doc, documentY).map(fragment => ({
    ...fragment,
    documentRect: fragment.rect,
    rect: authority.documentToClientRect(fragment.rect).to,
    sourceDocument: result.layoutSnapshot.state.doc,
    geometryVersion: version
  }));
}
