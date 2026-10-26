import type { QuireMountedTableChromeAnchor } from "@quirekit/core";
import type { EditorUITableAxis } from "../types";

/**
 * Paints all retained tracks without materializing a DOM control per track.
 * @param anchors - View-owned axis rectangles in scrolling workspace coordinates.
 * @param axis - Direction of the rail.
 * @param origin - Rail start in the same scrolling workspace coordinates.
 * @param stateAt - Semantic visual state supplied by the product.
 * @returns Hard-edged CSS gradient with separators at actual track boundaries.
 */
export function createEditorUITableRailBackground(
  anchors: readonly QuireMountedTableChromeAnchor[],
  axis: EditorUITableAxis,
  origin: number,
  stateAt: (index: number) => "idle" | "current" | "selected" | "hover"
): string {
  const stops: string[] = [];
  // Geometry is already projected by View. Only translate its origin here; never
  // divide the Table evenly or merge adjacent states across a real grid boundary.
  anchors.forEach((anchor, position) => {
    const index = axis === "row" ? anchor.rowIndex : anchor.columnIndex;
    if (index === undefined) return;
    const start = (axis === "row" ? anchor.rect.top : anchor.rect.left) - origin;
    const end = (axis === "row" ? anchor.rect.bottom : anchor.rect.right) - origin;
    const divider = position < anchors.length - 1 ? Math.max(start, end - 1) : end;
    const state = stateAt(index);
    stops.push(`var(--qk-table-rail-${state}) ${start}px ${divider}px`);
    if (divider < end) stops.push(`var(--qk-table-rail-separator) ${divider}px ${end}px`);
  });
  return stops.length === 0 ? "none"
    : `linear-gradient(to ${axis === "column" ? "right" : "bottom"}, ${stops.join(", ")})`;
}
