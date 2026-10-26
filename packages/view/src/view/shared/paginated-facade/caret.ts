import type { QuireMountedCaretRect } from "@quirekit/core";
import { resolveViewCoordinateAuthority } from "@quirekit/view-engine";
import type { CreateMountedPaginatedGeometryFacadeOptions } from "./types";

/**
 * Projects the same caret consumed by mounted paint and DOM caret presentation.
 * @param options - Committed frame and current surface coordinate authorities.
 * @returns Presented caret in client CSS pixels, or null when no caret is available.
 */
export function readMountedCaretRect(options: CreateMountedPaginatedGeometryFacadeOptions): QuireMountedCaretRect | null {
  const caret = options.readRenderResult()?.selectionGeometry.carets[0];
  if (!caret) return null;
  // The frame already owns speculative IME positions and visual-instance choice.
  // Only project its rectangle; querying canonical PM selection would lose preedit.
  const surface = options.readSurface();
  const rect = resolveViewCoordinateAuthority(surface.clientRect, surface.surfaceBounds)
    .documentToClientRect(caret.rect).to;
  return { left: rect.x, right: rect.x + rect.width, top: rect.y, bottom: rect.y + rect.height };
}
