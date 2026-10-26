import type { EditorView } from "@quirekit/cm-view";
import type { NavigationRequest } from "./types";
import { sourceViewport } from "../../input/geometry";

/**
 * Reads the same clipping ancestors and host margins used by native caret scrolling.
 * @param view - Mounted native view, measured only inside requestMeasure's read phase.
 * @param request - Latest explicit source intent.
 * @returns Required viewport CSS-pixel adjustment, or null while the target is virtualized.
 */
export function navigationDelta(view: EditorView, request: NavigationRequest): number | null {
  const point = view.coordsAtPos(request.range.head);
  if (!point) return null;
  const viewport = sourceViewport(view), top = viewport.top + 5, bottom = viewport.bottom - 5;
  if (request.y === "start") return point.top - top;
  return point.top < top ? point.top - top : point.bottom > bottom ? point.bottom - bottom : 0;
}
