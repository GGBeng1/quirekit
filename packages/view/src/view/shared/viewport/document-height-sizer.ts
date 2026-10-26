import type { ApplyDocumentHeightSizingOptions } from "./types";

/**
 * Sizes the in-flow View surface, page stack, and coordinate layers independently
 * of mounted frame count.
 *
 * Coordinate height is the document bottom (`documentRect.y + documentRect.height`),
 * which equals `documentRect.height` for the usual zero-origin document. Without
 * this, a virtualized page stack that mounts only a few frames would collapse the
 * scrollable area; sizing the host decouples scroll range from frame count.
 * Optional trailing padding extends only the scroll host, preserving coordinate scale.
 *
 * @param options - Sizing targets and the full document rectangle.
 */
export function applyDocumentHeightSizing(options: ApplyDocumentHeightSizingOptions): void {
  const { targets, documentRect } = options;
  const height = Math.max(0, Math.ceil(documentRect.y + documentRect.height));

  // Trailing workspace space extends scrolling, not the document-to-pointer scale.
  const bottomPadding = Math.max(0, options.bottomPadding ?? 0);
  const scrollHeight = `${height + bottomPadding}px`;
  targets.pageStackHost.style.height = scrollHeight;
  if (targets.scrollSurface) targets.scrollSurface.style.height = scrollHeight;

  for (const surface of [targets.coordinateSurface, targets.documentSurface]) {
    if (surface) surface.style.height = `${height}px`;
  }
}
