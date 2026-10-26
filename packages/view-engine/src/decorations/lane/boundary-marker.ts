import type { QuireRect } from "@quirekit/renderer";
import { resolveQuireDecorationWidgetRect } from "../geometry";
import type {
  QuireDecorationLaneOptions,
  QuireDecorationPointMarker,
  QuireDecorationPointVisual
} from "../types";

/**
 * Projects a non-interactive boundary widget into one paint-only point marker.
 *
 * Boundary markers sit on the caret stop of their position and span the line
 * height, so they never change layout or take pointer events.
 *
 * @param options - Lane options holding the accepted layout snapshot.
 * @param decorationId - Stable source decoration id.
 * @param position - Zero-width document position of the widget.
 * @param marker - Resolved marker style with a boundary shape.
 * @returns Paint visual in renderer coordinates.
 */
export function createQuireDecorationBoundaryMarker(
  options: QuireDecorationLaneOptions,
  decorationId: string,
  position: number,
  marker: QuireDecorationPointMarker
): QuireDecorationPointVisual {
  const caret = resolveQuireDecorationWidgetRect(options.snapshot, position);
  return {
    id: `${decorationId}:point-marker`,
    decorationId,
    range: { from: position, to: position },
    rect: resolveBoundaryRect(caret, marker),
    shape: marker.shape,
    color: marker.color,
    lineWidth: marker.lineWidth
  };
}

/**
 * Reports whether a widget style asks for a paint-only boundary marker.
 *
 * @param marker - Resolved point-marker style, when any.
 * @returns Whether the marker is a bracket or insertion bar.
 */
export function isQuireDecorationBoundaryMarker(
  marker: QuireDecorationPointMarker | undefined
): marker is QuireDecorationPointMarker {
  return marker?.shape === "open-bracket"
    || marker?.shape === "close-bracket"
    || marker?.shape === "insertion-bar";
}

/**
 * @param caret - Caret-stop rectangle with the line height.
 * @param marker - Boundary marker style; `size` is the bracket width.
 * @returns Marker rectangle: opening brackets extend right of the caret, closing ones left.
 */
function resolveBoundaryRect(caret: QuireRect, marker: QuireDecorationPointMarker): QuireRect {
  const width = Math.max(1, Math.min(marker.size, caret.height / 2));
  const x = marker.shape === "open-bracket"
    ? caret.x
    : marker.shape === "close-bracket"
      ? caret.x - width
      : caret.x - width / 2;
  return { x, y: caret.y, width, height: caret.height };
}
