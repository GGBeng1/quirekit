import type { QuireRect, QuireViewTarget } from "@quirekit/renderer";
import { quireNeutralDocumentProfile } from "../../../../../document-profile/defaults";
import type { CreateWordNumberingMarkerProductsOptions } from "../types";

/**
 * Expands the marker glyph box through the suffix gap before editable text.
 *
 * @param markerRect - Local visual marker bounds.
 * @param bodyStartX - Local editable first-line origin.
 * @returns Comfortable control hit area that never overlaps editable text.
 */
export function createMarkerTargetRect(
  markerRect: QuireRect,
  bodyStartX: number
): QuireRect {
  const right = Math.max(markerRect.x + markerRect.width, bodyStartX);
  return {
    x: markerRect.x,
    y: markerRect.y,
    width: Math.max(18, right - markerRect.x),
    height: markerRect.height
  };
}

/**
 * Creates one semantic marker target with an immutable event payload.
 *
 * @param options - Marker identity and paragraph facts.
 * @param rect - Expanded marker hit rectangle.
 * @returns Renderer-neutral checkbox or list-marker button target.
 */
export function createMarkerTarget(
  options: CreateWordNumberingMarkerProductsOptions,
  rect: QuireRect
): QuireViewTarget {
  const { handler, payload, owner } = (options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel)
    .markerTarget(options.marker, options.range);
  return {
    id: `${options.id}:word-numbering-marker-target`,
    nodePath: `${options.id}.word-numbering-marker`,
    range: options.range,
    rect,
    role: options.marker.kind === "task" ? "checkbox" : "button",
    part: "word-numbering-marker",
    owner: { kind: "extension", ...owner },
    pointerEvents: "auto",
    cursor: "pointer",
    events: {
      click: { handler, payload },
      doubleClick: { handler, payload }
    }
  };
}
